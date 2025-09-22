/*
  # Fix RLS policies for user_tasks table

  1. Security Updates
    - Drop existing problematic policies
    - Create new policies that properly use auth.uid()
    - Ensure users can only access their own tasks
    - Allow proper INSERT, SELECT, UPDATE, DELETE operations

  2. Policy Details
    - INSERT: Users can create tasks where created_by = auth.uid()
    - SELECT: Users can read their own tasks
    - UPDATE: Users can update their own tasks
    - DELETE: Users can delete their own tasks
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Service role full access to user_tasks" ON user_tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON user_tasks;
DROP POLICY IF EXISTS "Users can insert their own tasks" ON user_tasks;
DROP POLICY IF EXISTS "Users can select their own tasks" ON user_tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON user_tasks;

-- Create new policies with proper auth.uid() usage
CREATE POLICY "Enable insert for authenticated users" ON user_tasks
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Enable select for own tasks" ON user_tasks
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = created_by);

CREATE POLICY "Enable update for own tasks" ON user_tasks
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Enable delete for own tasks" ON user_tasks
  FOR DELETE 
  TO authenticated 
  USING (auth.uid() = created_by);

-- Keep service role access
CREATE POLICY "Service role full access" ON user_tasks
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);