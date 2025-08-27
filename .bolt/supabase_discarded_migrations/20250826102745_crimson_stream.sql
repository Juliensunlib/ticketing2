/*
  # Corriger les types de problème et statuts des tickets

  1. Contraintes mises à jour
    - Types de problème : SAV / question technique, Recouvrement, etc.
    - Statuts : Nouveau, En attente du client, etc.
  
  2. Valeurs par défaut
    - Type par défaut : 'SAV / question technique'
    - Statut par défaut : 'Nouveau'
*/

-- Supprimer les anciennes contraintes
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_type_check;
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;

-- Ajouter la contrainte pour les types de problème
ALTER TABLE tickets ADD CONSTRAINT tickets_type_check 
CHECK (type = ANY (ARRAY[
  'SAV / question technique'::text,
  'Recouvrement'::text,
  'Plainte Installateur'::text,
  'changement date prélèvement/RIB'::text,
  'Résiliation anticipée / cession de contrat'::text,
  'Ajout contrat / Flexibilité'::text
]));

-- Ajouter la contrainte pour les statuts
ALTER TABLE tickets ADD CONSTRAINT tickets_status_check 
CHECK (status = ANY (ARRAY[
  'Nouveau'::text,
  'En attente du client'::text,
  'En attente de l''installateur'::text,
  'En attente retour service technique'::text,
  'Fermé'::text,
  'Ouvert'::text
]));

-- Mettre à jour les valeurs par défaut
ALTER TABLE tickets ALTER COLUMN type SET DEFAULT 'SAV / question technique';
ALTER TABLE tickets ALTER COLUMN status SET DEFAULT 'Nouveau';