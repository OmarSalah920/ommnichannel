import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Conversation, Channel, CustomerContact } from '../types/database';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface ConversationWithDetails extends Conversation {
  channel?: Channel;
  customer?: CustomerContact;
}

export function useRealtimeConversations(userId: string | null, filter?: {
  status?: string[];
  assignedToMe?: boolean;
}) {
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('conversations')
      .select(`
        *,
        channel:channels(*),
        customer:customer_contacts(*)
      `)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (filter?.status && filter.status.length > 0) {
      query = query.in('status', filter.status);
    }

    if (filter?.assignedToMe && userId) {
      query = query.eq('assigned_agent_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching conversations:', error);
    } else {
      setConversations(data || []);
    }
    setLoading(false);
  }, [userId, filter?.status, filter?.assignedToMe]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    console.log('[Realtime] Setting up conversations subscription');

    const channel: RealtimeChannel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        (payload) => {
          console.log('[Realtime] Conversation change:', payload.eventType, payload);
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
          console.log('[Realtime] New message inserted, refreshing conversations');
          fetchConversations();
        }
      )
      .subscribe((status, err) => {
        console.log('[Realtime] Conversations subscription status:', status);
        if (err) {
          console.error('[Realtime] Conversations subscription error:', err);
        }
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Successfully subscribed to conversations channel');
        }
      });

    return () => {
      console.log('[Realtime] Cleaning up conversations subscription');
      supabase.removeChannel(channel);
    };
  }, [fetchConversations]);

  const assignConversation = useCallback(
    async (conversationId: string, agentId: string | null) => {
      const { error } = await supabase
        .from('conversations')
        .update({ assigned_agent_id: agentId })
        .eq('id', conversationId);

      if (!error) {
        fetchConversations();
      }
      return { error };
    },
    [fetchConversations]
  );

  const updateStatus = useCallback(
    async (conversationId: string, status: Conversation['status']) => {
      const { error } = await supabase
        .from('conversations')
        .update({ status })
        .eq('id', conversationId);

      if (!error) {
        fetchConversations();
      }
      return { error };
    },
    [fetchConversations]
  );

  const updatePriority = useCallback(
    async (conversationId: string, priority: Conversation['priority']) => {
      const { error } = await supabase
        .from('conversations')
        .update({ priority })
        .eq('id', conversationId);

      if (!error) {
        fetchConversations();
      }
      return { error };
    },
    [fetchConversations]
  );

  return {
    conversations,
    loading,
    refetch: fetchConversations,
    assignConversation,
    updateStatus,
    updatePriority,
  };
}
