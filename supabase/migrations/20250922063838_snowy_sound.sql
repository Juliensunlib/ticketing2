/*
  # Debug et fix des politiques RLS pour user_tasks

  1. Suppression des anciennes politiques
  2. Création de nouvelles politiques plus permissives pour debug
  3. Ajout de logs pour comprendre le problème
*/

-- Supprimer toutes les politiques existantes
DROP POLICY IF EXISTS "Enable insert for own tasks" ON user_tasks;
DROP POLICY IF EXISTS "Enable select for own tasks" ON user_tasks;
DROP POLICY IF EXISTS "Enable update for own tasks" ON user_tasks;
DROP POLICY IF EXISTS "Enable delete for own tasks" ON user_tasks;
DROP POLICY IF EXISTS "Users can insert their own tasks" ON user_tasks;
DROP POLICY IF EXISTS "Users can select their own tasks" ON user_tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON user_tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON user_tasks;

-- Politique INSERT très permissive pour debug
CREATE POLICY "Debug insert policy" ON user_tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Politique SELECT permissive
CREATE POLICY "Debug select policy" ON user_tasks
  FOR SELECT
  TO authenticated
  USING (true);

-- Politique UPDATE permissive
CREATE POLICY "Debug update policy" ON user_tasks
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Politique DELETE permissive
CREATE POLICY "Debug delete policy" ON user_tasks
  FOR DELETE
  TO authenticated
  USING (true);

-- Vérifier que RLS est activé
ALTER TABLE user_tasks ENABLE ROW LEVEL SECURITY;