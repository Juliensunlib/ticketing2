/*
  # Fix tickets status constraint

  1. Database Changes
    - Update the status check constraint to match the application's expected values
    - Add "En cours Service Client" (with capital S) to allowed statuses
    - Remove "Ouvert" as it's not used in the application
    
  2. Security
    - No changes to RLS policies needed
    
  3. Notes
    - This fixes the constraint violation error when creating tickets
    - Ensures consistency between frontend and database constraints
*/

-- Drop the existing constraint
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;

-- Add the updated constraint with correct status values
ALTER TABLE tickets ADD CONSTRAINT tickets_status_check 
  CHECK (status = ANY (ARRAY[
    'Nouveau'::text, 
    'En attente du client'::text, 
    'En attente de l''installateur'::text, 
    'En attente retour service technique'::text, 
    'En cours Service Client'::text, 
    'Fermé'::text
  ]));