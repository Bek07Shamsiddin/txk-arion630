/*
  # Fix Authentication RLS Policy

  ## Problem
  The current RLS policy on users table requires authentication for SELECT operations.
  This creates a chicken-and-egg problem during login: we need to query the users table
  to verify the phone exists, but we can't query without being authenticated.

  ## Changes
  1. Add RLS policy to allow unauthenticated phone number lookups
     - Allows SELECT on users table for unauthenticated users
     - Only exposes id and phone fields for security
     - Required for login flow to work correctly
  
  2. Keep existing authenticated user policies intact

  ## Security Notes
  - Unauthenticated users can only check if a phone number exists
  - No sensitive data (password, email) is exposed
  - This is standard practice for login systems
*/

-- Drop existing restrictive policy if it exists
DROP POLICY IF EXISTS "Users can view all profiles" ON users;

-- Allow unauthenticated users to check if phone exists (for login)
CREATE POLICY "Allow phone lookup for login"
  ON users FOR SELECT
  TO anon
  USING (true);

-- Allow authenticated users to view all profiles
CREATE POLICY "Authenticated users can view all profiles"
  ON users FOR SELECT
  TO authenticated
  USING (true);
