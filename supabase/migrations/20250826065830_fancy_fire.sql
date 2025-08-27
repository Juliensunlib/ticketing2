/*
  # Création de la table des utilisateurs

  1. Nouvelles Tables
    - `users`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `name` (text)
      - `user_group` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Sécurité
    - Enable RLS sur la table `users`
    - Politique pour permettre aux utilisateurs authentifiés de lire tous les utilisateurs
    - Politique pour permettre aux utilisateurs de modifier leur propre profil
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  user_group text NOT NULL DEFAULT 'user',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre aux utilisateurs authentifiés de lire tous les utilisateurs
CREATE POLICY "Authenticated users can read all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

-- Politique pour permettre aux utilisateurs de modifier leur propre profil
CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Politique pour permettre aux administrateurs de gérer tous les utilisateurs
CREATE POLICY "Admins can manage all users"
  ON users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND user_group = 'admin'
    )
  );

-- Insérer quelques utilisateurs de démonstration
INSERT INTO users (email, name, user_group) VALUES
  ('marie.dubois@sunlib.fr', 'Marie Dubois', 'admin'),
  ('pierre.martin@sunlib.fr', 'Pierre Martin', 'support'),
  ('sophie.leroy@sunlib.fr', 'Sophie Leroy', 'support'),
  ('admin@sunlib.fr', 'Administrateur', 'admin')
ON CONFLICT (email) DO NOTHING;