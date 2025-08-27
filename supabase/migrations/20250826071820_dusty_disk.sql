/*
  # Correction de l'erreur de création d'utilisateur

  1. Fonction trigger
    - Synchronise automatiquement auth.users avec public.users
    - Gère les insertions et mises à jour
    - Extrait les métadonnées utilisateur

  2. Sécurité
    - RLS maintenu sur la table users
    - Politiques d'accès appropriées
    - Gestion des erreurs

  3. Synchronisation
    - Création automatique dans public.users
    - Extraction du nom et user_group depuis raw_user_meta_data
    - Timestamps automatiques
*/

-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Créer la fonction de gestion des nouveaux utilisateurs
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insérer dans public.users seulement si l'utilisateur n'existe pas déjà
  INSERT INTO public.users (id, email, name, user_group, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'user_group', 'support'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, users.name),
    user_group = COALESCE(EXCLUDED.user_group, users.user_group),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- S'assurer que la table users a les bonnes contraintes
ALTER TABLE public.users 
  DROP CONSTRAINT IF EXISTS users_email_key;

ALTER TABLE public.users 
  ADD CONSTRAINT users_email_key UNIQUE (email);

-- Vérifier que RLS est activé
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Recréer les politiques si nécessaire
DROP POLICY IF EXISTS "Authenticated users can read all users" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;

-- Politique pour lire tous les utilisateurs (nécessaire pour l'assignation)
CREATE POLICY "Authenticated users can read all users"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (true);

-- Politique pour mettre à jour son propre profil
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Politique pour les admins
CREATE POLICY "Admins can manage all users"
  ON public.users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND user_group = 'admin'
    )
  );

-- Politique pour permettre l'insertion via le trigger
CREATE POLICY "Allow trigger to insert users"
  ON public.users
  FOR INSERT
  WITH CHECK (true);