/*
  # Corriger les politiques de mise à jour des tickets

  1. Problème identifié
    - Les politiques RLS empêchent la mise à jour des tickets
    - La politique actuelle ne permet que la mise à jour par le créateur ou l'assigné
    - Mais l'utilisateur connecté n'est pas forcément dans la table users

  2. Solution
    - Permettre à tous les utilisateurs authentifiés de mettre à jour les tickets
    - Simplifier la politique pour éviter les blocages
*/

-- Supprimer l'ancienne politique restrictive
DROP POLICY IF EXISTS "Users can update tickets they created or are assigned to" ON tickets;

-- Créer une nouvelle politique plus permissive pour les utilisateurs authentifiés
CREATE POLICY "Authenticated users can update tickets"
  ON tickets
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Vérifier que la politique SELECT existe toujours
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'tickets' 
    AND policyname = 'Authenticated users can read all tickets'
  ) THEN
    CREATE POLICY "Authenticated users can read all tickets"
      ON tickets
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;