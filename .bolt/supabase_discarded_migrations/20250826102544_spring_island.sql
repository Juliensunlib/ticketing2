/*
  # Mise à jour des statuts de tickets

  1. Contraintes mises à jour
    - Suppression de l'ancienne contrainte de statut
    - Ajout de la nouvelle contrainte avec tous les statuts requis
  
  2. Nouveaux statuts
    - SAV / question technique
    - Recouvrement
    - Plainte Installateur
    - changement date prélèvement/RIB
    - Résiliation anticipée / cession de contrat
    - Ajout contrat / Flexibilité
*/

-- Supprimer l'ancienne contrainte de statut
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;

-- Ajouter la nouvelle contrainte avec tous les statuts requis
ALTER TABLE tickets ADD CONSTRAINT tickets_status_check 
CHECK (status = ANY (ARRAY[
  'SAV / question technique'::text,
  'Recouvrement'::text,
  'Plainte Installateur'::text,
  'changement date prélèvement/RIB'::text,
  'Résiliation anticipée / cession de contrat'::text,
  'Ajout contrat / Flexibilité'::text
]));

-- Mettre à jour la valeur par défaut
ALTER TABLE tickets ALTER COLUMN status SET DEFAULT 'SAV / question technique';