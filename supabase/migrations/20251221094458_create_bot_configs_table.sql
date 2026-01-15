/*
  # Create bot_configs table

  1. New Tables
    - `bot_configs`
      - `id` (uuid, primary key) - Unique identifier for the bot
      - `name` (text) - Display name for the bot
      - `channel_id` (uuid, nullable) - Optional link to specific channel, null means all channels
      - `is_active` (boolean) - Whether the bot is currently active
      - `welcome_message` (text) - Message sent when conversation starts
      - `fallback_message` (text) - Message sent when no auto-response matches
      - `response_delay_ms` (integer) - Delay before sending response in milliseconds
      - `auto_responses` (jsonb) - Array of trigger/response pairs
      - `created_at` (timestamptz) - When the bot was created

  2. Security
    - Enable RLS on `bot_configs` table
    - Add policy for admin users to manage bot configurations
*/

CREATE TABLE IF NOT EXISTS bot_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  channel_id uuid REFERENCES channels(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT false,
  welcome_message text DEFAULT '',
  fallback_message text DEFAULT '',
  response_delay_ms integer DEFAULT 1000,
  auto_responses jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bot_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage bot configs"
  ON bot_configs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can view active bot configs"
  ON bot_configs
  FOR SELECT
  TO authenticated
  USING (is_active = true);
