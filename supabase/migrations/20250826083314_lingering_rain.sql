/*
  # Ajouter colonne subscriber_name aux tickets

  1. Modifications
    - Ajouter la colonne `subscriber_name` à la table `tickets`
    - Type TEXT pour stocker "Prénom Nom - SL-XXXXXX"
    - Permet d'éviter les jointures avec Airtable pour l'affichage

  2. Avantages
    - Affichage direct du nom de l'abonné
    - Pas de dépendance à Airtable pour l'affichage
    - Performance améliorée
*/

-- Ajouter la colonne subscriber_name à la table tickets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tickets' AND column_name = 'subscriber_name'
  ) THEN
    ALTER TABLE tickets ADD COLUMN subscriber_name TEXT;
  END IF;
END $$;