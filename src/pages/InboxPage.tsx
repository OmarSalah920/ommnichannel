import { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from '../components/layout/Header';
import { MessageBubble } from '../components/chat/MessageBubble';
import { MessageInput } from '../components/chat/MessageInput';
import { CustomerInfoPanel } from '../components/chat/CustomerInfoPanel';
import { ConversationActions } from '../components/chat/ConversationActions';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useRealtimeMessages } from '../hooks/useRealtimeMessages';
import { useMessageStatus } from '../hooks/useMessageStatus';
import type { Conversation, Message } from '../types/database';
import {
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  Filter,
  Search,
  Phone,
  Instagram,
  MessageCircle,
  X,
  User,
  MoreHorizontal,
  Menu,
} from 'lucide-react';

interface ConversationWithDetails extends Conversation {
  channels?: { id: string; type: string; name: string };
  customers?: { id: string; name: string | null; external_id: string; avatar_url: string | null; metadata: Record<string, unknown> };
}

const channelIcons: Record<string, React.ReactNode> = {
  whatsapp: <Phone className="w-3.5 h-3.5" />,
  messenger: <MessageCircle className="w-3.5 h-3.5" />,
  instagram: <Instagram className="w-3.5 h-3.5" />,
};

const channelColors: Record<string, string> = {
  whatsapp: 'bg-emerald-500 text-white',
  messenger: 'bg-blue-500 text-white',
  instagram: 'bg-gradient-to-br from-purple-500 to-pink-500 text-white',
};

export function InboxPage() {
  const { profile } = useAuth();
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithDetails | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'pending' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showCustomerPanel, setShowCustomerPanel] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const { messages: realtimeMessages, loading: messagesLoading } = useRealtimeMessages(selectedConversation?.id || null);

  const handleStatusUpdate = useCallback((messageId: string, status: string, metadata?: Record<string, unknown>) => {
    console.log('[Inbox] Updating message status:', messageId, status);
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, status: status as Message['status'], metadata: { ...m.metadata, ...metadata } }
          : m
      )
    );
  }, []);

  useMessageStatus({
    conversationId: selectedConversation?.id || null,
    onStatusUpdate: handleStatusUpdate,
  });

  useEffect(() => {
    setMessages((prev) => {
      const optimisticMessages = prev.filter((m) => m.id.startsWith('temp-'));
      const realMessageIds = new Set(realtimeMessages.map((m) => m.id));
      const uniqueOptimistic = optimisticMessages.filter(
        (m) => !realMessageIds.has(m.id)
      );
      return [...realtimeMessages, ...uniqueOptimistic];
    });
  }, [realtimeMessages]);

  useEffect(() => {
    fetchConversations();
  }, [filter]);

  useEffect(() => {
    console.log('[Inbox] Setting up realtime subscriptions');

    const conversationsChannel = supabase
      .channel('inbox-conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        (payload) => {
          console.log('[Inbox] Conversation changed:', payload.eventType);
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          console.log('[Inbox] New message inserted');
          fetchConversations();
        }
      )
      .subscribe((status, err) => {
        console.log('[Inbox] Conversations channel status:', status);
        if (err) {
          console.error('[Inbox] Conversations channel error:', err);
        }
      });

    return () => {
      console.log('[Inbox] Cleaning up conversations subscription');
      supabase.removeChannel(conversationsChannel);
    };
  }, []);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchConversations = async () => {
    setLoading(true);
    let query = supabase
      .from('conversations')
      .select(`
        *,
        channels(*),
        customers(*)
      `)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching conversations:', error);
    } else {
      setConversations(data || []);
    }
    setLoading(false);
  };

  const getTimeAgo = (date: string | null) => {
    if (!date) return '';
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      conv.customers?.name?.toLowerCase().includes(search) ||
      conv.subject?.toLowerCase().includes(search)
    );
  });

  const stats = {
    all: conversations.length,
    open: conversations.filter((c) => c.status === 'open').length,
    pending: conversations.filter((c) => c.status === 'pending').length,
    resolved: conversations.filter((c) => c.status === 'resolved').length,
  };

  const filterTabs = [
    { key: 'all' as const, label: 'All', count: stats.all, icon: MessageSquare },
    { key: 'open' as const, label: 'Open', count: stats.open, icon: Clock },
    { key: 'pending' as const, label: 'Pending', count: stats.pending, icon: AlertCircle },
    { key: 'resolved' as const, label: 'Resolved', count: stats.resolved, icon: CheckCircle },
  ];

  const [sendError, setSendError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const handleSendMessage = async (content: string) => {
    if (!selectedConversation || !profile) return;

    setSendError(null);
    setIsSending(true);

    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: selectedConversation.id,
      sender_type: 'agent',
      sender_id: profile.id,
      content,
      content_type: 'text',
      is_internal: false,
      created_at: new Date().toISOString(),
      status: 'sending',
      metadata: {},
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setSendError('Not authenticated');
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
      setIsSending(false);
      return;
    }

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-message`;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation_id: selectedConversation.id,
          content,
          message_type: 'text',
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error('Error sending message:', result);
        setSendError(result.error || 'Failed to send message');
        setMessages((prev) =>
          prev.map((m) =>
            m.id === optimisticMessage.id
              ? { ...m, status: 'failed', metadata: { ...m.metadata, error: result.error } }
              : m
          )
        );
      } else {
        setMessages((prev) =>
          prev.filter((m) => m.id !== optimisticMessage.id)
        );
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setSendError(String(error));
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimisticMessage.id
            ? { ...m, status: 'failed', metadata: { ...m.metadata, error: String(error) } }
            : m
        )
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleSelectConversation = (conversation: ConversationWithDetails) => {
    setSelectedConversation(conversation);
  };

  return (
    <>
      <Header
        title="Inbox"
        subtitle={`${stats.open} open conversations`}
      />

      <div className="flex-1 flex overflow-hidden">
        <div className="flex w-64 md:w-72 lg:w-80 xl:w-96 border-r border-gray-100 dark:border-gray-800 bg-white dark:bg-surface-dark-secondary flex-col flex-shrink-0">

          <div className="p-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-9 pr-9 py-2 bg-surface-secondary dark:bg-surface-dark-tertiary border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-text-primary dark:text-text-dark-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-maqsam-coral/30 focus:border-maqsam-coral transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 p-2 border-b border-gray-100 dark:border-gray-800 overflow-x-auto scrollbar-thin flex-shrink-0">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  filter === tab.key
                    ? 'bg-maqsam-coral/10 text-maqsam-coral'
                    : 'text-text-secondary dark:text-text-dark-secondary hover:bg-surface-tertiary dark:hover:bg-surface-dark-tertiary'
                }`}
              >
                {tab.label}
                <span
                  className={`min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full text-xs ${
                    filter === tab.key
                      ? 'bg-maqsam-coral text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-text-secondary dark:text-text-dark-secondary'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-1.5 rounded-lg transition-colors ${
                showFilters
                  ? 'bg-maqsam-coral/10 text-maqsam-coral'
                  : 'text-text-tertiary hover:bg-surface-tertiary dark:hover:bg-surface-dark-tertiary'
              }`}
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-6 h-6 border-2 border-gray-200 border-t-maqsam-coral rounded-full animate-spin" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-text-tertiary p-6">
                <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
                <p className="font-medium text-text-secondary dark:text-text-dark-secondary">No conversations</p>
                <p className="text-sm text-center mt-1">Messages will appear here</p>
              </div>
            ) : (
              <div>
                {filteredConversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => handleSelectConversation(conversation)}
                    className={`w-full p-3 flex gap-3 text-left transition-colors border-b border-gray-50 dark:border-gray-800 ${
                      selectedConversation?.id === conversation.id
                        ? 'bg-maqsam-coral/5 dark:bg-maqsam-coral/10'
                        : 'hover:bg-surface-secondary dark:hover:bg-surface-dark-tertiary'
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-maqsam-dark to-gray-600 flex items-center justify-center text-white font-semibold text-sm">
                        {conversation.customers?.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center ${
                          channelColors[conversation.channels?.type || ''] || 'bg-gray-400 text-white'
                        }`}
                      >
                        {channelIcons[conversation.channels?.type || '']}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h3 className="font-semibold text-text-primary dark:text-text-dark-primary text-sm truncate">
                          {conversation.customers?.name || 'Unknown'}
                        </h3>
                        <span className="text-xs text-text-tertiary flex-shrink-0 ml-2">
                          {getTimeAgo(conversation.last_message_at)}
                        </span>
                      </div>
                      <p className="text-sm text-text-secondary dark:text-text-dark-secondary truncate">
                        {conversation.subject || 'No subject'}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${
                            conversation.status === 'open'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : conversation.status === 'pending'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                          }`}
                        >
                          {conversation.status}
                        </span>
                        {conversation.priority === 'urgent' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            Urgent
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {selectedConversation ? (
          <div className="flex flex-1 flex-col bg-surface-secondary dark:bg-surface-dark overflow-hidden min-w-0">
            <div className="h-16 px-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-surface-dark-secondary flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-maqsam-dark to-gray-600 flex items-center justify-center text-white font-semibold text-sm">
                    {selectedConversation.customers?.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center ${
                      channelColors[selectedConversation.channels?.type || ''] || 'bg-gray-400 text-white'
                    }`}
                  >
                    {channelIcons[selectedConversation.channels?.type || '']}
                  </span>
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-text-primary dark:text-text-dark-primary truncate">
                    {selectedConversation.customers?.name || 'Unknown'}
                  </h3>
                  <p className="text-xs text-text-tertiary truncate">
                    via {selectedConversation.channels?.name || 'Unknown Channel'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <ConversationActions
                  conversation={selectedConversation}
                  onUpdate={fetchConversations}
                />
                <button
                  onClick={() => setShowCustomerPanel(!showCustomerPanel)}
                  className={`flex p-2 rounded-lg transition-colors ${
                    showCustomerPanel
                      ? 'bg-maqsam-coral/10 text-maqsam-coral'
                      : 'text-text-secondary hover:bg-surface-tertiary dark:hover:bg-surface-dark-tertiary'
                  }`}
                >
                  <User className="w-5 h-5" />
                </button>
                <button className="p-2 text-text-secondary hover:bg-surface-tertiary dark:hover:bg-surface-dark-tertiary rounded-lg transition-colors">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 scrollbar-thin"
              style={{ maxHeight: 'calc(100vh - 16rem)' }}
            >
              {messagesLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="w-6 h-6 border-2 border-gray-200 border-t-maqsam-coral rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-text-tertiary">
                  <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
                  <p className="font-medium">No messages yet</p>
                  <p className="text-sm mt-1">Start the conversation</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {sendError && (
              <div className="mx-4 mb-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 flex-shrink-0">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-600 dark:text-red-400">{sendError}</p>
                <button
                  onClick={() => setSendError(null)}
                  className="ml-auto text-red-400 hover:text-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="flex-shrink-0">
              <MessageInput onSend={handleSendMessage} conversationId={selectedConversation.id} />
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center bg-surface-secondary dark:bg-surface-dark min-w-0">
            <div className="text-center p-6">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-surface-tertiary dark:bg-surface-dark-tertiary flex items-center justify-center">
                <MessageSquare className="w-10 h-10 text-text-tertiary" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary dark:text-text-dark-primary mb-1">
                Select a conversation
              </h3>
              <p className="text-text-secondary dark:text-text-dark-secondary">
                Choose a conversation from the list to start chatting
              </p>
            </div>
          </div>
        )}

        {showCustomerPanel && selectedConversation && (
          <div className="flex-shrink-0">
            <CustomerInfoPanel
              customer={selectedConversation.customers}
              conversation={selectedConversation}
              onClose={() => setShowCustomerPanel(false)}
            />
          </div>
        )}
      </div>
    </>
  );
}
