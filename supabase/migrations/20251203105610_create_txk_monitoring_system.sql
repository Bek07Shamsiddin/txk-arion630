/*
  # TXK Tractor Monitoring Platform Database Schema

  ## Overview
  Complete database schema for a technical maintenance monitoring system for tractors,
  supporting real-time updates, file uploads, and maintenance tracking.

  ## New Tables Created

  ### 1. users
  Custom user profiles extending Supabase auth.users
  - `id` (uuid, FK to auth.users) - User identifier
  - `name` (text) - Full name
  - `phone` (text, unique) - Contact phone number
  - `role` (enum: operator/technician/admin) - User role
  - `profile_photo_url` (text) - Profile photo storage URL
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. tractors
  Tractor inventory and status tracking
  - `id` (uuid, PK) - Tractor identifier
  - `model` (text) - Tractor model name
  - `serial_number` (text, unique) - Manufacturer serial number
  - `registration_date` (date) - Initial registration date
  - `location` (text) - Current location
  - `current_moto_hours` (integer) - Current motor hours reading
  - `next_service_hours` (integer) - Next scheduled service at X hours
  - `status` (enum: active/maintenance/inactive) - Current operational status
  - `photo_url` (text) - Tractor photo storage URL
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 3. service_logs
  Maintenance service records
  - `id` (uuid, PK) - Service log identifier
  - `tractor_id` (uuid, FK) - Reference to tractors table
  - `service_type` (text) - Type of service performed
  - `moto_hour` (integer) - Motor hour reading at service time
  - `date` (date) - Service date
  - `used_parts` (jsonb) - Array of parts used with details
  - `technician_note` (text) - Technician comments
  - `uploaded_photos` (jsonb) - Array of photo/video URLs
  - `technician_id` (uuid, FK) - Reference to users table
  - `created_at` (timestamptz) - Record creation timestamp

  ### 4. moto_hours
  Motor hours tracking history
  - `id` (uuid, PK) - Record identifier
  - `tractor_id` (uuid, FK) - Reference to tractors table
  - `value` (integer) - Motor hour reading
  - `date` (date) - Reading date
  - `operator_note` (text) - Operator comments
  - `operator_id` (uuid, FK) - Reference to users table
  - `created_at` (timestamptz) - Record creation timestamp

  ### 5. parts_requests
  Spare parts request tracking
  - `id` (uuid, PK) - Request identifier
  - `tractor_id` (uuid, FK) - Reference to tractors table
  - `part_name` (text) - Name of requested part
  - `quantity` (integer) - Quantity requested
  - `urgency` (enum: low/medium/high/critical) - Priority level
  - `requester_id` (uuid, FK) - Reference to users table
  - `request_date` (date) - Date of request
  - `delivery_status` (enum: pending/ordered/delivered/cancelled) - Current status
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 6. technician_calls
  Service call requests from operators
  - `id` (uuid, PK) - Call identifier
  - `tractor_id` (uuid, FK) - Reference to tractors table
  - `operator_id` (uuid, FK) - Reference to users table
  - `date` (date) - Call date
  - `description` (text) - Issue description
  - `status` (enum: pending/assigned/in_progress/completed/cancelled) - Call status
  - `assigned_technician_id` (uuid, FK) - Assigned technician reference
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 7. service_notifications
  System notifications for service intervals
  - `id` (uuid, PK) - Notification identifier
  - `tractor_id` (uuid, FK) - Reference to tractors table
  - `notification_type` (text) - Service interval (50, 100, 250, 500, 1000)
  - `triggered_at_hours` (integer) - Motor hours when triggered
  - `is_read` (boolean) - Read status
  - `created_at` (timestamptz) - Notification timestamp

  ## Security
  - RLS enabled on all tables
  - Separate policies for operators, technicians, and admins
  - Authentication required for all operations
  - Role-based access control implemented

  ## Indexes
  - Foreign key indexes for performance
  - Unique constraints on serial numbers and phone numbers
  - Indexes on frequently queried fields (status, dates, tractor_id)
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('operator', 'technician', 'admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE tractor_status AS ENUM ('active', 'maintenance', 'inactive');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE urgency_level AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE delivery_status AS ENUM ('pending', 'ordered', 'delivered', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE call_status AS ENUM ('pending', 'assigned', 'in_progress', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'operator',
  profile_photo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create tractors table
CREATE TABLE IF NOT EXISTS tractors (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  model text NOT NULL,
  serial_number text UNIQUE NOT NULL,
  registration_date date NOT NULL,
  location text NOT NULL,
  current_moto_hours integer NOT NULL DEFAULT 0,
  next_service_hours integer NOT NULL DEFAULT 50,
  status tractor_status NOT NULL DEFAULT 'active',
  photo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create service_logs table
CREATE TABLE IF NOT EXISTS service_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tractor_id uuid NOT NULL REFERENCES tractors(id) ON DELETE CASCADE,
  service_type text NOT NULL,
  moto_hour integer NOT NULL,
  date date NOT NULL,
  used_parts jsonb DEFAULT '[]'::jsonb,
  technician_note text,
  uploaded_photos jsonb DEFAULT '[]'::jsonb,
  technician_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create moto_hours table
CREATE TABLE IF NOT EXISTS moto_hours (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tractor_id uuid NOT NULL REFERENCES tractors(id) ON DELETE CASCADE,
  value integer NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  operator_note text,
  operator_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create parts_requests table
CREATE TABLE IF NOT EXISTS parts_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tractor_id uuid NOT NULL REFERENCES tractors(id) ON DELETE CASCADE,
  part_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  urgency urgency_level NOT NULL DEFAULT 'medium',
  requester_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_date date NOT NULL DEFAULT CURRENT_DATE,
  delivery_status delivery_status NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create technician_calls table
CREATE TABLE IF NOT EXISTS technician_calls (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tractor_id uuid NOT NULL REFERENCES tractors(id) ON DELETE CASCADE,
  operator_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  description text NOT NULL,
  status call_status NOT NULL DEFAULT 'pending',
  assigned_technician_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create service_notifications table
CREATE TABLE IF NOT EXISTS service_notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tractor_id uuid NOT NULL REFERENCES tractors(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  triggered_at_hours integer NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_tractors_status ON tractors(status);
CREATE INDEX IF NOT EXISTS idx_tractors_serial ON tractors(serial_number);
CREATE INDEX IF NOT EXISTS idx_service_logs_tractor ON service_logs(tractor_id);
CREATE INDEX IF NOT EXISTS idx_service_logs_date ON service_logs(date);
CREATE INDEX IF NOT EXISTS idx_moto_hours_tractor ON moto_hours(tractor_id);
CREATE INDEX IF NOT EXISTS idx_moto_hours_date ON moto_hours(date);
CREATE INDEX IF NOT EXISTS idx_parts_requests_tractor ON parts_requests(tractor_id);
CREATE INDEX IF NOT EXISTS idx_parts_requests_status ON parts_requests(delivery_status);
CREATE INDEX IF NOT EXISTS idx_technician_calls_tractor ON technician_calls(tractor_id);
CREATE INDEX IF NOT EXISTS idx_technician_calls_status ON technician_calls(status);
CREATE INDEX IF NOT EXISTS idx_notifications_tractor ON service_notifications(tractor_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON service_notifications(is_read);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE moto_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE technician_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view all profiles"
  ON users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for tractors table
CREATE POLICY "All authenticated users can view tractors"
  ON tractors FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Technicians and admins can insert tractors"
  ON tractors FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('technician', 'admin')
    )
  );

CREATE POLICY "Technicians and admins can update tractors"
  ON tractors FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('technician', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('technician', 'admin')
    )
  );

CREATE POLICY "Only admins can delete tractors"
  ON tractors FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- RLS Policies for service_logs table
CREATE POLICY "All authenticated users can view service logs"
  ON service_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Technicians and admins can insert service logs"
  ON service_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('technician', 'admin')
    )
  );

CREATE POLICY "Technicians can update own service logs"
  ON service_logs FOR UPDATE
  TO authenticated
  USING (
    technician_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    technician_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- RLS Policies for moto_hours table
CREATE POLICY "All authenticated users can view moto hours"
  ON moto_hours FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Operators can insert moto hours"
  ON moto_hours FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('operator', 'technician', 'admin')
    )
  );

CREATE POLICY "Operators can update own moto hours entries"
  ON moto_hours FOR UPDATE
  TO authenticated
  USING (
    operator_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('technician', 'admin')
    )
  )
  WITH CHECK (
    operator_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('technician', 'admin')
    )
  );

-- RLS Policies for parts_requests table
CREATE POLICY "All authenticated users can view parts requests"
  ON parts_requests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can insert parts requests"
  ON parts_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Requesters and admins can update parts requests"
  ON parts_requests FOR UPDATE
  TO authenticated
  USING (
    requester_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('technician', 'admin')
    )
  )
  WITH CHECK (
    requester_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('technician', 'admin')
    )
  );

-- RLS Policies for technician_calls table
CREATE POLICY "All authenticated users can view technician calls"
  ON technician_calls FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Operators can insert technician calls"
  ON technician_calls FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = operator_id AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('operator', 'technician', 'admin')
    )
  );

CREATE POLICY "Technicians and admins can update calls"
  ON technician_calls FOR UPDATE
  TO authenticated
  USING (
    operator_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('technician', 'admin')
    )
  )
  WITH CHECK (
    operator_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('technician', 'admin')
    )
  );

-- RLS Policies for service_notifications table
CREATE POLICY "All authenticated users can view notifications"
  ON service_notifications FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert notifications"
  ON service_notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update notification read status"
  ON service_notifications FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DO $$ BEGIN
  CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_tractors_updated_at
    BEFORE UPDATE ON tractors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_parts_requests_updated_at
    BEFORE UPDATE ON parts_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_technician_calls_updated_at
    BEFORE UPDATE ON technician_calls
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create function to check service intervals and create notifications
CREATE OR REPLACE FUNCTION check_service_interval()
RETURNS TRIGGER AS $$
DECLARE
  service_intervals integer[] := ARRAY[50, 100, 250, 500, 1000];
  interval_value integer;
  last_notification_hour integer;
BEGIN
  -- Get the last notification hour for this tractor
  SELECT COALESCE(MAX(triggered_at_hours), 0) INTO last_notification_hour
  FROM service_notifications
  WHERE tractor_id = NEW.id;

  -- Check each service interval
  FOREACH interval_value IN ARRAY service_intervals
  LOOP
    -- If current hours crossed an interval and no notification exists for it
    IF NEW.current_moto_hours >= interval_value 
       AND last_notification_hour < interval_value THEN
      
      INSERT INTO service_notifications (
        tractor_id,
        notification_type,
        triggered_at_hours,
        is_read
      ) VALUES (
        NEW.id,
        interval_value || ' hours service due',
        interval_value,
        false
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for service interval notifications
DO $$ BEGIN
  CREATE TRIGGER trigger_service_interval_notification
    AFTER INSERT OR UPDATE OF current_moto_hours ON tractors
    FOR EACH ROW
    EXECUTE FUNCTION check_service_interval();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create function to automatically update tractor moto hours when new reading is added
CREATE OR REPLACE FUNCTION update_tractor_moto_hours()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE tractors
  SET current_moto_hours = NEW.value,
      updated_at = now()
  WHERE id = NEW.tractor_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update tractor moto hours
DO $$ BEGIN
  CREATE TRIGGER trigger_update_tractor_hours
    AFTER INSERT ON moto_hours
    FOR EACH ROW
    EXECUTE FUNCTION update_tractor_moto_hours();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
