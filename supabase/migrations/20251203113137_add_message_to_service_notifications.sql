/*
  # Add message field to service_notifications table

  1. Changes
    - Add `message` column to `service_notifications` table to store detailed notification messages
    - Column is text type and nullable to support existing records

  2. Important Notes
    - Existing notifications without messages will have NULL values
    - New notifications should include descriptive messages for better user experience
*/

-- Add message column to service_notifications table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_notifications' AND column_name = 'message'
  ) THEN
    ALTER TABLE service_notifications ADD COLUMN message text;
  END IF;
END $$;
