export interface Ticket {
  id: string;
  title: string;
  description: string;
  priority: 'Haute' | 'Moyenne' | 'Basse';
  status: 'Nouveau' | 'En attente du client' | 'En attente de l\'installateur' | 'En attente retour service technique' | 'Fermé' | 'Ouvert';
  type: 'SAV / question technique' | 'Recouvrement' | 'Plainte Installateur' | 'changement date prélèvement/RIB' | 'Résiliation anticipée / cession de contrat' | 'Ajout contrat / Flexibilité';
  origin: 'Installateur' | 'SunLib' | 'Abonné';
  channel: 'Mail' | 'Téléphone' | 'Formulaire de contact' | 'Site abonné' | 'Application SunLib';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  assignedTo?: string;
  subscriberId?: string;
  installerId?: string;
  comments: Comment[];
  attachments: Attachment[];
}

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  createdBy: string;
  authorName: string;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface Subscriber {
  id: string;
  nom: string;
  prenom: string;
  contratAbonne: string;
  nomEntreprise?: string;
  installateur?: string;
  lienCRM?: string;
  email?: string;
  telephone?: string;
}

export interface AirtableConfig {
  apiKey: string;
  nom: string;
  prenom: string;
  contratAbonne: string; // SL-000001 format
  nomEntreprise?: string; // from Installateur
}