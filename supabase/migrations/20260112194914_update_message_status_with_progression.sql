/*
  # Update Message Status Trigger with Progression Validation
  
  1. Purpose
    - Prevent status regression (e.g., "sent" overwriting "delivered")
    - Handle duplicate webhooks correctly
    - Ensure status only progresses forward: enqueued → sent → delivered → read
  
  2. Changes
    - Update the update_message_status() function to include progression validation
    - Status progression order: enqueued (0) → sent (1) → delivered (2) → read (3)
    - Failed status can occur at any point and will always update
  
  3. Benefits
    - More accurate status representation
    - Handles duplicate webhooks gracefully
    - Prevents incorrect status downgrades
*/

-- Function to get status priority level
CREATE OR REPLACE FUNCTION get_status_priority(status_value TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN CASE status_value
    WHEN 'failed' THEN 99
    WHEN 'enqueued' THEN 0
    WHEN 'sent' THEN 1
    WHEN 'delivered' THEN 2
    WHEN 'read' THEN 3
    ELSE 0
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update message metadata with latest status (with progression validation)
CREATE OR REPLACE FUNCTION update_message_status()
RETURNS TRIGGER AS $$
DECLARE
  current_status TEXT;
  current_priority INTEGER;
  new_priority INTEGER;
BEGIN
  -- Only update if we have a valid message_id
  IF NEW.message_id IS NOT NULL THEN
    -- Get current status from message
    SELECT metadata->>'status' INTO current_status
    FROM messages
    WHERE id = NEW.message_id;
    
    -- Calculate priorities
    current_priority := get_status_priority(COALESCE(current_status, ''));
    new_priority := get_status_priority(NEW.status);
    
    -- Only update if:
    -- 1. No current status exists (current_status IS NULL)
    -- 2. New status is "failed" (always update to failed)
    -- 3. New status has higher priority than current status
    IF current_status IS NULL OR 
       NEW.status = 'failed' OR 
       new_priority > current_priority THEN
      
      UPDATE messages
      SET metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{status}',
        to_jsonb(NEW.status)
      )
      WHERE id = NEW.message_id;
      
      RAISE LOG 'Updated message % status from % to % (priority: % -> %)', 
        NEW.message_id, current_status, NEW.status, current_priority, new_priority;
    ELSE
      RAISE LOG 'Skipped status update for message % - new status % (priority %) is not higher than current status % (priority %)',
        NEW.message_id, NEW.status, new_priority, current_status, current_priority;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger is already created in previous migration, just replace the function
