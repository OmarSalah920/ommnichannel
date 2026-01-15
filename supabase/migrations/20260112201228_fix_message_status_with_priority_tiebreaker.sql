/*
  # Fix Message Status Update with Priority Tiebreaker
  
  1. Problem
    - When webhooks arrive with identical timestamps (same second), the trigger updates to whichever arrived last
    - Example: Both "sent" and "delivered" webhooks have timestamp 2026-01-12 20:06:44
    - If "sent" webhook arrives after "delivered", it incorrectly updates status to "sent"
  
  2. Solution
    - Use timestamp as primary sort (most recent event wins)
    - When timestamps are equal, use status priority as tiebreaker
    - Priority: read > delivered > sent > enqueued
    - Only update if new status has later timestamp OR (same timestamp AND higher priority)
  
  3. Changes
    - Add status priority function
    - Update trigger to compare both timestamp and priority
    - Only allow updates that have either newer timestamp OR same timestamp with higher priority
*/

-- Function to get status priority (higher number = higher priority)
CREATE OR REPLACE FUNCTION get_status_priority(status_value TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN CASE status_value
    WHEN 'read' THEN 4
    WHEN 'delivered' THEN 3
    WHEN 'sent' THEN 2
    WHEN 'enqueued' THEN 1
    ELSE 0
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Updated function to update message metadata with latest status by timestamp and priority
CREATE OR REPLACE FUNCTION update_message_status()
RETURNS TRIGGER AS $$
DECLARE
  latest_status RECORD;
  new_priority INTEGER;
  latest_priority INTEGER;
BEGIN
  -- Only update if we have a valid message_id
  IF NEW.message_id IS NOT NULL THEN
    -- Get the current latest status by timestamp and priority for this message
    SELECT status, status_timestamp INTO latest_status
    FROM message_status
    WHERE message_id = NEW.message_id
    ORDER BY status_timestamp DESC, get_status_priority(status) DESC, created_at DESC
    LIMIT 1;
    
    -- Calculate priorities
    new_priority := get_status_priority(NEW.status);
    
    -- If no previous status exists, update
    IF latest_status IS NULL THEN
      UPDATE messages
      SET metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{status}',
        to_jsonb(NEW.status)
      )
      WHERE id = NEW.message_id;
      
      RAISE LOG 'Updated message % status to % (timestamp: %, priority: %)', 
        NEW.message_id, NEW.status, NEW.status_timestamp, new_priority;
      
      RETURN NEW;
    END IF;
    
    latest_priority := get_status_priority(latest_status.status);
    
    -- Update if: new timestamp is later OR (same timestamp AND higher priority)
    IF NEW.status_timestamp > latest_status.status_timestamp THEN
      -- Newer timestamp always wins
      UPDATE messages
      SET metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{status}',
        to_jsonb(NEW.status)
      )
      WHERE id = NEW.message_id;
      
      RAISE LOG 'Updated message % status to % (newer timestamp: % > %)', 
        NEW.message_id, NEW.status, NEW.status_timestamp, latest_status.status_timestamp;
        
    ELSIF NEW.status_timestamp = latest_status.status_timestamp AND new_priority > latest_priority THEN
      -- Same timestamp but higher priority
      UPDATE messages
      SET metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{status}',
        to_jsonb(NEW.status)
      )
      WHERE id = NEW.message_id;
      
      RAISE LOG 'Updated message % status to % (same timestamp but higher priority: % > %)', 
        NEW.message_id, NEW.status, new_priority, latest_priority;
        
    ELSE
      -- Don't update: either older timestamp or same timestamp with lower/equal priority
      RAISE LOG 'Skipped status update for message % - new status % (timestamp: %, priority: %) not better than latest status % (timestamp: %, priority: %)',
        NEW.message_id, NEW.status, NEW.status_timestamp, new_priority,
        latest_status.status, latest_status.status_timestamp, latest_priority;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;