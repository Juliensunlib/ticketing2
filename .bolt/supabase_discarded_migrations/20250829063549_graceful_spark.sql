/*
  # Fix status constraint to include 'En cours Service Client'

  1. Database Changes
    - Drop existing status check constraint
    - Create new constraint with updated status values including 'En cours Service Client'
    - Update any existing 'Ouvert' status to 'En cours Service Client'

  2. Security
    - No changes to RLS policies
*/

-- First, update any existing tickets with 'Ouvert' status to 'En cours Service Client'
UPDATE tickets 
SET status = 'En cours Service Client' 
WHERE status = 'Ouvert';

-- Drop the existing constraint
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;

-- Create the new constraint with the updated status values
ALTER TABLE tickets ADD CONSTRAINT tickets_status_check 
CHECK (status = ANY (ARRAY[
  'Nouveau'::text, 
  'En attente du client'::text, 
  'En attente de l''installateur'::text, 
  'En attente retour service technique'::text, 
  'Fermé'::text, 
  'En cours Service Client'::text
]));