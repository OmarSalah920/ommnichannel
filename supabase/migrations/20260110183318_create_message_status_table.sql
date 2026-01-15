/*
  # Create Message Status Tracking Table

  1. Purpose
    - Track delivery status of outbound messages (enqueued, sent, delivered, failed, read)
    - Link status updates to original messages via external_message_id

  2. New Tables
    - `message_status`
      - `id` (uuid, primary key)
      - `message_id` (uuid, references messages table)
      - `external_message_id` (text, Gupshup message ID)
      - `status` (text, values: enqueued, sent, delivered, failed, read)
      - `destination` (text, recipient phone number)
      - `error_code` (text, nullable, error code if failed)
      - `error_reason` (text, nullable, error reason if failed)
      - `metadata` (jsonb, additional status information)
      - `status_timestamp` (timestamptz, when status was received from provider)
      - `created_at` (timestamptz)

  3. Indexes
    - Index on external_message_id for fast lookups
    - Index on message_id for linking to messages
    - Index on status for filtering
    - Index on created_at for sorting

  4. Security
    - Enable RLS
    - Allow authenticated users to read all status records
    - Only allow service role to insert/update status records
*/

CREATE TABLE IF NOT EXISTS message_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE,
  external_message_id text NOT NULL,
  status text NOT NULL,
  destination text NOT NULL,
  error_code text,
  error_reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  status_timestamp timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_status_external_id ON message_status(external_message_id);
CREATE INDEX IF NOT EXISTS idx_message_status_message_id ON message_status(message_id);
CREATE INDEX IF NOT EXISTS idx_message_status_status ON message_status(status);
CREATE INDEX IF NOT EXISTS idx_message_status_created_at ON message_status(created_at DESC);

ALTER TABLE message_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read message status"
  ON message_status
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can insert message status"
  ON message_status
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update message status"
  ON message_status
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);