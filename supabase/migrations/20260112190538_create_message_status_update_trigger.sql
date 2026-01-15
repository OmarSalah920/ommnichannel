/*
  # Create Message Status Update Trigger
  
  1. Purpose
    - Automatically update message.metadata.status when a new status is inserted into message_status
    - Ensures the UI always shows the latest message status without relying solely on frontend subscriptions
  
  2. Changes
    - Create a function to update message metadata when status changes
    - Create a trigger on message_status table to call this function on INSERT
  
  3. Benefits
    - More reliable status updates
    - Reduces dependency on real-time subscriptions
    - Messages will have correct status even when loaded from database queries
*/

-- Function to update message metadata with latest status
CREATE OR REPLACE FUNCTION update_message_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if we have a valid message_id
  IF NEW.message_id IS NOT NULL THEN
    UPDATE messages
    SET metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{status}',
      to_jsonb(NEW.status)
    )
    WHERE id = NEW.message_id;
    
    RAISE LOG 'Updated message % status to %', NEW.message_id, NEW.status;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update message status
DROP TRIGGER IF EXISTS trigger_update_message_status ON message_status;
CREATE TRIGGER trigger_update_message_status
  AFTER INSERT ON message_status
  FOR EACH ROW
  EXECUTE FUNCTION update_message_status();
