/*
  # Solution définitive pour la synchronisation des utilisateurs

  1. Fonction de synchronisation automatique
    - Crée automatiquement un utilisateur dans public.users quand il se connecte
    - Utilise l'ID d'auth.users comme ID dans public.users
  
  2. Trigger automatique
    - Se déclenche à chaque connexion
    - Assure la cohérence entre les deux tables
  
  3. Mise à jour des contraintes
    - Les foreign keys pointent maintenant vers auth.uid() directement
*/

-- Supprimer les anciennes contraintes problématiques
ALTER TABLE user_tasks DROP CONSTRAINT IF EXISTS user_tasks_created_by_fkey;
ALTER TABLE task_notifications DROP CONSTRAINT IF EXISTS task_notifications_user_id_fkey;

-- Fonction pour synchroniser les utilisateurs
CREATE OR REPLACE FUNCTION sync_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insérer ou mettre à jour l'utilisateur dans public.users avec l'ID d'auth
  INSERT INTO public.users (id, email, name, user_group)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'user_group', 'support')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, users.name),
    user_group = COALESCE(EXCLUDED.user_group, users.user_group),
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour synchroniser automatiquement
DROP TRIGGER IF EXISTS sync_auth_user_trigger ON auth.users;
CREATE TRIGGER sync_auth_user_trigger
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_auth_user();

-- Synchroniser les utilisateurs existants
INSERT INTO public.users (id, email, name, user_group)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)),
  COALESCE(au.raw_user_meta_data->>'user_group', 'support')
FROM auth.users au
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  updated_at = now();

-- Recréer les contraintes avec les bons IDs
ALTER TABLE user_tasks 
ADD CONSTRAINT user_tasks_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE task_notifications 
ADD CONSTRAINT task_notifications_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Mettre à jour les politiques RLS pour utiliser auth.uid() directement
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON user_tasks;
DROP POLICY IF EXISTS "Enable select for own tasks" ON user_tasks;
DROP POLICY IF EXISTS "Enable update for own tasks" ON user_tasks;
DROP POLICY IF EXISTS "Enable delete for own tasks" ON user_tasks;

CREATE POLICY "Enable insert for authenticated users" ON user_tasks
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Enable select for own tasks" ON user_tasks
  FOR SELECT TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Enable update for own tasks" ON user_tasks
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Enable delete for own tasks" ON user_tasks
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- Politiques pour task_notifications
DROP POLICY IF EXISTS "Allow users to insert their own task notifications" ON task_notifications;
DROP POLICY IF EXISTS "Allow users to select their own task notifications" ON task_notifications;
DROP POLICY IF EXISTS "Allow users to update their own task notifications" ON task_notifications;

CREATE POLICY "Allow users to insert their own task notifications" ON task_notifications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to select their own task notifications" ON task_notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own task notifications" ON task_notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);