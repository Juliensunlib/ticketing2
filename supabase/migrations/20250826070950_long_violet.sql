/*
  # Configuration de l'authentification et synchronisation des utilisateurs

  1. Nouvelles fonctions
    - Fonction pour créer un utilisateur dans la table publique lors de l'inscription
    - Trigger automatique pour synchroniser auth.users avec public.users

  2. Sécurité
    - Politiques RLS mises à jour
    - Permissions pour la création d'utilisateurs

  3. Données de test
    - Utilisateurs de démonstration avec authentification
*/

-- Fonction pour créer un utilisateur dans public.users lors de l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name, user_group)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'user_group', 'support')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour synchroniser automatiquement
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Mettre à jour les politiques RLS
DROP POLICY IF EXISTS "Admins can manage all users" ON users;
DROP POLICY IF EXISTS "Authenticated users can read all users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

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

-- Créer des utilisateurs de test avec authentification (optionnel)
-- Ces utilisateurs devront se connecter avec leur email/mot de passe

-- Insérer des utilisateurs de démonstration seulement si la table est vide
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users LIMIT 1) THEN
    -- Note: Ces utilisateurs devront être créés via l'interface d'authentification
    -- ou via l'API Supabase Auth pour avoir des mots de passe
    INSERT INTO users (id, email, name, user_group) VALUES
    (gen_random_uuid(), 'admin@sunlib.fr', 'Administrateur SunLib', 'admin'),
    (gen_random_uuid(), 'marie.dubois@sunlib.fr', 'Marie Dubois', 'support'),
    (gen_random_uuid(), 'pierre.martin@sunlib.fr', 'Pierre Martin', 'support'),
    (gen_random_uuid(), 'sophie.leroy@sunlib.fr', 'Sophie Leroy', 'support')
    ON CONFLICT (email) DO NOTHING;
  END IF;
END $$;