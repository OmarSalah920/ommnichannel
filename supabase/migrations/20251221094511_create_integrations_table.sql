/*
  # Create integrations table

  1. New Tables
    - `integrations`
      - `id` (uuid, primary key) - Unique identifier for the integration
      - `name` (text) - Display name for the integration
      - `type` (text) - Type of integration (webhook, api, crm, helpdesk)
      - `is_active` (boolean) - Whether the integration is currently active
      - `config` (jsonb) - Configuration including URL, API key, events, headers
      - `last_sync` (timestamptz, nullable) - When the integration last synced
      - `created_at` (timestamptz) - When the integration was created

  2. Security
    - Enable RLS on `integrations` table
    - Add policy for admin users to manage integrations
*/

CREATE TABLE IF NOT EXISTS integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'webhook',
  is_active boolean NOT NULL DEFAULT false,
  config jsonb DEFAULT '{}'::jsonb,
  last_sync timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage integrations"
  ON integrations
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
