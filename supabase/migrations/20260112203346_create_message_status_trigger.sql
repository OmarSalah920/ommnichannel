/*
  # Create Message Status Update Trigger
  
  1. Problem
    - The update_message_status() function exists but no trigger is attached
    - Status updates from message_status table aren't updating the messages table
    
  2. Solution
    - Create trigger on message_status table AFTER INSERT
    - This will automatically update messages.status when new status records are inserted
*/

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS message_status_update_trigger ON message_status;

-- Create the trigger
CREATE TRIGGER message_status_update_trigger
  AFTER INSERT ON message_status
  FOR EACH ROW
  EXECUTE FUNCTION update_message_status();
