/*
  # Fix Message Status Trigger Logic
  
  1. Problem
    - Trigger queries message_status table for latest status
    - Since it's AFTER INSERT, the NEW row is already in the table
    - Query includes the row that triggered it, comparing against itself
    - Never updates the messages table
    
  2. Solution
    - Get current status from messages table, not message_status table
    - Compare NEW status against current message.status
    - Update if NEW is better (newer timestamp or higher priority)
*/

CREATE OR REPLACE FUNCTION update_message_status()
RETURNS TRIGGER AS $$
DECLARE
  target_message_id UUID;
  current_message_status TEXT;
  current_message_external_id TEXT;
  new_priority INTEGER;
  current_priority INTEGER;
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
  
  -- Get current status from the messages table
  SELECT status::text, external_message_id INTO current_message_status, current_message_external_id
  FROM messages
  WHERE id = target_message_id;
  
  -- Calculate priorities
  new_priority := get_status_priority(NEW.status);
  current_priority := get_status_priority(current_message_status);
  
  -- Always update if new priority is higher (status progression)
  -- This ensures: sending -> enqueued -> sent -> delivered -> read
  IF new_priority > current_priority THEN
    UPDATE messages
    SET status = NEW.status::message_status_enum,
        external_message_id = COALESCE(external_message_id, NEW.external_message_id)
    WHERE id = target_message_id;
    
    RAISE LOG 'Updated message % from % (priority: %) to % (priority: %)', 
      target_message_id, current_message_status, current_priority, NEW.status, new_priority;
  ELSE
    RAISE LOG 'Skipped status update for message % - current status % (priority: %) >= new status % (priority: %)',
      target_message_id, current_message_status, current_priority, NEW.status, new_priority;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
