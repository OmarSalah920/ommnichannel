export type UserRole = 'admin' | 'agent' | 'supervisor';
export type UserStatus = 'online' | 'offline' | 'busy' | 'away';
export type ConversationStatus = 'open' | 'pending' | 'resolved' | 'closed';
export type ConversationPriority = 'low' | 'medium' | 'high' | 'urgent';
export type MessageSenderType = 'customer' | 'agent' | 'bot' | 'system';
export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'template' | 'interactive';
export type MessageStatus = 'sending' | 'enqueued' | 'sent' | 'delivered' | 'read' | 'failed';
export type ChannelType = 'whatsapp' | 'messenger' | 'instagram';

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: UserRole;
          status: UserStatus;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string;
          role?: UserRole;
          status?: UserStatus;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: UserRole;
          status?: UserStatus;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      teams: {
        Row: {
          id: string;
          name: string;
          description: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          created_by?: string | null;
          created_at?: string;
        };
      };
      team_members: {
        Row: {
          team_id: string;
          user_id: string;
          joined_at: string;
        };
        Insert: {
          team_id: string;
          user_id: string;
          joined_at?: string;
        };
        Update: {
          team_id?: string;
          user_id?: string;
          joined_at?: string;
        };
      };
      channels: {
        Row: {
          id: string;
          type: ChannelType;
          name: string;
          is_active: boolean;
          config: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          type: ChannelType;
          name: string;
          is_active?: boolean;
          config?: Record<string, unknown>;
          created_at?: string;
        };
        Update: {
          id?: string;
          type?: ChannelType;
          name?: string;
          is_active?: boolean;
          config?: Record<string, unknown>;
          created_at?: string;
        };
      };
      customer_contacts: {
        Row: {
          id: string;
          channel_id: string;
          external_id: string;
          display_name: string;
          avatar_url: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          channel_id: string;
          external_id: string;
          display_name?: string;
          avatar_url?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          channel_id?: string;
          external_id?: string;
          display_name?: string;
          avatar_url?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          channel_id: string;
          customer_id: string;
          assigned_agent_id: string | null;
          assigned_team_id: string | null;
          status: ConversationStatus;
          priority: ConversationPriority;
          subject: string;
          tags: string[];
          last_message_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          channel_id: string;
          customer_id: string;
          assigned_agent_id?: string | null;
          assigned_team_id?: string | null;
          status?: ConversationStatus;
          priority?: ConversationPriority;
          subject?: string;
          tags?: string[];
          last_message_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          channel_id?: string;
          customer_id?: string;
          assigned_agent_id?: string | null;
          assigned_team_id?: string | null;
          status?: ConversationStatus;
          priority?: ConversationPriority;
          subject?: string;
          tags?: string[];
          last_message_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_type: MessageSenderType;
          sender_id: string | null;
          content: string;
          content_type: 'text' | 'image' | 'video' | 'document' | 'audio';
          status: MessageStatus;
          external_message_id: string | null;
          metadata: Record<string, unknown>;
          is_internal: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_type: MessageSenderType;
          sender_id?: string | null;
          content?: string;
          content_type?: 'text' | 'image' | 'video' | 'document' | 'audio';
          status?: MessageStatus;
          external_message_id?: string | null;
          metadata?: Record<string, unknown>;
          is_internal?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_type?: MessageSenderType;
          sender_id?: string | null;
          content?: string;
          content_type?: 'text' | 'image' | 'video' | 'document' | 'audio';
          status?: MessageStatus;
          external_message_id?: string | null;
          metadata?: Record<string, unknown>;
          is_internal?: boolean;
          created_at?: string;
        };
      };
      canned_responses: {
        Row: {
          id: string;
          title: string;
          content: string;
          shortcut: string | null;
          category: string;
          created_by: string | null;
          is_global: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          content: string;
          shortcut?: string | null;
          category?: string;
          created_by?: string | null;
          is_global?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          content?: string;
          shortcut?: string | null;
          category?: string;
          created_by?: string | null;
          is_global?: boolean;
          created_at?: string;
        };
      };
      conversation_notes: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          user_id: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          user_id?: string;
          content?: string;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
export type Team = Database['public']['Tables']['teams']['Row'];
export type TeamMember = Database['public']['Tables']['team_members']['Row'];
export type Channel = Database['public']['Tables']['channels']['Row'];
export type CustomerContact = Database['public']['Tables']['customer_contacts']['Row'];
export type Conversation = Database['public']['Tables']['conversations']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];
export type CannedResponse = Database['public']['Tables']['canned_responses']['Row'];
export type ConversationNote = Database['public']['Tables']['conversation_notes']['Row'];
