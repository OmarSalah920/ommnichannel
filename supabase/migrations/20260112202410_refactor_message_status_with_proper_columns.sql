/*
  # Complete Message Status Refactor
  
  1. Problem Analysis
    - Status stored in JSONB metadata makes queries slow and unreliable
    - No clear link between Gupshup message ID and WhatsApp message ID
    - Realtime updates on JSONB fields are inconsistent
    - Frontend has redundant status update logic creating race conditions
  
  2. Solution - Proper Database Design
    - Add status ENUM column for fast, indexed queries
    - Add external_message_id (WhatsApp ID) column for direct webhook matching
    - Keep metadata->external_id for Gupshup ID (sent from our system)
    - Update trigger to set status column, not metadata
    - Single source of truth for message status
  
  3. Status Flow (Based on Gupshup Documentation)
    - Local: sending (optimistic UI before API call)
    - Gupshup: enqueued → sent → delivered → read
    - Error states: failed
  
  4. Changes
    - Create message_status_enum type
    - Add status column to messages with default 'sending'
    - Add external_message_id column for WhatsApp message ID
    - Update trigger to set status column instead of metadata
    - Migrate existing data to new columns
    - Add index on external_message_id for fast webhook lookups
*/

-- Create status enum type
DO $$ BEGIN
  CREATE TYPE message_status_enum AS ENUM (
    'sending',
    'enqueued',
    'sent',
    'delivered',
    'read',
    'failed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add status column to messages table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'status'
  ) THEN
    ALTER TABLE messages ADD COLUMN status message_status_enum DEFAULT 'sending';
    
    -- Create index for status queries
    CREATE INDEX idx_messages_status ON messages(status) WHERE sender_type = 'agent';
  END IF;
END $$;

-- Add external_message_id column (WhatsApp message ID from webhooks)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'external_message_id'
  ) THEN
    ALTER TABLE messages ADD COLUMN external_message_id TEXT;
    
    -- Create index for fast webhook lookups
    CREATE INDEX idx_messages_external_message_id ON messages(external_message_id) WHERE external_message_id IS NOT NULL;
  END IF;
END $$;

-- Migrate existing status from metadata to status column
UPDATE messages
SET status = CASE 
  WHEN metadata->>'status' = 'sending' THEN 'sending'::message_status_enum
  WHEN metadata->>'status' = 'enqueued' THEN 'enqueued'::message_status_enum
  WHEN metadata->>'status' = 'sent' THEN 'sent'::message_status_enum
  WHEN metadata->>'status' = 'delivered' THEN 'delivered'::message_status_enum
  WHEN metadata->>'status' = 'read' THEN 'read'::message_status_enum
  WHEN metadata->>'status' = 'failed' THEN 'failed'::message_status_enum
  ELSE 'sending'::message_status_enum
END
WHERE sender_type = 'agent' AND status IS NULL;

-- Update the trigger to set status column instead of metadata
CREATE OR REPLACE FUNCTION update_message_status()
RETURNS TRIGGER AS $$
DECLARE
  latest_status RECORD;
  new_priority INTEGER;
  latest_priority INTEGER;
  target_message_id UUID;
BEGIN
  -- Find the message by either message_id or external_message_id
  IF NEW.message_id IS NOT NULL THEN
    target_message_id := NEW.message_id;
  ELSIF NEW.external_message_id IS NOT NULL THEN
    -- Try to find message by Gupshup ID in metadata
    SELECT id INTO target_message_id
    FROM messages
    WHERE metadata->>'external_id' = NEW.external_message_id
    LIMIT 1;
    
    -- Update the message_status record with the found message_id
    IF target_message_id IS NOT NULL THEN
      UPDATE message_status 
      SET message_id = target_message_id 
      WHERE id = NEW.id;
    END IF;
  END IF;
  
  IF target_message_id IS NULL THEN
    RAISE LOG 'No message found for status update: message_id=%, external_id=%', 
      NEW.message_id, NEW.external_message_id;
    RETURN NEW;
  END IF;
  
  -- Get the current latest status by timestamp and priority
  SELECT status, status_timestamp INTO latest_status
  FROM message_status
  WHERE message_id = target_message_id
  ORDER BY status_timestamp DESC, get_status_priority(status) DESC, created_at DESC
  LIMIT 1;
  
  -- Calculate priorities
  new_priority := get_status_priority(NEW.status);
  
  -- If no previous status exists, update
  IF latest_status IS NULL THEN
    UPDATE messages
    SET status = NEW.status::message_status_enum,
        external_message_id = COALESCE(external_message_id, NEW.external_message_id)
    WHERE id = target_message_id;
    
    RAISE LOG 'Updated message % status to % (first status, priority: %)', 
      target_message_id, NEW.status, new_priority;
    
    RETURN NEW;
  END IF;
  
  latest_priority := get_status_priority(latest_status.status);
  
  -- Update if: new timestamp is later OR (same timestamp AND higher priority)
  IF NEW.status_timestamp > latest_status.status_timestamp THEN
    UPDATE messages
    SET status = NEW.status::message_status_enum,
        external_message_id = COALESCE(external_message_id, NEW.external_message_id)
    WHERE id = target_message_id;
    
    RAISE LOG 'Updated message % status to % (newer timestamp: % > %)', 
      target_message_id, NEW.status, NEW.status_timestamp, latest_status.status_timestamp;
      
  ELSIF NEW.status_timestamp = latest_status.status_timestamp AND new_priority > latest_priority THEN
    UPDATE messages
    SET status = NEW.status::message_status_enum,
        external_message_id = COALESCE(external_message_id, NEW.external_message_id)
    WHERE id = target_message_id;
    
    RAISE LOG 'Updated message % status to % (same timestamp but higher priority: % > %)', 
      target_message_id, NEW.status, new_priority, latest_priority;
      
  ELSE
    RAISE LOG 'Skipped status update for message % - new status % (timestamp: %, priority: %) not better than latest % (timestamp: %, priority: %)',
      target_message_id, NEW.status, NEW.status_timestamp, new_priority,
      latest_status.status, latest_status.status_timestamp, latest_priority;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;