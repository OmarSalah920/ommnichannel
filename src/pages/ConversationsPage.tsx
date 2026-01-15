import { useState, useRef, useEffect } from 'react';
import { Header } from '../components/layout/Header';
import { MessageBubble } from '../components/chat/MessageBubble';
import { MessageInput } from '../components/chat/MessageInput';
import { TypingIndicator } from '../components/chat/TypingIndicator';
import { CustomerInfoPanel } from '../components/chat/CustomerInfoPanel';
import { ConversationActions } from '../components/chat/ConversationActions';
import { useRealtimeMessages } from '../hooks/useRealtimeMessages';
import { useRealtimeConversations, ConversationWithDetails } from '../hooks/useRealtimeConversations';
import { useTypingIndicator } from '../hooks/useTypingIndicator';
import { useCannedResponses } from '../hooks/useCannedResponses';
import { useAuth } from '../contexts/AuthContext';
import {
  MoreVertical,
  Phone,
  Video,
  Info,
  ChevronLeft,
  Search,
  MessageSquare,
  Filter,
} from 'lucide-react';

export function ConversationsPage() {
  const { profile } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithDetails | null>(null);
  const [showCustomerInfo, setShowCustomerInfo] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>(['open', 'pending']);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    conversations,
    loading: conversationsLoading,
    assignConversation,
    updateStatus,
    updatePriority,
  } = useRealtimeConversations(profile?.id || null, { status: statusFilter });

  const {
    messages,
    loading: messagesLoading,
    sendMessage,
  } = useRealtimeMessages(selectedConversation?.id || null);

  const { typingUsers, startTyping, stopTyping } = useTypingIndicator(
    selectedConversation?.id || null,
    profile?.id || null,
    profile?.full_name || 'Agent'
  );

  const { responses: cannedResponses } = useCannedResponses(profile?.id || null);

  useEffect(() => {
    if (conversations.length > 0 && !selectedConversation) {
      setSelectedConversation(conversations[0]);
    }
  }, [conversations]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (content: string) => {
    if (!profile) return;
    stopTyping();
    await sendMessage(content, profile.id);
  };

  const handleAssign = async (agentId: string | null) => {
    if (!selectedConversation) return;
    await assignConversation(selectedConversation.id, agentId);
  };

  const handleUpdateStatus = async (status: ConversationWithDetails['status']) => {
    if (!selectedConversation) return;
    await updateStatus(selectedConversation.id, status);
  };

  const handleUpdatePriority = async (priority: ConversationWithDetails['priority']) => {
    if (!selectedConversation) return;
    await updatePriority(selectedConversation.id, priority);
  };

  const getTimeAgo = (date: string | null) => {
    if (!date) return '';
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return new Date(date).toLocaleDateString();
  };

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      conv.customer?.display_name?.toLowerCase().includes(query) ||
      conv.subject?.toLowerCase().includes(query)
    );
  });

  const statusOptions = [
    { value: ['open', 'pending'], label: 'Active' },
    { value: ['open'], label: 'Open' },
    { value: ['pending'], label: 'Pending' },
    { value: ['resolved'], label: 'Resolved' },
    { value: ['closed'], label: 'Closed' },
  ];

  return (
    <>
      <Header title="Conversations" subtitle="Manage your active conversations" />

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
          <div className="p-4 border-b border-slate-200 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div className="flex gap-1 overflow-x-auto">
              {statusOptions.map((option) => (
                <button
                  key={option.label}
                  onClick={() => setStatusFilter(option.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                    JSON.stringify(statusFilter) === JSON.stringify(option.value)
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversationsLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-4 text-center text-slate-500 text-sm">
                No conversations found
              </div>
            ) : (
              filteredConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation)}
                  className={`w-full p-4 text-left hover:bg-slate-50 transition-colors border-b border-slate-100 ${
                    selectedConversation?.id === conversation.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white font-medium">
                        {conversation.customer?.display_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      {conversation.status === 'open' && (
                        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-medium text-slate-900 truncate">
                          {conversation.customer?.display_name || 'Unknown'}
                        </span>
                        <span className="text-xs text-slate-500">
                          {getTimeAgo(conversation.last_message_at)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 truncate">
                        {conversation.subject || 'No subject'}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span
                          className={`px-1.5 py-0.5 rounded text-xs ${
                            conversation.status === 'open'
                              ? 'bg-emerald-100 text-emerald-700'
                              : conversation.status === 'pending'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {conversation.status}
                        </span>
                        <span className="text-xs text-slate-400">
                          {conversation.channel?.type}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-slate-50">
          {selectedConversation ? (
            <>
              <div className="bg-white border-b border-slate-200 px-6 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button className="lg:hidden p-2 hover:bg-slate-100 rounded-lg">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white font-medium">
                      {selectedConversation.customer?.display_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {selectedConversation.customer?.display_name || 'Unknown Customer'}
                      </h3>
                      <p className="text-sm text-slate-500">
                        via {selectedConversation.channel?.name || 'Unknown'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ConversationActions
                      conversation={selectedConversation}
                      onAssign={handleAssign}
                      onUpdateStatus={handleUpdateStatus}
                      onUpdatePriority={handleUpdatePriority}
                    />
                    <div className="w-px h-6 bg-slate-200 mx-1" />
                    <button
                      onClick={() => setShowCustomerInfo(!showCustomerInfo)}
                      className={`p-2 rounded-lg transition-colors ${
                        showCustomerInfo
                          ? 'text-blue-600 bg-blue-50'
                          : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Info className="w-5 h-5" />
                    </button>
                    <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 flex flex-col">
                  <div className="flex-1 overflow-y-auto p-6">
                    {messagesLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-slate-500">
                        <div className="text-center">
                          <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                          <p className="font-medium">No messages yet</p>
                          <p className="text-sm">Start the conversation by sending a message</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {messages.map((message) => (
                          <MessageBubble
                            key={message.id}
                            message={message}
                            isOwnMessage={message.sender_type === 'agent'}
                            senderName={
                              message.sender_type === 'bot' ? 'Bot' : undefined
                            }
                          />
                        ))}
                        <TypingIndicator users={typingUsers} />
                        <div ref={messagesEndRef} />
                      </>
                    )}
                  </div>

                  <MessageInput
                    onSend={handleSendMessage}
                    onTyping={startTyping}
                    cannedResponses={cannedResponses}
                  />
                </div>

                {showCustomerInfo && (
                  <CustomerInfoPanel
                    customer={selectedConversation.customer || null}
                    conversation={selectedConversation}
                    channel={selectedConversation.channel || null}
                    onClose={() => setShowCustomerInfo(false)}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              <div className="text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-8 h-8 text-slate-400" />
                </div>
                <p className="font-medium">Select a conversation</p>
                <p className="text-sm">Choose a conversation from the list to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
