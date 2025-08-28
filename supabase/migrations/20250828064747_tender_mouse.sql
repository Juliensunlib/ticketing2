/*
  # Ajouter des numéros séquentiels aux tickets

  1. Modifications
    - Ajouter une colonne `ticket_number` avec auto-incrémentation
    - Créer une séquence pour les numéros de tickets
    - Mettre à jour les tickets existants avec des numéros séquentiels
    - Ajouter un trigger pour auto-assigner les numéros

  2. Sécurité
    - Maintenir les politiques RLS existantes
*/

-- Créer une séquence pour les numéros de tickets
CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START 1;

-- Ajouter la colonne ticket_number
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tickets' AND column_name = 'ticket_number'
  ) THEN
    ALTER TABLE tickets ADD COLUMN ticket_number INTEGER UNIQUE;
  END IF;
END $$;

-- Mettre à jour les tickets existants avec des numéros séquentiels
DO $$
DECLARE
  ticket_record RECORD;
  counter INTEGER := 1;
BEGIN
  FOR ticket_record IN 
    SELECT id FROM tickets 
    WHERE ticket_number IS NULL 
    ORDER BY created_at ASC
  LOOP
    UPDATE tickets 
    SET ticket_number = counter 
    WHERE id = ticket_record.id;
    counter := counter + 1;
  END LOOP;
  
  -- Mettre à jour la séquence pour qu'elle continue après les tickets existants
  PERFORM setval('ticket_number_seq', counter);
END $$;

-- Créer une fonction pour auto-assigner les numéros de tickets
CREATE OR REPLACE FUNCTION assign_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_number IS NULL THEN
    NEW.ticket_number := nextval('ticket_number_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger pour auto-assigner les numéros
DROP TRIGGER IF EXISTS assign_ticket_number_trigger ON tickets;
CREATE TRIGGER assign_ticket_number_trigger
  BEFORE INSERT ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION assign_ticket_number();

-- Rendre la colonne NOT NULL après avoir mis à jour tous les tickets existants
ALTER TABLE tickets ALTER COLUMN ticket_number SET NOT NULL;

-- Créer un index pour les performances
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_number ON tickets(ticket_number);