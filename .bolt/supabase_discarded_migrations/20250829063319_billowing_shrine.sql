/*
  # Mise à jour du statut 'Ouvert' vers 'En cours Service Client'

  1. Modifications
    - Mise à jour de tous les tickets avec le statut 'Ouvert' vers 'En cours Service Client'
    - Mise à jour de la contrainte de validation pour remplacer 'Ouvert' par 'En cours Service Client'

  2. Sécurité
    - Opération sécurisée qui préserve toutes les données existantes
    - Seul le libellé du statut change
*/

-- Mettre à jour tous les tickets existants avec le statut 'Ouvert'
UPDATE tickets 
SET status = 'En cours Service Client', updated_at = now()
WHERE status = 'Ouvert';

-- Supprimer l'ancienne contrainte
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;

-- Recréer la contrainte avec le nouveau statut
ALTER TABLE tickets ADD CONSTRAINT tickets_status_check 
CHECK (status = ANY (ARRAY[
  'Nouveau'::text, 
  'En attente du client'::text, 
  'En attente de l''installateur'::text, 
  'En attente retour service technique'::text, 
  'Fermé'::text, 
  'En cours Service Client'::text
]));