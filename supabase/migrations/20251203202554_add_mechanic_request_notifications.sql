/*
  # Add Mechanic Request Notifications

  1. Changes
    - Create trigger to automatically notify when mechanic requests are created
    - Insert notification records when new mechanic requests are submitted
    - Technicians can view these notifications in the notifications screen

  2. Implementation
    - Create function to insert notification on mechanic request creation
    - Create trigger to call the function automatically
*/

CREATE OR REPLACE FUNCTION notify_mechanic_request()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO service_notifications (
    tractor_id,
    notification_type,
    triggered_at_hours,
    message,
    is_read
  )
  VALUES (
    NEW.tractor_id,
    'mechanic_request',
    0,
    'New mechanic request from ' || NEW.operator_name || ': ' || 
    SUBSTRING(NEW.problem_description, 1, 100) || 
    CASE 
      WHEN LENGTH(NEW.problem_description) > 100 THEN '...'
      ELSE ''
    END,
    false
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_mechanic_request_created ON mechanic_requests;

CREATE TRIGGER on_mechanic_request_created
  AFTER INSERT ON mechanic_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_mechanic_request();

COMMENT ON FUNCTION notify_mechanic_request() IS 'Automatically creates a notification when a new mechanic request is submitted';
