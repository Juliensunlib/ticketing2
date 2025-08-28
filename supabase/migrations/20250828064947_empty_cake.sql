/*
  # Correction du système de numérotation des tickets

  1. Modifications
    - Mise à jour de la fonction assign_ticket_number pour utiliser des numéros séquentiels
    - Réinitialisation des numéros de tickets existants pour commencer à 1
    - Amélioration de la gestion des conflits de numérotation

  2. Sécurité
    - Maintien des politiques RLS existantes
    - Conservation de tous les triggers existants
*/

-- Supprimer l'ancienne fonction si elle existe
DROP FUNCTION IF EXISTS assign_ticket_number();

-- Créer une nouvelle fonction pour assigner des numéros séquentiels
CREATE OR REPLACE FUNCTION assign_ticket_number()
RETURNS TRIGGER AS $$
DECLARE
  next_number INTEGER;
BEGIN
  -- Si le ticket_number n'est pas déjà défini
  IF NEW.ticket_number IS NULL THEN
    -- Obtenir le prochain numéro disponible
    SELECT COALESCE(MAX(ticket_number), 0) + 1 
    INTO next_number 
    FROM tickets;
    
    -- Assigner le numéro
    NEW.ticket_number := next_number;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Réassigner des numéros séquentiels aux tickets existants
DO $$
DECLARE
  ticket_record RECORD;
  counter INTEGER := 1;
BEGIN
  -- Parcourir tous les tickets par ordre de création
  FOR ticket_record IN 
    SELECT id FROM tickets ORDER BY created_at ASC
  LOOP
    -- Mettre à jour le numéro de ticket
    UPDATE tickets 
    SET ticket_number = counter 
    WHERE id = ticket_record.id;
    
    counter := counter + 1;
  END LOOP;
END $$;

-- Recréer le trigger pour les nouveaux tickets
DROP TRIGGER IF EXISTS assign_ticket_number_trigger ON tickets;
CREATE TRIGGER assign_ticket_number_trigger
  BEFORE INSERT ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION assign_ticket_number();