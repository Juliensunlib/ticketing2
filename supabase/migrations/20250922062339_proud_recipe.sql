/*
  # Fix RLS policies for user_tasks table

  1. Security Updates
    - Drop existing problematic policies
    - Create new policies that properly handle auth.uid()
    - Ensure INSERT policy allows users to create their own tasks
    - Ensure SELECT/UPDATE/DELETE policies allow users to manage their own tasks

  2. Policy Details
    - INSERT: Allow authenticated users to create tasks with their own ID
    - SELECT: Allow users to read their own tasks
    - UPDATE: Allow users to update their own tasks  
    - DELETE: Allow users to delete their own tasks
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow users to insert their own tasks" ON user_tasks;
DROP POLICY IF EXISTS "Allow users to select their own tasks" ON user_tasks;
DROP POLICY IF EXISTS "Allow users to update their own tasks" ON user_tasks;
DROP POLICY IF EXISTS "Allow users to delete their own tasks" ON user_tasks;
DROP POLICY IF EXISTS "Service role has full access to user_tasks" ON user_tasks;

-- Create new policies with proper auth.uid() handling
CREATE POLICY "Users can insert their own tasks"
  ON user_tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can select their own tasks"
  ON user_tasks
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can update their own tasks"
  ON user_tasks
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete their own tasks"
  ON user_tasks
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Service role policy for full access
CREATE POLICY "Service role full access to user_tasks"
  ON user_tasks
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);