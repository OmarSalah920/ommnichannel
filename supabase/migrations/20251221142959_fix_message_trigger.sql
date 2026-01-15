/*
  # Fix Message Trigger

  ## Changes
  - Update the `update_conversation_last_message` trigger function to remove the `last_message_preview` column reference since it doesn't exist in the conversations table
  
  This was causing all message inserts to fail silently.
*/

CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;
