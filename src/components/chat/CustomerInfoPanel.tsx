import { useState, useEffect } from 'react';
import {
  X,
  User,
  MessageCircle,
  Calendar,
  Edit2,
  Save,
  Clock,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  History,
} from 'lucide-react';
import type { Conversation } from '../../types/database';
import { supabase } from '../../lib/supabase';

interface Customer {
  id: string;
  name: string | null;
  external_id: string;
  avatar_url: string | null;
  metadata: Record<string, unknown>;
}

interface CustomerInfoPanelProps {
  customer: Customer | undefined;
  conversation: Conversation | null;
  onClose: () => void;
}

export function CustomerInfoPanel({
  customer,
  conversation,
  onClose,
}: CustomerInfoPanelProps) {
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [conversationHistory, setConversationHistory] = useState<Conversation[]>([]);

  useEffect(() => {
    if (customer) {
      fetchConversationHistory();
    }
  }, [customer?.id]);

  const fetchConversationHistory = async () => {
    if (!customer) return;

    const { data } = await supabase
      .from('conversations')
      .select('*')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .limit(5);

    setConversationHistory(data || []);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'pending':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'resolved':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  if (!customer) return null;

  return (
    <div className="w-64 md:w-72 lg:w-80 bg-white dark:bg-surface-dark-secondary border-l border-gray-100 dark:border-gray-800 flex flex-col animate-slide-in-right">
      <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <h3 className="font-semibold text-text-primary dark:text-text-dark-primary">Customer Info</h3>
        <button
          onClick={onClose}
          className="p-1.5 text-text-tertiary hover:text-text-primary dark:hover:text-text-dark-primary hover:bg-surface-tertiary dark:hover:bg-surface-dark-tertiary rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-maqsam-dark to-gray-600 flex items-center justify-center text-white font-semibold text-xl">
              {customer.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div>
              <h4 className="font-semibold text-text-primary dark:text-text-dark-primary text-lg">
                {customer.name || 'Unknown'}
              </h4>
              <p className="text-sm text-text-secondary dark:text-text-dark-secondary">Customer</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-lg bg-surface-tertiary dark:bg-surface-dark-tertiary flex items-center justify-center">
                <User className="w-4 h-4 text-text-tertiary" />
              </div>
              <div>
                <p className="text-text-tertiary text-xs">External ID</p>
                <p className="text-text-primary dark:text-text-dark-primary font-medium">{customer.external_id}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-lg bg-surface-tertiary dark:bg-surface-dark-tertiary flex items-center justify-center">
                <Calendar className="w-4 h-4 text-text-tertiary" />
              </div>
              <div>
                <p className="text-text-tertiary text-xs">Customer Since</p>
                <p className="text-text-primary dark:text-text-dark-primary font-medium">
                  {conversationHistory.length > 0 ? formatDate(conversationHistory[conversationHistory.length - 1].created_at) : 'Today'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-lg bg-surface-tertiary dark:bg-surface-dark-tertiary flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-text-tertiary" />
              </div>
              <div>
                <p className="text-text-tertiary text-xs">Total Conversations</p>
                <p className="text-text-primary dark:text-text-dark-primary font-medium">{conversationHistory.length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <h5 className="font-medium text-text-primary dark:text-text-dark-primary text-sm flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-text-tertiary" />
              Notes
            </h5>
            {editingNotes ? (
              <button
                onClick={() => setEditingNotes(false)}
                className="text-xs font-medium text-maqsam-coral hover:text-maqsam-coral-dark"
              >
                Save
              </button>
            ) : (
              <button
                onClick={() => setEditingNotes(true)}
                className="text-xs font-medium text-text-tertiary hover:text-text-primary"
              >
                Edit
              </button>
            )}
          </div>
          {editingNotes ? (
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this customer..."
              className="w-full p-3 bg-surface-secondary dark:bg-surface-dark-tertiary border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-text-primary dark:text-text-dark-primary placeholder:text-text-tertiary resize-none focus:outline-none focus:ring-2 focus:ring-maqsam-coral/30 focus:border-maqsam-coral"
              rows={3}
            />
          ) : (
            <p className="text-sm text-text-secondary dark:text-text-dark-secondary">
              {notes || 'No notes added yet.'}
            </p>
          )}
        </div>

        <div className="p-4">
          <h5 className="font-medium text-text-primary dark:text-text-dark-primary text-sm mb-3 flex items-center gap-2">
            <History className="w-4 h-4 text-text-tertiary" />
            Recent Conversations
          </h5>
          {conversationHistory.length === 0 ? (
            <div className="text-center py-6">
              <MessageCircle className="w-8 h-8 text-text-tertiary mx-auto mb-2 opacity-50" />
              <p className="text-sm text-text-tertiary">No previous conversations</p>
            </div>
          ) : (
            <div className="space-y-2">
              {conversationHistory.map((conv) => (
                <div
                  key={conv.id}
                  className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                    conv.id === conversation?.id
                      ? 'border-maqsam-coral/50 bg-maqsam-coral/5'
                      : 'border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${getStatusColor(
                        conv.status
                      )}`}
                    >
                      {conv.status}
                    </span>
                    <span className="text-[11px] text-text-tertiary">{formatDate(conv.created_at)}</span>
                  </div>
                  <p className="text-sm text-text-primary dark:text-text-dark-primary truncate">
                    {conv.subject || 'No subject'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {customer.metadata && Object.keys(customer.metadata).length > 0 && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-800">
            <h5 className="font-medium text-text-primary dark:text-text-dark-primary text-sm mb-3">
              Additional Details
            </h5>
            <div className="space-y-2">
              {Object.entries(customer.metadata).map(([key, value]) => (
                <div key={key} className="flex items-start gap-2 text-sm">
                  <span className="text-text-tertiary capitalize min-w-[80px]">{key.replace(/_/g, ' ')}</span>
                  <span className="text-text-primary dark:text-text-dark-primary font-medium">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
