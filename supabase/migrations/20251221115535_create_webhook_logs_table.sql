/*
  # Create webhook logs table
  
  1. New Tables
    - `webhook_logs`
      - `id` (uuid, primary key)
      - `webhook_url` (text) - The webhook URL/path
      - `method` (text) - HTTP method (GET, POST)
      - `headers` (jsonb) - Request headers
      - `body` (jsonb) - Request body
      - `processed` (boolean) - Whether webhook was processed successfully
      - `error` (text) - Any error message
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on `webhook_logs` table
    - Add policy for authenticated users to read webhook logs
*/

CREATE TABLE IF NOT EXISTS webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_url text NOT NULL,
  method text NOT NULL,
  headers jsonb,
  body jsonb,
  processed boolean DEFAULT false,
  error text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read webhook logs"
  ON webhook_logs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at DESC);