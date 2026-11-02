/*
  # Add Technician Rating System and Service Types

  1. User Table Updates
    - Add `rating` field (average service quality rating, 0-10)
    - Add `service_types` field (array of services technician can perform)
    - Add `badge_level` field (rating classification: elite, pro, standard, needs_improvement)
    - Add `total_ratings` field (count of ratings received)
    
  2. Service Logs Updates
    - Add `rating` field (operator's rating of service, 1-10)
    - Add `next_maintenance_hour` field (when next service is due)
    - Add `service_duration_minutes` field (how long service took)
    
  3. Service Intervals Table
    - Create table to store standard maintenance intervals
    - Includes service type, interval hours, description
    
  4. Security
    - Enable RLS on new tables
    - Update policies for new fields
*/

-- Add new fields to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'rating'
  ) THEN
    ALTER TABLE users ADD COLUMN rating numeric(3,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'service_types'
  ) THEN
    ALTER TABLE users ADD COLUMN service_types text[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'badge_level'
  ) THEN
    ALTER TABLE users ADD COLUMN badge_level text DEFAULT 'standard';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'total_ratings'
  ) THEN
    ALTER TABLE users ADD COLUMN total_ratings integer DEFAULT 0;
  END IF;
END $$;

-- Add new fields to service_logs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_logs' AND column_name = 'rating'
  ) THEN
    ALTER TABLE service_logs ADD COLUMN rating integer CHECK (rating >= 1 AND rating <= 10);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_logs' AND column_name = 'next_maintenance_hour'
  ) THEN
    ALTER TABLE service_logs ADD COLUMN next_maintenance_hour integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_logs' AND column_name = 'service_duration_minutes'
  ) THEN
    ALTER TABLE service_logs ADD COLUMN service_duration_minutes integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_logs' AND column_name = 'technician_id'
  ) THEN
    ALTER TABLE service_logs ADD COLUMN technician_id uuid REFERENCES users(id);
  END IF;
END $$;

-- Create service intervals table
CREATE TABLE IF NOT EXISTS service_intervals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name text NOT NULL,
  interval_hours integer NOT NULL,
  description text,
  service_category text DEFAULT 'routine',
  parts_needed text[],
  estimated_duration_minutes integer DEFAULT 60,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE service_intervals ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read service intervals
CREATE POLICY "Authenticated users can read service intervals"
  ON service_intervals
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can manage service intervals
CREATE POLICY "Admins can manage service intervals"
  ON service_intervals
  FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Insert standard Claas Arion 630 service intervals
INSERT INTO service_intervals (service_name, interval_hours, description, service_category, parts_needed, estimated_duration_minutes)
VALUES
  ('Initial Service', 50, 'Engine oil, filters, and general inspection', 'critical', ARRAY['Engine oil', 'Oil filter', 'Air filter'], 120),
  ('Initial Service', 100, 'Engine oil, filters, and general inspection', 'critical', ARRAY['Engine oil', 'Oil filter', 'Air filter'], 120),
  ('Engine Oil Service', 250, 'Engine oil and oil filter replacement', 'routine', ARRAY['Engine oil', 'Oil filter'], 60),
  ('Air Filter Service', 500, 'Fuel filter, air filter, hydraulic/transmission inspection', 'routine', ARRAY['Fuel filter', 'Air filter'], 90),
  ('Transmission Oil Service', 1000, 'Hexashift transmission oil change', 'major', ARRAY['Transmission oil', 'Transmission filter'], 180),
  ('Full Service', 1500, 'Comprehensive service including cabin filters, cooling system, CMATIC diagnostics', 'major', ARRAY['Cabin filter', 'Coolant', 'Various filters'], 240),
  ('Full Service', 2000, 'Comprehensive service including cabin filters, cooling system, CMATIC diagnostics', 'major', ARRAY['Cabin filter', 'Coolant', 'Various filters'], 240)
ON CONFLICT DO NOTHING;

-- Create function to update technician rating
CREATE OR REPLACE FUNCTION update_technician_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if rating is provided
  IF NEW.rating IS NOT NULL AND NEW.technician_id IS NOT NULL THEN
    -- Update technician's average rating and total count
    UPDATE users
    SET 
      total_ratings = total_ratings + 1,
      rating = (
        SELECT AVG(rating)::numeric(3,2)
        FROM service_logs
        WHERE technician_id = NEW.technician_id AND rating IS NOT NULL
      ),
      badge_level = CASE
        WHEN (SELECT AVG(rating) FROM service_logs WHERE technician_id = NEW.technician_id AND rating IS NOT NULL) >= 9 THEN 'elite'
        WHEN (SELECT AVG(rating) FROM service_logs WHERE technician_id = NEW.technician_id AND rating IS NOT NULL) >= 7 THEN 'pro'
        WHEN (SELECT AVG(rating) FROM service_logs WHERE technician_id = NEW.technician_id AND rating IS NOT NULL) >= 5 THEN 'standard'
        ELSE 'needs_improvement'
      END
    WHERE id = NEW.technician_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-update ratings
DROP TRIGGER IF EXISTS update_technician_rating_trigger ON service_logs;
CREATE TRIGGER update_technician_rating_trigger
  AFTER INSERT OR UPDATE OF rating
  ON service_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_technician_rating();

-- Initialize default service types for existing technicians
UPDATE users
SET service_types = ARRAY[
  'Engine oil service',
  'Air filter service',
  'Transmission oil',
  'Fuel filter',
  'Hydraulic system check',
  'Cooling system',
  'General inspection',
  'Electrical system',
  'Brake system'
]
WHERE role = 'technician' AND (service_types IS NULL OR service_types = '{}');
