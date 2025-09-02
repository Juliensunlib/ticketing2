/*
  # Fix tickets status constraint

  1. Database Changes
    - Update all existing tickets with status 'Ouvert' to 'En cours Service Client'
    - Drop the old status check constraint
    - Create new status check constraint with 'En cours Service Client' instead of 'Ouvert'
  
  2. Security
    - No changes to RLS policies
*/

-- First, update all existing tickets with 'Ouvert' status to 'En cours Service Client'
UPDATE tickets 
SET status = 'En cours Service Client' 
WHERE status = 'Ouvert';

-- Drop the existing check constraint
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;

-- Create the new check constraint with the updated status values
ALTER TABLE tickets ADD CONSTRAINT tickets_status_check 
CHECK (status = ANY (ARRAY[
  'Nouveau'::text, 
  'En attente du client'::text, 
  'En attente de l''installateur'::text, 
  'En attente retour service technique'::text, 
  'Fermé'::text, 
  'En cours Service Client'::text
]));