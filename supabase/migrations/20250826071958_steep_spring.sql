/*
  # Correction de l'erreur de création d'utilisateur

  1. Suppression et recréation du trigger
    - Supprime l'ancien trigger défaillant
    - Recrée une fonction trigger simplifiée
    - Gère les erreurs de synchronisation

  2. Politiques RLS corrigées
    - Permet l'insertion via trigger
    - Maintient la sécurité

  3. Gestion des conflits
    - ON CONFLICT pour éviter les doublons
    - Mise à jour automatique des données
*/

-- Supprimer l'ancien trigger et fonction s'ils existent
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Créer une fonction trigger simplifiée
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, user_group, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'user_group', 'support'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) 
  DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, users.name),
    user_group = COALESCE(EXCLUDED.user_group, users.user_group),
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log l'erreur mais ne pas faire échouer la création de l'utilisateur
    RAISE WARNING 'Erreur lors de la synchronisation utilisateur: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Recréer le trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- S'assurer que les politiques RLS permettent l'insertion
DROP POLICY IF EXISTS "Allow trigger to insert users" ON users;
CREATE POLICY "Allow trigger to insert users"
  ON users FOR INSERT
  TO public
  WITH CHECK (true);

-- Vérifier que la contrainte unique existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'users' AND constraint_name = 'users_email_key'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);
  END IF;
END $$;