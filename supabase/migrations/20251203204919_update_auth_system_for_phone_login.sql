/*
  # Update Authentication System for Phone Login

  1. Updates
    - Ensure user_profiles has all necessary fields
    - Add is_active field to users table if not exists
    - Create helper functions for role checking
    - Update RLS policies for authentication flow

  2. Security
    - Ensure proper RLS policies are in place
    - Add policies for user registration and profile management

  3. Important Notes
    - Uses existing users table with phone and role
    - Integrates with Supabase auth for password management
    - Supports operator, technician, and admin roles
*/

-- Add is_active field to users table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE users ADD COLUMN is_active boolean DEFAULT true;
  END IF;
END $$;

-- Ensure user_profiles has full_name if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'user_profiles' AND column_name = 'is_active'
    ) THEN
      ALTER TABLE user_profiles ADD COLUMN is_active boolean DEFAULT true;
    END IF;
  END IF;
END $$;

-- Create or replace function to get user role from users table
CREATE OR REPLACE FUNCTION get_user_role(user_id uuid)
RETURNS text AS $$
  SELECT role::text FROM users WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- Create or replace function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = user_id AND role = 'admin' AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Create or replace function to check if user is technician
CREATE OR REPLACE FUNCTION is_technician(user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = user_id AND role = 'technician' AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Create or replace function to check if user is operator
CREATE OR REPLACE FUNCTION is_operator(user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = user_id AND role = 'operator' AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Drop existing conflicting policies if they exist
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can read active profiles" ON user_profiles;

-- Recreate policies for user_profiles if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
    -- Users can read their own profile
    EXECUTE 'CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT TO authenticated USING (auth.uid() = id)';
    
    -- Users can update their own profile (but not role)
    EXECUTE 'CREATE POLICY "Users can update own profile data" ON user_profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id)';
    
    -- Admins can read all profiles
    EXECUTE 'CREATE POLICY "Admins can view all profiles" ON user_profiles FOR SELECT TO authenticated USING (is_admin(auth.uid()))';
    
    -- Admins can update all profiles
    EXECUTE 'CREATE POLICY "Admins can update all profiles data" ON user_profiles FOR UPDATE TO authenticated USING (is_admin(auth.uid()))';
    
    -- Allow profile creation during signup
    EXECUTE 'CREATE POLICY "Allow profile creation on signup" ON user_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id)';
  END IF;
END $$;

-- Ensure users table has proper policies
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Admins can manage users" ON users;
DROP POLICY IF EXISTS "Allow user creation on signup" ON users;

-- Users can read their own data
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can update their own data (except role)
CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    role = (SELECT role FROM users WHERE id = auth.uid())
  );

-- Admins can read all users
CREATE POLICY "Admins can read all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

-- Admins can update all users
CREATE POLICY "Admins can manage users"
  ON users
  FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()));

-- Allow user creation during signup (authenticated users can create their own record)
CREATE POLICY "Allow user creation on signup"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Authenticated users can read other users for assignments
CREATE POLICY "Users can read other active users"
  ON users
  FOR SELECT
  TO authenticated
  USING (is_active = true);
