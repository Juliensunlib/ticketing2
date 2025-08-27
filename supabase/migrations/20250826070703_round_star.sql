/*
  # Gestion de la table users existante

  1. Vérifications
    - Vérifie si la table users existe déjà
    - Ajoute les colonnes manquantes si nécessaire
    - Configure RLS et les politiques

  2. Colonnes ajoutées (si manquantes)
    - `name` (text) - Nom complet de l'utilisateur
    - `user_group` (text) - Groupe d'utilisateur (admin, support, user)
    - `created_at` et `updated_at` - Timestamps

  3. Sécurité
    - Active RLS sur la table users
    - Ajoute les politiques d'accès appropriées

  4. Données de démonstration
    - Ajoute quelques utilisateurs de test si la table est vide
*/

-- Ajouter les colonnes manquantes à la table users existante
DO $$
BEGIN
  -- Ajouter la colonne name si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'name'
  ) THEN
    ALTER TABLE users ADD COLUMN name text;
  END IF;

  -- Ajouter la colonne user_group si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'user_group'
  ) THEN
    ALTER TABLE users ADD COLUMN user_group text DEFAULT 'user';
  END IF;

  -- Ajouter created_at si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE users ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;

  -- Ajouter updated_at si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE users ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;

  -- Ajouter email si elle n'existe pas (au cas où)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'email'
  ) THEN
    ALTER TABLE users ADD COLUMN email text UNIQUE;
  END IF;
END $$;

-- S'assurer que les contraintes existent
DO $$
BEGIN
  -- Ajouter la contrainte unique sur email si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'users' AND constraint_name = 'users_email_key'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);
  END IF;
EXCEPTION
  WHEN duplicate_table THEN
    -- La contrainte existe déjà, on continue
    NULL;
END $$;

-- Activer RLS sur la table users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Authenticated users can read all users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can manage all users" ON users;

-- Créer les politiques RLS
CREATE POLICY "Authenticated users can read all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can manage all users"
  ON users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND user_group = 'admin'
    )
  );

-- Insérer des données de démonstration seulement si la table est vide
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users LIMIT 1) THEN
    INSERT INTO users (email, name, user_group) VALUES
      ('admin@sunlib.fr', 'Administrateur SunLib', 'admin'),
      ('marie.dubois@sunlib.fr', 'Marie Dubois', 'support'),
      ('pierre.martin@sunlib.fr', 'Pierre Martin', 'support'),
      ('sophie.leroy@sunlib.fr', 'Sophie Leroy', 'support')
    ON CONFLICT (email) DO NOTHING;
  END IF;
END $$;