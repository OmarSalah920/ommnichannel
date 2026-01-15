/*
  # Enable Realtime on Conversations Table
  
  1. Changes
    - Enable realtime replication for the conversations table
    - This allows frontend clients to receive instant updates when conversations change
  
  2. Why This is Needed
    - Conversation list should update in real-time when new conversations arrive
    - Conversation metadata (status, last_message_at) should update instantly
    - The useRealtimeConversations hook listens for these changes
*/

-- Enable realtime for the conversations table
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
