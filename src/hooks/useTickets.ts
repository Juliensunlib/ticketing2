import { useState, useEffect } from 'react';
import { useSupabaseTickets } from './useSupabaseTickets';
import { useAuth } from '../contexts/AuthContext';
import { useAirtable } from './useAirtable';
import { Ticket } from '../types';

// Fonction pour convertir un ticket Supabase vers le format de l'interface
const convertSupabaseTicketToTicket = (supabaseTicket: any, subscribers: any[] = []): Ticket => {
  return {
    id: supabaseTicket.id,
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
      throw new Error('Utilisateur non connecté');
    }

    const supabaseTicketData = {
      title: ticketData.title,
      description: ticketData.description,
      priority: ticketData.priority,
      status: ticketData.status,
      type: ticketData.type,
      origin: ticketData.origin,
      channel: ticketData.channel,
      created_by: user.id,
      assigned_to: ticketData.assignedTo,
      subscriber_id: ticketData.subscriberId,
      subscriber_name: ticketData.subscriberId, // Le nom complet est déjà dans subscriberId
      installer_id: ticketData.installerId
    };

    return createSupabaseTicket(supabaseTicketData);
  };

  const updateTicket = (ticketId: string, updates: Partial<Ticket>) => {
    console.log('🔍 useTickets.updateTicket - ID:', ticketId);
    console.log('🔍 useTickets.updateTicket - Updates:', updates);
    
    // Si les updates contiennent déjà les noms de colonnes Supabase, les utiliser directement
    let supabaseUpdates;
    if ('assigned_to' in updates || 'subscriber_id' in updates) {
      // Données déjà au format Supabase
      supabaseUpdates = updates;
    } else {
      // Conversion du format interface vers Supabase
      supabaseUpdates = {
        title: updates.title,
        description: updates.description,
        priority: updates.priority,
        status: updates.status,
        type: updates.type,
        origin: updates.origin,
        channel: updates.channel,
        assigned_to: updates.assignedTo === '' ? null : updates.assignedTo,
        subscriber_id: updates.subscriberId,
        installer_id: updates.installerId
      };
    }

    // Supprimer les propriétés undefined
    Object.keys(supabaseUpdates).forEach(key => {
      if (supabaseUpdates[key as keyof typeof supabaseUpdates] === undefined) {
        delete supabaseUpdates[key as keyof typeof supabaseUpdates];
      }
    });

    console.log('🔍 useTickets.updateTicket - Données Supabase:', supabaseUpdates);
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