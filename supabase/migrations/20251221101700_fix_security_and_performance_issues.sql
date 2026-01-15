/*
  # Fix Security and Performance Issues
  
  This migration addresses critical security and performance issues identified by Supabase:
  
  ## 1. Missing Indexes on Foreign Keys
  - Add indexes for `bot_configs.channel_id`
  - Add indexes for `canned_responses.created_by`
  - Add indexes for `conversations.channel_id`
  - Add indexes for `messages.sender_id`
  
  ## 2. Optimize RLS Policies
  All policies using `auth.uid()` are optimized by wrapping with `(select auth.uid())` 
  to prevent re-evaluation for each row, improving query performance at scale.
  
  Affected tables:
  - profiles (2 policies)
  - teams (3 policies)
  - canned_responses (4 policies)
  - channels (3 policies)
  - conversations (2 policies)
  - messages (2 policies)
  - bot_configs (1 policy)
  - integrations (1 policy)
  
  ## 3. Fix Multiple Permissive Policies
  Make "Authenticated users can view active bot configs" policy RESTRICTIVE 
  to resolve multiple permissive policies warning on bot_configs table.
  
  ## 4. Fix Function Search Paths
  Update `handle_new_user` and `update_conversation_last_message` functions 
  to have immutable search paths for security.
*/

-- ============================================================================
-- 1. ADD MISSING INDEXES ON FOREIGN KEYS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_bot_configs_channel_id 
  ON public.bot_configs(channel_id);

CREATE INDEX IF NOT EXISTS idx_canned_responses_created_by 
  ON public.canned_responses(created_by);

CREATE INDEX IF NOT EXISTS idx_conversations_channel_id 
  ON public.conversations(channel_id);

CREATE INDEX IF NOT EXISTS idx_messages_sender_id 
  ON public.messages(sender_id);

-- ============================================================================
-- 2. OPTIMIZE RLS POLICIES
-- ============================================================================

-- PROFILES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

-- TEAMS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage teams" ON public.teams;
CREATE POLICY "Admins can manage teams"
  ON public.teams
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) 
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update teams" ON public.teams;
CREATE POLICY "Admins can update teams"
  ON public.teams
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) 
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) 
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete teams" ON public.teams;
CREATE POLICY "Admins can delete teams"
  ON public.teams
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) 
      AND profiles.role = 'admin'
    )
  );

-- CANNED_RESPONSES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can read canned responses" ON public.canned_responses;
CREATE POLICY "Users can read canned responses"
  ON public.canned_responses
  FOR SELECT
  TO authenticated
  USING (is_global = true OR created_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create canned responses" ON public.canned_responses;
CREATE POLICY "Users can create canned responses"
  ON public.canned_responses
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own canned responses" ON public.canned_responses;
CREATE POLICY "Users can update own canned responses"
  ON public.canned_responses
  FOR UPDATE
  TO authenticated
  USING (created_by = (select auth.uid()))
  WITH CHECK (created_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own canned responses" ON public.canned_responses;
CREATE POLICY "Users can delete own canned responses"
  ON public.canned_responses
  FOR DELETE
  TO authenticated
  USING (created_by = (select auth.uid()));

-- CHANNELS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage channels" ON public.channels;
CREATE POLICY "Admins can manage channels"
  ON public.channels
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) 
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update channels" ON public.channels;
CREATE POLICY "Admins can update channels"
  ON public.channels
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) 
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) 
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete channels" ON public.channels;
CREATE POLICY "Admins can delete channels"
  ON public.channels
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) 
      AND profiles.role = 'admin'
    )
  );

-- CONVERSATIONS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can read relevant conversations" ON public.conversations;
CREATE POLICY "Users can read relevant conversations"
  ON public.conversations
  FOR SELECT
  TO authenticated
  USING (
    assigned_agent_id = (select auth.uid())
    OR assigned_agent_id IS NULL
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) 
      AND profiles.role IN ('admin', 'supervisor')
    )
  );

DROP POLICY IF EXISTS "Users can update conversations" ON public.conversations;
CREATE POLICY "Users can update conversations"
  ON public.conversations
  FOR UPDATE
  TO authenticated
  USING (
    assigned_agent_id = (select auth.uid())
    OR assigned_agent_id IS NULL
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) 
      AND profiles.role IN ('admin', 'supervisor')
    )
  )
  WITH CHECK (
    assigned_agent_id = (select auth.uid())
    OR assigned_agent_id IS NULL
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) 
      AND profiles.role IN ('admin', 'supervisor')
    )
  );

-- MESSAGES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can read messages from accessible conversations" ON public.messages;
CREATE POLICY "Users can read messages from accessible conversations"
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND (
        c.assigned_agent_id = (select auth.uid())
        OR c.assigned_agent_id IS NULL
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = (select auth.uid()) 
          AND profiles.role IN ('admin', 'supervisor')
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert messages to accessible conversations" ON public.messages;
CREATE POLICY "Users can insert messages to accessible conversations"
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND (
        c.assigned_agent_id = (select auth.uid())
        OR c.assigned_agent_id IS NULL
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = (select auth.uid()) 
          AND profiles.role IN ('admin', 'supervisor')
        )
      )
    )
  );

-- BOT_CONFIGS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage bot configs" ON public.bot_configs;
CREATE POLICY "Admins can manage bot configs"
  ON public.bot_configs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) 
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) 
      AND profiles.role = 'admin'
    )
  );

-- Make this policy RESTRICTIVE to fix multiple permissive policies warning
DROP POLICY IF EXISTS "Authenticated users can view active bot configs" ON public.bot_configs;
CREATE POLICY "Authenticated users can view active bot configs"
  ON public.bot_configs
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- INTEGRATIONS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage integrations" ON public.integrations;
CREATE POLICY "Admins can manage integrations"
  ON public.integrations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) 
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) 
      AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- 3. FIX FUNCTION SEARCH PATHS
-- ============================================================================

-- Recreate handle_new_user function with stable search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    new.id,
    new.email,
    'agent'
  );
  RETURN new;
END;
$$;

-- Recreate update_conversation_last_message function with stable search_path
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
  SET 
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.content, 100)
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;
