import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAirtable } from './useAirtable';
import { useAuth } from '../contexts/AuthContext';

export interface SupabaseTicket {
  id: string;
  ticket_number: number;
  title: string;
  description: string;
  priority: 'Haute' | 'Moyenne' | 'Basse';
  status: 'Nouveau' | 'En attente du client' | 'En attente de l\'installateur' | 'En attente retour service technique' | 'Fermé' | 'En cours Service Client';
  type: 'SAV / question technique' | 'Recouvrement' | 'Plainte Installateur' | 'changement date prélèvement/RIB' | 'Résiliation anticipée / cession de contrat' | 'Ajout contrat / Flexibilité';
  origin: 'Installateur' | 'SunLib' | 'Abonné';
  channel: 'Mail' | 'Téléphone' | 'Formulaire de contact' | 'Site abonné' | 'Application SunLib';
  created_by: string;
  assigned_to?: string;
  subscriber_id?: string;
  subscriber_name?: string;
  installer_id?: string;
  airtable_record_id?: string;
  created_at: string;
  updated_at: string;
  comments?: SupabaseTicketComment[];
  attachments?: SupabaseTicketAttachment[];
  created_by_user?: {
    name: string;
    email: string;
  };
  assigned_to_user?: {
    name: string;
    email: string;
  };
}

export interface SupabaseTicketComment {
  id: string;
  ticket_id: string;
  content: string;
  created_by: string;
  created_at: string;
  created_by_user?: {
    name: string;
    email: string;
  };
}

export interface SupabaseTicketAttachment {
  id: string;
  ticket_id: string;
  name: string;
  url: string;
  type?: string;
  uploaded_by: string;
  uploaded_at: string;
  uploaded_by_user?: {
    name: string;
    email: string;
  };
}

export const useSupabaseTickets = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupabaseTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { createTicket: createAirtableTicket } = useAirtable();

  const loadTickets = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('Chargement des tickets depuis Supabase...');
      
      const { data, error: supabaseError } = await supabase
        .from('tickets')
        .select(`
          *,
          created_by_user:users!tickets_created_by_fkey(name, email),
          assigned_to_user:users!tickets_assigned_to_fkey(name, email),
          comments:ticket_comments(
            *,
            created_by_user:users!ticket_comments_created_by_fkey(name, email)
          ),
          attachments:ticket_attachments(
            *,
            uploaded_by_user:users!ticket_attachments_uploaded_by_fkey(name, email)
          )
        `)
        .order('created_at', { ascending: false });

      if (supabaseError) {
        throw supabaseError;
      }

      console.log('✅ Tickets récupérés avec succès:', data?.length || 0);
      setTickets(data || []);
    } catch (err) {
      console.error('❌ Erreur lors de la récupération des tickets:', err);
      setError(`Erreur lors du chargement des tickets: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  const createTicket = async (ticketData: Omit<SupabaseTicket, 'id' | 'created_at' | 'updated_at' | 'comments' | 'attachments'>) => {
    try {
      if (!user) {
        console.error('❌ useSupabaseTickets.createTicket - Utilisateur non connecté');
        throw new Error('Utilisateur non connecté');
      }

      console.log('🔍 useSupabaseTickets.createTicket - Début création');
      console.log('Recherche de l\'utilisateur par email:', user.email);
      console.log('🔍 Auth user complet:', user);

      // Chercher l'utilisateur existant par email
      const { data: existingUser, error: findError } = await supabase
        .from('users')
        .select('id')
        .eq('email', user.email)
        .maybeSingle();

      if (findError) {
        console.error('Erreur lors de la recherche de l\'utilisateur:', findError);
        console.error('❌ Détails findError:', JSON.stringify(findError, null, 2));
        throw new Error(`Impossible de trouver l\'utilisateur: ${findError.message}`);
      }

      if (!existingUser) {
        console.error('❌ Utilisateur non trouvé dans la table users');
        console.error('❌ Email recherché:', user.email);
        
        // Lister tous les utilisateurs pour debug
        const { data: allUsers } = await supabase.from('users').select('id, email, name');
        console.log('❌ Utilisateurs disponibles:', allUsers);
        
        throw new Error(`Utilisateur avec l'email ${user.email} non trouvé dans la table users. Veuillez contacter l'administrateur.`);
      }

      console.log('✅ Utilisateur trouvé avec ID:', existingUser.id);

      // Utiliser l'ID de la table users au lieu de l'ID d'authentification
      const ticketDataWithCorrectUserId = {
        ...ticketData,
        created_by: existingUser.id
      };

      console.log('🔍 Données finales pour insertion:', ticketDataWithCorrectUserId);
      console.log('Création du ticket dans Supabase...');
      
      const { data, error: supabaseError } = await supabase
        .from('tickets')
        .insert([{
          ...ticketDataWithCorrectUserId,
          subscriber_name: ticketData.subscriber_name
        }])
        .select(`
          *,
          created_by_user:users!tickets_created_by_fkey(name, email),
          assigned_to_user:users!tickets_assigned_to_fkey(name, email)
        `)
        .single();

      if (supabaseError) {
        console.error('❌ Erreur Supabase lors de l\'insertion:', supabaseError);
        console.error('❌ Code erreur:', supabaseError.code);
        console.error('❌ Message erreur:', supabaseError.message);
        console.error('❌ Détails erreur:', supabaseError.details);
        console.error('❌ Hint erreur:', supabaseError.hint);
        throw supabaseError;
      }

      console.log('✅ Ticket créé dans Supabase:', data);

      // Synchroniser avec Airtable
      // Synchronisation Airtable désactivée temporairement
      console.log('ℹ️ Synchronisation Airtable désactivée pour le moment');

      console.log('🔄 Rechargement de la liste des tickets...');
      await loadTickets(); // Recharger la liste
      console.log('✅ Liste des tickets rechargée');
      return data;
    } catch (err) {
      console.error('❌ Erreur lors de la création du ticket:', err);
      console.error('❌ Type d\'erreur dans useSupabaseTickets:', typeof err);
      console.error('❌ Erreur complète dans useSupabaseTickets:', JSON.stringify(err, null, 2));
      throw err;
    }
  };

  const updateTicket = async (ticketId: string, updates: Partial<Omit<SupabaseTicket, 'id' | 'created_at' | 'updated_at'>>) => {
    try {
      console.log('🔄 Mise à jour du ticket:', ticketId);
      console.log('📝 Données à mettre à jour:', updates);
      
      // Nettoyer les données - supprimer les valeurs undefined et null
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, value]) => value !== undefined)
      );
      
      console.log('🧹 Données nettoyées:', cleanUpdates);
      
      const { data, error } = await supabase
        .from('tickets')
        .update(cleanUpdates)
        .eq('id', ticketId)
        .select('*');

      if (error) {
        console.error('❌ Erreur Supabase:', error);
        throw new Error(`Erreur de mise à jour: ${error.message}`);
      }

      console.log('✅ Mise à jour réussie');
      
      // Recharger les tickets
      await loadTickets();
      return data?.[0] || null;
      
    } catch (err) {
      console.error('❌ Erreur mise à jour:', err);
      throw err;
    }
  };

  const addComment = async (ticketId: string, content: string) => {
    try {
      if (!user) {
        throw new Error('Utilisateur non connecté');
      }

      console.log('🔍 Ajout commentaire pour ticket ID:', ticketId);

      console.log('Recherche de l\'utilisateur par email:', user.email);

      // Chercher l'utilisateur existant par email
      const { data: existingUser, error: findError } = await supabase
        .from('users')
        .select('id')
        .eq('email', user.email)
        .maybeSingle();

      if (findError) {
        console.error('Erreur lors de la recherche de l\'utilisateur:', findError);
        throw new Error(`Impossible de trouver l\'utilisateur: ${findError.message}`);
      }

      if (!existingUser) {
        throw new Error(`Utilisateur avec l'email ${user.email} non trouvé dans la table users. Veuillez contacter l'administrateur.`);
      }

      console.log('✅ Utilisateur trouvé avec ID:', existingUser.id);

      const { data, error: supabaseError } = await supabase
        .from('ticket_comments')
        .insert([{
          ticket_id: ticketId,
          content,
          created_by: existingUser.id
        }])
        .select(`
          *,
          created_by_user:users!ticket_comments_created_by_fkey(name, email)
        `)
        .single();

      if (supabaseError) {
        throw supabaseError;
      }

      console.log('✅ Commentaire ajouté avec succès:', data);
      return data;
    } catch (err) {
      console.error('❌ Erreur lors de l\'ajout du commentaire:', err);
      throw err;
    }
  };

  const addAttachment = async (ticketId: string, attachment: Omit<SupabaseTicketAttachment, 'id' | 'ticket_id' | 'uploaded_at'>) => {
    try {
      const { data, error: supabaseError } = await supabase
        .from('ticket_attachments')
        .insert([{
          ticket_id: ticketId,
          ...attachment
        }])
        .select(`
          *,
          uploaded_by_user:users!ticket_attachments_uploaded_by_fkey(name, email)
        `)
        .single();

      if (supabaseError) {
        throw supabaseError;
      }

      console.log('✅ Pièce jointe ajoutée avec succès:', data);
      await loadTickets(); // Recharger la liste
      return data;
    } catch (err) {
      console.error('❌ Erreur lors de l\'ajout de la pièce jointe:', err);
      throw err;
    }
  };

  const deleteTicket = async (ticketId: string) => {
    try {
      const { error: supabaseError } = await supabase
        .from('tickets')
        .delete()
        .eq('id', ticketId);

      if (supabaseError) {
        throw supabaseError;
      }

      console.log('✅ Ticket supprimé avec succès');
      await loadTickets(); // Recharger la liste
    } catch (err) {
      console.error('❌ Erreur lors de la suppression du ticket:', err);
      throw err;
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  return {
    tickets,
    loading,
    error,
    loadTickets,
    createTicket,
    updateTicket,
    addComment,
    addAttachment,
    deleteTicket
  };
};