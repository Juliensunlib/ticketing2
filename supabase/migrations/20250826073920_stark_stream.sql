/*
  # Création de la table tickets et commentaires

  1. Nouvelles Tables
    - `tickets`
      - `id` (uuid, primary key)
      - `title` (text, titre du ticket)
      - `description` (text, description détaillée)
      - `priority` (text, Haute/Moyenne/Basse)
      - `status` (text, Ouvert/En cours/Résolu/Fermé)
      - `type` (text, installation/maintenance/facturation/autre)
      - `origin` (text, Installateur/SunLib/Abonné)
      - `channel` (text, canal d'entrée)
      - `created_by` (uuid, référence vers users)
      - `assigned_to` (uuid, référence vers users)
      - `subscriber_id` (text, ID de l'abonné Airtable)
      - `installer_id` (text, ID de l'installateur Airtable)
      - `airtable_record_id` (text, ID du record Airtable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `ticket_comments`
      - `id` (uuid, primary key)
      - `ticket_id` (uuid, référence vers tickets)
      - `content` (text, contenu du commentaire)
      - `created_by` (uuid, référence vers users)
      - `created_at` (timestamp)
    
    - `ticket_attachments`
      - `id` (uuid, primary key)
      - `ticket_id` (uuid, référence vers tickets)
      - `name` (text, nom du fichier)
      - `url` (text, URL du fichier)
      - `type` (text, type MIME)
      - `uploaded_by` (uuid, référence vers users)
      - `uploaded_at` (timestamp)

  2. Sécurité
    - Enable RLS sur toutes les tables
    - Politiques pour lecture/écriture selon les rôles
    - Contraintes de validation

  3. Index
    - Index sur les colonnes fréquemment utilisées
    - Index pour les recherches et filtres
*/

-- Table des tickets
CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  priority text NOT NULL DEFAULT 'Moyenne' CHECK (priority IN ('Haute', 'Moyenne', 'Basse')),
  status text NOT NULL DEFAULT 'Ouvert' CHECK (status IN ('Ouvert', 'En cours', 'Résolu', 'Fermé')),
  type text NOT NULL DEFAULT 'autre' CHECK (type IN ('installation', 'maintenance', 'facturation', 'autre')),
  origin text NOT NULL DEFAULT 'SunLib' CHECK (origin IN ('Installateur', 'SunLib', 'Abonné')),
  channel text NOT NULL DEFAULT 'Formulaire de contact' CHECK (channel IN ('Mail', 'Téléphone', 'Formulaire de contact', 'Site abonné', 'Application SunLib')),
  created_by uuid REFERENCES users(id),
  assigned_to uuid REFERENCES users(id),
  subscriber_id text,
  installer_id text,
  airtable_record_id text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des commentaires
CREATE TABLE IF NOT EXISTS ticket_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- Table des pièces jointes
CREATE TABLE IF NOT EXISTS ticket_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  name text NOT NULL,
  url text NOT NULL,
  type text,
  uploaded_by uuid REFERENCES users(id),
  uploaded_at timestamptz DEFAULT now()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON tickets(created_by);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_tickets_airtable_record_id ON tickets(airtable_record_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id ON ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket_id ON ticket_attachments(ticket_id);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour updated_at sur tickets
DROP TRIGGER IF EXISTS update_tickets_updated_at ON tickets;
CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_attachments ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour tickets
CREATE POLICY "Authenticated users can read all tickets"
  ON tickets
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create tickets"
  ON tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update tickets they created or are assigned to"
  ON tickets
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() OR assigned_to = auth.uid());

CREATE POLICY "Service role has full access to tickets"
  ON tickets
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Politiques RLS pour commentaires
CREATE POLICY "Authenticated users can read all comments"
  ON ticket_comments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON ticket_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own comments"
  ON ticket_comments
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Service role has full access to comments"
  ON ticket_comments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Politiques RLS pour pièces jointes
CREATE POLICY "Authenticated users can read all attachments"
  ON ticket_attachments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create attachments"
  ON ticket_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own attachments"
  ON ticket_attachments
  FOR UPDATE
  TO authenticated
  USING (uploaded_by = auth.uid());

CREATE POLICY "Service role has full access to attachments"
  ON ticket_attachments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);