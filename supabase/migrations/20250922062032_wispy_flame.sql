/*
  # Fix RLS policies for user_tasks table

  1. Tables
    - Fix RLS policies for `user_tasks` table to use auth.uid() directly
    - Fix RLS policies for `task_notifications` table to use auth.uid() directly

  2. Security
    - Enable RLS on both tables
    - Add policies that work with Supabase auth system
    - Use auth.uid() instead of email-based lookups

  3. Functions
    - Update trigger functions to work with auth.uid()
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage their own tasks" ON user_tasks;
DROP POLICY IF EXISTS "Service role has full access to user_tasks" ON user_tasks;
DROP POLICY IF EXISTS "Users can insert their own task notifications" ON task_notifications;
DROP POLICY IF EXISTS "Users can see their own task notifications" ON task_notifications;
DROP POLICY IF EXISTS "Users can update their own task notifications" ON task_notifications;
DROP POLICY IF EXISTS "Service role has full access to task_notifications" ON task_notifications;

-- Create proper RLS policies for user_tasks
CREATE POLICY "Allow users to insert their own tasks"
  ON user_tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Allow users to select their own tasks"
  ON user_tasks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Allow users to update their own tasks"
  ON user_tasks
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Allow users to delete their own tasks"
  ON user_tasks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Service role has full access to user_tasks"
  ON user_tasks
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create proper RLS policies for task_notifications
CREATE POLICY "Allow users to insert their own task notifications"
  ON task_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to select their own task notifications"
  ON task_notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own task notifications"
  ON task_notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role has full access to task_notifications"
  ON task_notifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Update the trigger function to use auth.uid()
CREATE OR REPLACE FUNCTION create_task_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO task_notifications (task_id, user_id, notification_date)
  VALUES (NEW.id, NEW.created_by, NEW.due_date);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_task_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Si la date d'échéance a changé, mettre à jour la notification
  IF OLD.due_date != NEW.due_date THEN
    UPDATE task_notifications 
    SET notification_date = NEW.due_date, is_sent = false
    WHERE task_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;