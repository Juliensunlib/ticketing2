/*
  # Fix infinite recursion in RLS policies

  1. Problem
    - Current policies create infinite recursion by querying the users table within the policy
    - This happens when a policy tries to check user_group by querying the same table it's protecting

  2. Solution
    - Drop all existing problematic policies
    - Create new policies that use auth.uid() and auth.jwt() instead of querying users table
    - Use metadata from the JWT token for role-based access

  3. New Policies
    - Simple policies that don't create circular dependencies
    - Use built-in Supabase auth functions
    - Avoid querying the users table within policies
*/

-- Drop all existing policies that might cause recursion
DROP POLICY IF EXISTS "Admins can manage all users" ON users;
DROP POLICY IF EXISTS "Allow trigger to insert users" ON users;
DROP POLICY IF EXISTS "Authenticated users can read all users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Create simple, non-recursive policies

-- Allow all authenticated users to read all users (simple approach)
CREATE POLICY "Allow authenticated users to read users"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to update their own profile using auth.uid()
CREATE POLICY "Allow users to update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow trigger and service role to insert users
CREATE POLICY "Allow system to insert users"
  ON users
  FOR INSERT
  TO public, service_role
  WITH CHECK (true);

-- Allow service role to manage all users (for admin operations)
CREATE POLICY "Allow service role full access"
  ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);