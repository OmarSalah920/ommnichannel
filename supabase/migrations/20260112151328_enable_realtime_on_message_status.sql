/*
  # Enable Realtime for message_status Table

  1. Purpose
    - Enable realtime subscriptions on message_status table
    - Allow clients to receive live updates when message delivery status changes

  2. Changes
    - Enable replica identity on message_status table
    - Enable realtime publication for message_status table

  3. Benefits
    - Real-time delivery status updates in the UI
    - Instant feedback when messages are sent, delivered, or read
*/

ALTER TABLE message_status REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE message_status;
