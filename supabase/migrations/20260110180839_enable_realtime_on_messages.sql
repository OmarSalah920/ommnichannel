/*
  # Enable Realtime on Messages Table
  
  1. Changes
    - Enable realtime replication for the messages table
    - This allows frontend clients to receive instant updates when new messages arrive
  
  2. Why This is Needed
    - Without realtime enabled, clients must manually refresh to see new messages
    - Enabling realtime allows the useRealtimeMessages hook to receive INSERT/UPDATE events
    - This is critical for a chat application where messages should appear instantly
*/

-- Enable realtime for the messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
