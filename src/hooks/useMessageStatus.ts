import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Message } from '../types/database';

interface MessageStatus {
  id: string;
  message_id: string;
  external_message_id: string;
  status: string;
  destination: string;
  error_code?: string;
  error_reason?: string;
  metadata: Record<string, unknown>;
  status_timestamp: string;
  created_at: string;
}

interface UseMessageStatusProps {
  conversationId: string | null;
  onStatusUpdate: (messageId: string, status: string, metadata?: Record<string, unknown>) => void;
}

export function useMessageStatus({ conversationId, onStatusUpdate }: UseMessageStatusProps) {
  useEffect(() => {
    if (!conversationId) return;

    console.log('[MessageStatus] Setting up subscription for conversation:', conversationId);

    const channel = supabase
      .channel(`message-status:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_status',
        },
        async (payload) => {
          console.log('[MessageStatus] Received status update:', payload);
          const statusUpdate = payload.new as MessageStatus;

          if (statusUpdate.message_id) {
            const statusMetadata = {
              status: statusUpdate.status,
              external_id: statusUpdate.external_message_id,
              error_code: statusUpdate.error_code,
              error_reason: statusUpdate.error_reason,
              status_timestamp: statusUpdate.status_timestamp,
            };

            onStatusUpdate(statusUpdate.message_id, statusUpdate.status, statusMetadata);
          }
        }
      )
      .subscribe((status, err) => {
        console.log('[MessageStatus] Subscription status:', status);
        if (err) {
          console.error('[MessageStatus] Subscription error:', err);
        }
      });

    return () => {
      console.log('[MessageStatus] Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, [conversationId, onStatusUpdate]);
}
