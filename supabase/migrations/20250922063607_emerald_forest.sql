/*
  # Fix RLS policy for user_tasks table

  1. Security Updates
    - Drop existing restrictive INSERT policy
    - Create new INSERT policy that allows authenticated users to create tasks
    - Ensure WITH CHECK expression allows insertion when created_by matches auth.uid()
    - Keep existing policies for SELECT, UPDATE, DELETE intact

  2. Changes
    - Modified INSERT policy to use auth.uid() = created_by for both USING and WITH CHECK
    - This allows authenticated users to create tasks assigned to themselves
*/

-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON user_tasks;

-- Create a new INSERT policy that allows authenticated users to create tasks
CREATE POLICY "Enable insert for authenticated users" ON user_tasks
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = created_by);

-- Ensure the SELECT policy allows users to see their own tasks
DROP POLICY IF EXISTS "Enable select for own tasks" ON user_tasks;
CREATE POLICY "Enable select for own tasks" ON user_tasks
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = created_by);

-- Ensure the UPDATE policy allows users to update their own tasks
DROP POLICY IF EXISTS "Enable update for own tasks" ON user_tasks;
CREATE POLICY "Enable update for own tasks" ON user_tasks
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = created_by) 
  WITH CHECK (auth.uid() = created_by);

-- Ensure the DELETE policy allows users to delete their own tasks
DROP POLICY IF EXISTS "Enable delete for own tasks" ON user_tasks;
CREATE POLICY "Enable delete for own tasks" ON user_tasks
  FOR DELETE 
  TO authenticated 
  USING (auth.uid() = created_by);