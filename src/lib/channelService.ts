import { supabase } from './supabase';
import type { Channel, Message } from '../types/database';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface SendMessageResult {
  success: boolean;
  external_id?: string;
  error?: string;
}

export interface ChannelStatus {
  id: string;
  type: string;
  name: string;
  is_active: boolean;
  is_configured: boolean;
  last_error?: string;
}

export async function sendChannelMessage(
  conversationId: string,
  content: string,
  messageType: string = 'text',
  senderId: string
): Promise<SendMessageResult> {
  try {
    const { data: conversation } = await supabase
      .from('conversations')
      .select('*, channel:channels(*)')
      .eq('id', conversationId)
      .single();

    if (!conversation) {
      return { success: false, error: 'Conversation not found' };
    }

    const channel = conversation.channel as Channel;

    if (!channel?.is_active) {
      const { data: message } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_type: 'agent',
          sender_id: senderId,
          content,
          message_type: messageType,
          status: 'sent',
        })
        .select()
        .single();

      return { success: true, external_id: message?.id };
    }

    const { data: message } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_type: 'agent',
        sender_id: senderId,
        content,
        message_type: messageType,
        status: 'pending',
      })
      .select()
      .single();

    if (!message) {
      return { success: false, error: 'Failed to create message' };
    }

    const { data: { session } } = await supabase.auth.getSession();

    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        content,
        message_type: messageType,
      }),
    });

    const result = await response.json();

    if (result.success) {
      await supabase
        .from('messages')
        .update({
          status: 'sent',
          external_id: result.external_id,
        })
        .eq('id', message.id);

      return { success: true, external_id: result.external_id };
    } else {
      await supabase
        .from('messages')
        .update({ status: 'failed' })
        .eq('id', message.id);

      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('Error sending channel message:', error);
    return { success: false, error: String(error) };
  }
}

export async function getChannelStatus(): Promise<ChannelStatus[]> {
  const { data: channels } = await supabase
    .from('channels')
    .select('*')
    .order('name');

  if (!channels) return [];

  return channels.map((channel) => {
    const config = channel.configuration as Record<string, string>;
    let isConfigured = false;

    switch (channel.type) {
      case 'whatsapp':
        isConfigured = !!(config.phone_number_id && config.access_token);
        break;
      case 'messenger':
        isConfigured = !!(config.page_id && config.page_access_token);
        break;
      case 'instagram':
        isConfigured = !!(config.instagram_account_id && config.page_access_token);
        break;
    }

    return {
      id: channel.id,
      type: channel.type,
      name: channel.name,
      is_active: channel.is_active,
      is_configured: isConfigured,
    };
  });
}

export async function testChannelConnection(channelId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: channel } = await supabase
      .from('channels')
      .select('*')
      .eq('id', channelId)
      .single();

    if (!channel) {
      return { success: false, error: 'Channel not found' };
    }

    const config = channel.configuration as Record<string, string>;

    switch (channel.type) {
      case 'whatsapp': {
        if (!config.phone_number_id || !config.access_token) {
          return { success: false, error: 'Missing WhatsApp configuration' };
        }

        const response = await fetch(
          `https://graph.facebook.com/v18.0/${config.phone_number_id}`,
          {
            headers: {
              'Authorization': `Bearer ${config.access_token}`,
            },
          }
        );

        if (!response.ok) {
          const error = await response.json();
          return { success: false, error: error.error?.message || 'Invalid WhatsApp credentials' };
        }

        return { success: true };
      }

      case 'messenger': {
        if (!config.page_access_token) {
          return { success: false, error: 'Missing Messenger configuration' };
        }

        const response = await fetch(
          `https://graph.facebook.com/v18.0/me?access_token=${config.page_access_token}`
        );

        if (!response.ok) {
          const error = await response.json();
          return { success: false, error: error.error?.message || 'Invalid Messenger credentials' };
        }

        return { success: true };
      }

      case 'instagram': {
        if (!config.page_access_token) {
          return { success: false, error: 'Missing Instagram configuration' };
        }

        const response = await fetch(
          `https://graph.facebook.com/v18.0/me?access_token=${config.page_access_token}`
        );

        if (!response.ok) {
          const error = await response.json();
          return { success: false, error: error.error?.message || 'Invalid Instagram credentials' };
        }

        return { success: true };
      }

      default:
        return { success: false, error: 'Unknown channel type' };
    }
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export function getWebhookUrl(channelType: string): string {
  return `${SUPABASE_URL}/functions/v1/channel-webhook?channel=${channelType}`;
}

export function getChannelIcon(type: string): string {
  switch (type) {
    case 'whatsapp':
      return 'phone';
    case 'messenger':
      return 'message-circle';
    case 'instagram':
      return 'instagram';
    default:
      return 'message-square';
  }
}

export function getChannelColor(type: string): string {
  switch (type) {
    case 'whatsapp':
      return '#25D366';
    case 'messenger':
      return '#0084FF';
    case 'instagram':
      return '#E4405F';
    default:
      return '#6B7280';
  }
}

export function formatMessageForChannel(
  content: string,
  channelType: string,
  options?: {
    bold?: boolean;
    italic?: boolean;
    code?: boolean;
  }
): string {
  if (!options) return content;

  switch (channelType) {
    case 'whatsapp':
      let formatted = content;
      if (options.bold) formatted = `*${formatted}*`;
      if (options.italic) formatted = `_${formatted}_`;
      if (options.code) formatted = `\`\`\`${formatted}\`\`\``;
      return formatted;

    case 'messenger':
    case 'instagram':
      return content;

    default:
      return content;
  }
}
