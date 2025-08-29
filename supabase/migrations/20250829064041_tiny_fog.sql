/*
  # Mise à jour de la contrainte de statut pour remplacer "Ouvert" par "En cours Service Client"

  1. Modifications
    - Mise à jour des tickets existants avec statut "Ouvert" vers "En cours Service Client"
    - Suppression de l'ancienne contrainte tickets_status_check
    - Création d'une nouvelle contrainte avec "En cours Service Client"

  2. Sécurité
    - Préservation de toutes les données existantes
    - Mise à jour en douceur sans perte de données
*/

-- Étape 1: Mettre à jour tous les tickets avec le statut "Ouvert" vers "En cours Service Client"
UPDATE tickets 
SET status = 'En cours Service Client' 
WHERE status = 'Ouvert';

-- Étape 2: Supprimer l'ancienne contrainte
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;

-- Étape 3: Créer la nouvelle contrainte avec "En cours Service Client"
ALTER TABLE tickets ADD CONSTRAINT tickets_status_check 
CHECK (status = ANY (ARRAY[
  'Nouveau'::text, 
  'En attente du client'::text, 
  'En attente de l''installateur'::text, 
  'En attente retour service technique'::text, 
  'En cours Service Client'::text,
  'Fermé'::text
]));