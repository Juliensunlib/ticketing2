import { useState, useEffect } from 'react';
import { useTickets } from './useTickets';
import { useTasks } from './useTasks';
import { useAuth } from '../contexts/AuthContext';
import { useSupabaseUsers } from './useSupabaseUsers';
import { Ticket } from '../types';

export interface Notification {
  id: string;
  ticketId: string;
  ticketNumber: number;
  title: string;
  subscriberName: string;
  type: 'assignment' | 'mention' | 'status_change';
  message: string;
  isRead: boolean;
  createdAt: string;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const { users } = useSupabaseUsers();
  const { tickets } = useTickets();
  const { tasks, taskNotifications } = useTasks();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [lastCheckedTickets, setLastCheckedTickets] = useState<string[]>([]);

  // Trouver l'utilisateur actuel dans la liste des utilisateurs
  const currentUser = users.find(u => u.email === user?.email);

  useEffect(() => {
    if (!currentUser || !tickets.length) return;

    // Récupérer les notifications stockées
    const storedNotifications = localStorage.getItem(`notifications_${currentUser.id}`);
    const existingNotifications: Notification[] = storedNotifications 
      ? JSON.parse(storedNotifications) 
      : [];

    // Récupérer les tickets déjà vérifiés
    const storedCheckedTickets = localStorage.getItem(`checked_tickets_${currentUser.id}`);
    const checkedTickets: string[] = storedCheckedTickets 
      ? JSON.parse(storedCheckedTickets) 
      : [];

    // Trouver les nouveaux tickets assignés à l'utilisateur
    const newAssignedTickets = tickets.filter(ticket => 
      ticket.assignedTo === currentUser.id && 
      !checkedTickets.includes(ticket.id)
    );

    // Créer des notifications pour les nouveaux tickets assignés
    const newNotifications: Notification[] = newAssignedTickets.map(ticket => ({
      id: `assignment_${ticket.id}_${Date.now()}`,
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      title: ticket.title,
      subscriberName: ticket.subscriberId || 'Client inconnu',
      type: 'assignment',
      message: `Nouveau ticket assigné : ${ticket.title}`,
      isRead: false,
      createdAt: new Date().toISOString()
    }));

    // Ajouter les notifications de tâches
    const today = new Date().toISOString().split('T')[0];
    const todayTasks = tasks.filter(task => 
      task.dueDate === today && 
      task.status !== 'completed' && 
      task.status !== 'cancelled'
    );

    console.log('🔍 DEBUG Notifications tâches:');
    console.log('🔍 Date aujourd\'hui:', today);
    console.log('🔍 Toutes les tâches:', tasks);
    console.log('🔍 Tâches pour aujourd\'hui:', todayTasks);
    console.log('🔍 Task notifications from DB:', taskNotifications);

    const taskNotifs: Notification[] = todayTasks.map(task => ({
      id: `task_${task.id}`,
      ticketId: '',
      ticketNumber: 0,
      title: task.title,
      subscriberName: 'Tâche personnelle',
      type: 'mention',
      message: `Tâche à réaliser aujourd'hui : ${task.title}`,
      isRead: false,
      createdAt: task.createdAt
    }));

    console.log('🔍 Notifications de tâches créées:', taskNotifs);

    // Fusionner avec les notifications existantes
    const allNotifications = [...existingNotifications, ...newNotifications, ...taskNotifs];

    // Nettoyer les notifications des tickets qui n'existent plus
    const validNotifications = allNotifications.filter(notification =>
      notification.ticketId === '' || tickets.some(ticket => ticket.id === notification.ticketId)
    );

    // Mettre à jour l'état
    setNotifications(validNotifications);
    
    // Mettre à jour la liste des tickets vérifiés
    const allTicketIds = tickets.map(t => t.id);
    setLastCheckedTickets(allTicketIds);

    // Sauvegarder dans localStorage
    localStorage.setItem(`notifications_${currentUser.id}`, JSON.stringify(validNotifications));
    localStorage.setItem(`checked_tickets_${currentUser.id}`, JSON.stringify(allTicketIds));

  }, [tickets, taskNotifications, currentUser]);

  const markAsRead = (notificationId: string) => {
    if (!currentUser) return;

    const updatedNotifications = notifications.map(notification =>
      notification.id === notificationId
        ? { ...notification, isRead: true }
        : notification
    );

    setNotifications(updatedNotifications);
    localStorage.setItem(`notifications_${currentUser.id}`, JSON.stringify(updatedNotifications));
  };

  const markAllAsRead = () => {
    if (!currentUser) return;

    const updatedNotifications = notifications.map(notification => ({
      ...notification,
      isRead: true
    }));

    setNotifications(updatedNotifications);
    localStorage.setItem(`notifications_${currentUser.id}`, JSON.stringify(updatedNotifications));
  };

  const clearNotification = (notificationId: string) => {
    if (!currentUser) return;

    const updatedNotifications = notifications.filter(notification =>
      notification.id !== notificationId
    );

    setNotifications(updatedNotifications);
    localStorage.setItem(`notifications_${currentUser.id}`, JSON.stringify(updatedNotifications));
  };

  const clearAllNotifications = () => {
    if (!currentUser) return;

    setNotifications([]);
    localStorage.setItem(`notifications_${currentUser.id}`, JSON.stringify([]));
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications
  };
};