import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface TypingUser {
  id: string;
  name: string;
  timestamp: number;
}

export function useTypingIndicator(conversationId: string | null, currentUserId: string | null, currentUserName: string) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase.channel(`typing:${conversationId}`, {
      config: { presence: { key: currentUserId || 'anonymous' } },
    });

    channel
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { userId, userName, isTyping } = payload.payload;
        if (userId === currentUserId) return;

        setTypingUsers((prev) => {
          if (isTyping) {
            const existing = prev.find((u) => u.id === userId);
            if (existing) {
              return prev.map((u) =>
                u.id === userId ? { ...u, timestamp: Date.now() } : u
              );
            }
            return [...prev, { id: userId, name: userName, timestamp: Date.now() }];
          } else {
            return prev.filter((u) => u.id !== userId);
          }
        });
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [conversationId, currentUserId]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUsers((prev) => prev.filter((u) => now - u.timestamp < 3000));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const startTyping = useCallback(() => {
    if (!channelRef.current || !currentUserId) return;

    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: currentUserId, userName: currentUserName, isTyping: true },
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 2000);
  }, [currentUserId, currentUserName]);

  const stopTyping = useCallback(() => {
    if (!channelRef.current || !currentUserId) return;

    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: currentUserId, userName: currentUserName, isTyping: false },
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [currentUserId, currentUserName]);

  return { typingUsers, startTyping, stopTyping };
}
