import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Message } from '../types/database';
import type { RealtimeChannel } from '@supabase/supabase-js';

export function useRealtimeMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
    } else {
      setMessages(data || []);
    }
    setLoading(false);
  }, [conversationId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (!conversationId) return;

    console.log('[Realtime] Setting up subscription for conversation:', conversationId);

    const channel: RealtimeChannel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log('[Realtime] Received INSERT event:', payload);
          const newMessage = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) {
              console.log('[Realtime] Message already exists, skipping');
              return prev;
            }
            console.log('[Realtime] Adding new message to state');
            return [...prev, newMessage];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log('[Realtime] Received UPDATE event:', payload);
          const updatedMessage = payload.new as Message;
          setMessages((prev) =>
            prev.map((m) => (m.id === updatedMessage.id ? updatedMessage : m))
          );
        }
      )
      .subscribe((status, err) => {
        console.log('[Realtime] Subscription status:', status);
        if (err) {
          console.error('[Realtime] Subscription error:', err);
        }
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Successfully subscribed to messages channel');
        }
      });

    return () => {
      console.log('[Realtime] Cleaning up subscription for conversation:', conversationId);
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const sendMessage = useCallback(
    async (content: string, senderId: string, messageType: Message['message_type'] = 'text') => {
      if (!conversationId || !content.trim()) return { error: new Error('Invalid input') };

      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_type: 'agent',
          sender_id: senderId,
          content: content.trim(),
          message_type: messageType,
          status: 'sent',
        })
        .select()
        .single();

      return { data, error };
    },
    [conversationId]
  );

  return { messages, loading, sendMessage, refetch: fetchMessages };
}
