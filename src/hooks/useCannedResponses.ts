import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { CannedResponse } from '../types/database';

export function useCannedResponses(userId: string | null) {
  const [responses, setResponses] = useState<CannedResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchResponses = useCallback(async () => {
    if (!userId) {
      setResponses([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('canned_responses')
      .select('*')
      .or(`is_global.eq.true,created_by.eq.${userId}`)
      .order('category')
      .order('title');

    if (error) {
      console.error('Error fetching canned responses:', error);
    } else {
      setResponses(data || []);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchResponses();
  }, [fetchResponses]);

  const createResponse = useCallback(
    async (response: {
      title: string;
      content: string;
      shortcut?: string;
      category?: string;
      is_global?: boolean;
    }) => {
      if (!userId) return { error: new Error('Not authenticated') };

      const { data, error } = await supabase
        .from('canned_responses')
        .insert({
          ...response,
          created_by: userId,
        })
        .select()
        .single();

      if (!error) {
        fetchResponses();
      }
      return { data, error };
    },
    [userId, fetchResponses]
  );

  const updateResponse = useCallback(
    async (id: string, updates: Partial<CannedResponse>) => {
      const { error } = await supabase
        .from('canned_responses')
        .update(updates)
        .eq('id', id);

      if (!error) {
        fetchResponses();
      }
      return { error };
    },
    [fetchResponses]
  );

  const deleteResponse = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from('canned_responses')
        .delete()
        .eq('id', id);

      if (!error) {
        fetchResponses();
      }
      return { error };
    },
    [fetchResponses]
  );

  const searchResponses = useCallback(
    (query: string) => {
      if (!query.trim()) return responses;
      const lowerQuery = query.toLowerCase();
      return responses.filter(
        (r) =>
          r.title.toLowerCase().includes(lowerQuery) ||
          r.content.toLowerCase().includes(lowerQuery) ||
          r.shortcut?.toLowerCase().includes(lowerQuery) ||
          r.category?.toLowerCase().includes(lowerQuery)
      );
    },
    [responses]
  );

  const getByShortcut = useCallback(
    (shortcut: string) => {
      return responses.find((r) => r.shortcut?.toLowerCase() === shortcut.toLowerCase());
    },
    [responses]
  );

  return {
    responses,
    loading,
    createResponse,
    updateResponse,
    deleteResponse,
    searchResponses,
    getByShortcut,
    refetch: fetchResponses,
  };
}
