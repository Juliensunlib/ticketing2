/*
  # Fix RLS policies for task notifications

  1. Tables
    - `user_tasks` - User personal tasks with proper RLS
    - `task_notifications` - Task notifications with simplified RLS using auth.uid()

  2. Security
    - Enable RLS on both tables
    - Use auth.uid() directly instead of complex joins
    - Allow users to manage only their own tasks and notifications

  3. Functions
    - Automatic notification creation on task insert
    - Automatic notification update on task due date change
    - Automatic updated_at timestamp management
*/

-- Create user_tasks table
CREATE TABLE IF NOT EXISTS user_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ticket_id uuid REFERENCES tickets(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create task_notifications table
CREATE TABLE IF NOT EXISTS task_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES user_tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_date date NOT NULL,
  is_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_tasks_created_by ON user_tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_user_tasks_due_date ON user_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_user_tasks_status ON user_tasks(status);
CREATE INDEX IF NOT EXISTS idx_user_tasks_ticket_id ON user_tasks(ticket_id);

CREATE INDEX IF NOT EXISTS idx_task_notifications_task_id ON task_notifications(task_id);
CREATE INDEX IF NOT EXISTS idx_task_notifications_user_id ON task_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_task_notifications_notification_date ON task_notifications(notification_date);
CREATE INDEX IF NOT EXISTS idx_task_notifications_is_sent ON task_notifications(is_sent);

-- Enable RLS
ALTER TABLE user_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_tasks
DROP POLICY IF EXISTS "Users can manage their own tasks" ON user_tasks;
CREATE POLICY "Users can manage their own tasks"
  ON user_tasks
  FOR ALL
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Service role has full access to user_tasks" ON user_tasks;
CREATE POLICY "Service role has full access to user_tasks"
  ON user_tasks
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for task_notifications (SIMPLIFIED)
DROP POLICY IF EXISTS "Users can see their own task notifications" ON task_notifications;
CREATE POLICY "Users can see their own task notifications"
  ON task_notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own task notifications" ON task_notifications;
CREATE POLICY "Users can insert their own task notifications"
  ON task_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own task notifications" ON task_notifications;
CREATE POLICY "Users can update their own task notifications"
  ON task_notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role has full access to task_notifications" ON task_notifications;
CREATE POLICY "Service role has full access to task_notifications"
  ON task_notifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create task notification
CREATE OR REPLACE FUNCTION create_task_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO task_notifications (task_id, user_id, notification_date)
  VALUES (NEW.id, NEW.created_by, NEW.due_date);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update task notification when due date changes
CREATE OR REPLACE FUNCTION update_task_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.due_date != NEW.due_date THEN
    UPDATE task_notifications 
    SET notification_date = NEW.due_date
    WHERE task_id = NEW.id AND user_id = NEW.created_by;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS update_user_tasks_updated_at ON user_tasks;
CREATE TRIGGER update_user_tasks_updated_at
  BEFORE UPDATE ON user_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_user_tasks_updated_at();

DROP TRIGGER IF EXISTS create_task_notification_trigger ON user_tasks;
CREATE TRIGGER create_task_notification_trigger
  AFTER INSERT ON user_tasks
  FOR EACH ROW
  EXECUTE FUNCTION create_task_notification();

DROP TRIGGER IF EXISTS update_task_notification_trigger ON user_tasks;
CREATE TRIGGER update_task_notification_trigger
  AFTER UPDATE ON user_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_task_notification();