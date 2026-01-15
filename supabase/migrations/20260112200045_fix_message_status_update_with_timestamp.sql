/*
  # Fix Message Status Update Trigger with Timestamp Priority
  
  1. Problem
    - Webhooks can arrive out of order (sent webhook arrives after delivered webhook)
    - Current trigger only checks priority, not actual event timestamp
    - This causes incorrect status display when webhooks are delayed or out of sequence
  
  2. Solution
    - Always use the status with the LATEST status_timestamp (actual event time)
    - When a new status arrives, check if it's the latest by comparing timestamps
    - Only update message if new status has timestamp >= current latest timestamp
  
  3. Changes
    - Update trigger to query for latest status by status_timestamp before updating
    - Compare new status timestamp with current latest timestamp
    - Only update if new timestamp is equal or newer
*/

-- Drop the old priority function as we don't need it anymore
DROP FUNCTION IF EXISTS get_status_priority(TEXT);

-- Updated function to update message metadata with latest status by timestamp
CREATE OR REPLACE FUNCTION update_message_status()
RETURNS TRIGGER AS $$
DECLARE
  latest_status RECORD;
BEGIN
  -- Only update if we have a valid message_id
  IF NEW.message_id IS NOT NULL THEN
    -- Get the current latest status by timestamp for this message
    SELECT status, status_timestamp INTO latest_status
    FROM message_status
    WHERE message_id = NEW.message_id
    ORDER BY status_timestamp DESC, created_at DESC
    LIMIT 1;
    
    -- If no previous status exists, or new status has a later or equal timestamp, update
    IF latest_status IS NULL OR 
       NEW.status_timestamp >= latest_status.status_timestamp THEN
      
      UPDATE messages
      SET metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{status}',
        to_jsonb(NEW.status)
      )
      WHERE id = NEW.message_id;
      
      RAISE LOG 'Updated message % status to % (timestamp: %)', 
        NEW.message_id, NEW.status, NEW.status_timestamp;
    ELSE
      RAISE LOG 'Skipped status update for message % - new status % (timestamp: %) is older than latest status % (timestamp: %)',
        NEW.message_id, NEW.status, NEW.status_timestamp, 
        latest_status.status, latest_status.status_timestamp;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger already exists from previous migration, function is now updated
