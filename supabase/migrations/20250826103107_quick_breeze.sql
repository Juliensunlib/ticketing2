/*
  # Correction finale de la contrainte de statut

  1. Suppression de l'ancienne contrainte
  2. Ajout de la nouvelle contrainte avec tous les statuts requis
  3. Mise à jour de la valeur par défaut
*/

-- Supprimer l'ancienne contrainte de statut
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;

-- Ajouter la nouvelle contrainte avec tous les statuts requis
ALTER TABLE tickets ADD CONSTRAINT tickets_status_check 
CHECK (status = ANY (ARRAY[
  'Nouveau'::text,
  'En attente du client'::text,
  'En attente de l''installateur'::text,
  'En attente retour service technique'::text,
  'Fermé'::text,
  'Ouvert'::text
]));

-- Mettre à jour la valeur par défaut
ALTER TABLE tickets ALTER COLUMN status SET DEFAULT 'Nouveau'::text;