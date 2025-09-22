/*
  # Système de gestion des tâches

  1. Nouvelles Tables
    - `user_tasks` : Tâches créées par les utilisateurs
      - `id` (uuid, primary key)
      - `title` (text, titre de la tâche)
      - `description` (text, description détaillée)
      - `due_date` (date, date d'échéance)
      - `status` (text, statut de la tâche)
      - `priority` (text, priorité)
      - `created_by` (uuid, référence vers users)
      - `ticket_id` (uuid, référence optionnelle vers tickets)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `task_notifications` : Notifications pour les tâches
      - `id` (uuid, primary key)
      - `task_id` (uuid, référence vers user_tasks)
      - `user_id` (uuid, référence vers users)
      - `notification_date` (date, date de notification)
      - `is_sent` (boolean, si la notification a été envoyée)
      - `created_at` (timestamp)

  2. Sécurité
    - Enable RLS sur toutes les tables
    - Politiques pour que les utilisateurs ne voient que leurs propres tâches
    - Politiques pour les notifications personnalisées

  3. Fonctions
    - Trigger pour mettre à jour updated_at
    - Fonction pour créer automatiquement les notifications
*/

-- Table des tâches utilisateur
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

-- Table des notifications de tâches
CREATE TABLE IF NOT EXISTS task_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES user_tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_date date NOT NULL,
  is_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_user_tasks_created_by ON user_tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_user_tasks_due_date ON user_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_user_tasks_status ON user_tasks(status);
CREATE INDEX IF NOT EXISTS idx_user_tasks_ticket_id ON user_tasks(ticket_id);
CREATE INDEX IF NOT EXISTS idx_task_notifications_user_id ON task_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_task_notifications_date ON task_notifications(notification_date);
CREATE INDEX IF NOT EXISTS idx_task_notifications_sent ON task_notifications(is_sent);

-- Activer RLS
ALTER TABLE user_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_notifications ENABLE ROW LEVEL SECURITY;

-- Politiques pour user_tasks
CREATE POLICY "Users can read their own tasks"
  ON user_tasks
  FOR SELECT
  TO authenticated
  USING (created_by = uid());

CREATE POLICY "Users can create their own tasks"
  ON user_tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = uid());

CREATE POLICY "Users can update their own tasks"
  ON user_tasks
  FOR UPDATE
  TO authenticated
  USING (created_by = uid())
  WITH CHECK (created_by = uid());

CREATE POLICY "Users can delete their own tasks"
  ON user_tasks
  FOR DELETE
  TO authenticated
  USING (created_by = uid());

-- Politiques pour task_notifications
CREATE POLICY "Users can read their own task notifications"
  ON task_notifications
  FOR SELECT
  TO authenticated
  USING (user_id = uid());

CREATE POLICY "System can manage task notifications"
  ON task_notifications
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_user_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
CREATE TRIGGER update_user_tasks_updated_at
  BEFORE UPDATE ON user_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_user_tasks_updated_at();

-- Fonction pour créer automatiquement une notification de tâche
CREATE OR REPLACE FUNCTION create_task_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Créer une notification pour le jour d'échéance
  INSERT INTO task_notifications (task_id, user_id, notification_date)
  VALUES (NEW.id, NEW.created_by, NEW.due_date);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour créer automatiquement les notifications
CREATE TRIGGER create_task_notification_trigger
  AFTER INSERT ON user_tasks
  FOR EACH ROW
  EXECUTE FUNCTION create_task_notification();

-- Fonction pour mettre à jour les notifications quand la date d'échéance change
CREATE OR REPLACE FUNCTION update_task_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Si la date d'échéance a changé, mettre à jour la notification
  IF OLD.due_date != NEW.due_date THEN
    UPDATE task_notifications 
    SET notification_date = NEW.due_date
    WHERE task_id = NEW.id AND user_id = NEW.created_by;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour les notifications
CREATE TRIGGER update_task_notification_trigger
  AFTER UPDATE ON user_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_task_notification();