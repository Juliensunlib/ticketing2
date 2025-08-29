import { useState, useEffect } from 'react';
import { useSupabaseTickets } from './useSupabaseTickets';
import { useAuth } from '../contexts/AuthContext';
import { useAirtable } from './useAirtable';
import { Ticket } from '../types';

// Fonction pour convertir un ticket Supabase vers le format de l'interface
const convertSupabaseTicketToTicket = (supabaseTicket: any, subscribers: any[] = []): Ticket => {
  return {
    id: supabaseTicket.id,
    ticketNumber: supabaseTicket.ticket_number,
    title: supabaseTicket.title,
    description: supabaseTicket.description,
    priority: supabaseTicket.priority,
    status: supabaseTicket.status,
    type: supabaseTicket.type,
    origin: supabaseTicket.origin,
    channel: supabaseTicket.channel,
    createdAt: supabaseTicket.created_at,
    updatedAt: supabaseTicket.updated_at,
    createdBy: supabaseTicket.created_by_user?.name || 'Utilisateur inconnu',
    assignedTo: supabaseTicket.assigned_to,
    subscriberId: supabaseTicket.subscriber_name || 'Aucun abonné',
    installerId: supabaseTicket.installer_id,
    comments: supabaseTicket.comments?.map((comment: any) => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.created_at,
      createdBy: comment.created_by,
      authorName: comment.created_by_user?.name || 'Utilisateur inconnu'
    })) || [],
    attachments: supabaseTicket.attachments?.map((attachment: any) => ({
      id: attachment.id,
      name: attachment.name,
      url: attachment.url,
      type: attachment.type,
      uploadedAt: attachment.uploaded_at,
      uploadedBy: attachment.uploaded_by
    })) || []
  };
};

export const useTickets = () => {
  const { user } = useAuth();
  const { subscribers } = useAirtable();
  const { 
    tickets: supabaseTickets, 
    loading, 
    error,
    createTicket: createSupabaseTicket,
    updateTicket: updateSupabaseTicket,
    addComment: addSupabaseComment,
    addAttachment: addSupabaseAttachment
  } = useSupabaseTickets();
  
  const [tickets, setTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    // Convertir les tickets Supabase vers le format de l'interface
    const convertedTickets = supabaseTickets.map(ticket => 
      convertSupabaseTicketToTicket(ticket, subscribers)
    );
    setTickets(convertedTickets);
  }, [supabaseTickets, subscribers]);

  const createTicket = (ticketData: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'comments' | 'attachments'>) => {
    if (!user) {
      console.error('❌ useTickets.createTicket - Utilisateur non connecté');
      throw new Error('Utilisateur non connecté');
    }

    console.log('🔍 useTickets.createTicket - Données reçues:', ticketData);
    console.log('🔍 useTickets.createTicket - Utilisateur:', user.email);
    console.log('🔍 useTickets.createTicket - ID utilisateur:', user.id);
    
    try {
      const supabaseTicketData = {
        title: ticketData.title,
        description: ticketData.description,
        priority: ticketData.priority,
        status: ticketData.status,
        type: ticketData.type,
        origin: ticketData.origin,
        channel: ticketData.channel,
        created_by: user.id,
        assigned_to: ticketData.assignedTo || null,
        subscriber_id: ticketData.subscriberId,
        subscriber_name: ticketData.subscriberId, // Le nom complet est déjà dans subscriberId
        installer_id: ticketData.installerId || null
      };

      console.log('🔍 useTickets.createTicket - Données Supabase:', supabaseTicketData);
      
      return createSupabaseTicket(supabaseTicketData).then((createdTicket) => {
        console.log('✅ Ticket créé avec le numéro:', createdTicket?.ticket_number);
        return createdTicket;
      });
    } catch (error) {
      console.error('❌ useTickets.createTicket - Erreur lors de la préparation:', error);
      throw error;
    }
  };

  const updateTicket = (ticketId: string, updates: Partial<Ticket>) => {
    console.log('🔄 Mise à jour ticket:', ticketId);
    console.log('📝 Changements:', updates);
    
    // Conversion simple et directe vers le format Supabase
    const supabaseUpdates: any = {};
    
    if (updates.title !== undefined) supabaseUpdates.title = updates.title;
    if (updates.description !== undefined) supabaseUpdates.description = updates.description;
    if (updates.priority !== undefined) supabaseUpdates.priority = updates.priority;
    if (updates.status !== undefined) supabaseUpdates.status = updates.status;
    if (updates.type !== undefined) supabaseUpdates.type = updates.type;
    if (updates.origin !== undefined) supabaseUpdates.origin = updates.origin;
    if (updates.channel !== undefined) supabaseUpdates.channel = updates.channel;
    if (updates.assignedTo !== undefined) {
      supabaseUpdates.assigned_to = updates.assignedTo === '' ? null : updates.assignedTo;
    }
    if (updates.subscriberId !== undefined) {
      supabaseUpdates.subscriber_id = updates.subscriberId;
      supabaseUpdates.subscriber_name = updates.subscriberId;
    }
    if (updates.installerId !== undefined) {
      supabaseUpdates.installer_id = updates.installerId;
    }
    
    // Gérer les updates qui arrivent déjà au format Supabase
    if ('assigned_to' in updates) supabaseUpdates.assigned_to = updates.assigned_to;
    if ('subscriber_name' in updates) supabaseUpdates.subscriber_name = updates.subscriber_name;
    
    console.log('🔧 Données converties:', supabaseUpdates);
    return updateSupabaseTicket(ticketId, supabaseUpdates);
  };

  const addComment = (ticketId: string, content: string) => {
    return addSupabaseComment(ticketId, content).then((newComment) => {
      // Mettre à jour localement la liste des tickets pour affichage immédiat
      setTickets(prevTickets => 
        prevTickets.map(ticket => 
          ticket.id === ticketId 
            ? {
                ...ticket,
                comments: [
                  ...ticket.comments,
                  {
                    id: newComment.id,
                    content: newComment.content,
                    createdAt: newComment.created_at,
                    createdBy: newComment.created_by,
                    authorName: newComment.created_by_user?.name || 'Utilisateur inconnu'
                  }
                ]
              }
            : ticket
        )
      );
      return newComment;
    });
  };

  const addAttachment = (ticketId: string, attachment: Omit<Ticket['attachments'][0], 'id' | 'uploadedAt'>) => {
    if (!user) {
      throw new Error('Utilisateur non connecté');
    }

    return addSupabaseAttachment(ticketId, {
      name: attachment.name,
      url: attachment.url,
      type: attachment.type,
      uploaded_by: user.id
    });
  };

  return {
    tickets,
    loading,
    error,
    createTicket,
    updateTicket,
    addComment,
    addAttachment
  };
};