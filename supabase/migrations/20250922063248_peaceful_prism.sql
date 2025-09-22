/*
  # Fix user_tasks table without users table

  1. Remove foreign key constraint that references non-existent users table
  2. Update RLS policies to work with auth.uid() directly
  3. Clean up any references to users table in user_tasks
*/

-- Remove the foreign key constraint that references the non-existent users table
ALTER TABLE user_tasks DROP CONSTRAINT IF EXISTS user_tasks_created_by_fkey;

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Enable delete for own tasks" ON user_tasks;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON user_tasks;
DROP POLICY IF EXISTS "Enable select for own tasks" ON user_tasks;
DROP POLICY IF EXISTS "Enable update for own tasks" ON user_tasks;
DROP POLICY IF EXISTS "Service role full access" ON user_tasks;

-- Create new RLS policies that work with auth.uid() directly
CREATE POLICY "Users can manage their own tasks"
  ON user_tasks
  FOR ALL
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Create policy for service role
CREATE POLICY "Service role has full access to user_tasks"
  ON user_tasks
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Update the created_by column to be UUID type (matching auth.uid())
-- This should already be UUID but let's make sure
ALTER TABLE user_tasks ALTER COLUMN created_by TYPE uuid USING created_by::uuid;