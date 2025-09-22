import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useSupabaseUsers } from './useSupabaseUsers';
import { Task, TaskNotification } from '../types';

export const useTasks = () => {
  const { user } = useAuth();
  const { users } = useSupabaseUsers();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskNotifications, setTaskNotifications] = useState<TaskNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to get current user ID from public.users table
  const getCurrentUserId = async (): Promise<string> => {
    if (!user?.email) {
      throw new Error('Utilisateur non connecté');
    }

    // First try to find user in the users we already have loaded
    const existingUser = users.find(u => u.email === user.email);
    if (existingUser) {
      return existingUser.id;
    }

    // If not found in loaded users, query directly
    const { data: userData, error } = await supabase
      .from('users')
      .select('id')
      .eq('email', user.email)
      .single();

    if (error || !userData) {
      throw new Error(`Utilisateur avec l'email ${user.email} non trouvé dans la base de données. Veuillez contacter l'administrateur.`);
    }

    return userData.id;
  };

  const loadTasks = async () => {
    if (!user?.email) return;

    setLoading(true);
    setError(null);

    try {
      const currentUserId = await getCurrentUserId();
      console.log('Chargement des tâches utilisateur...');
      
      const { data, error: supabaseError } = await supabase
        .from('user_tasks')
        .select(`
          *,
          related_ticket:tickets(ticket_number, title)
        `)
        .eq('created_by', currentUserId)
        .order('due_date', { ascending: true });

      if (supabaseError) {
        throw supabaseError;
      }

      const formattedTasks: Task[] = (data || []).map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        dueDate: task.due_date,
        status: task.status,
        priority: task.priority,
        createdBy: task.created_by,
        ticketId: task.ticket_id,
        createdAt: task.created_at,
        updatedAt: task.updated_at,
        createdByUser: { 
          name: users.find(u => u.id === task.created_by)?.name || user.email?.split('@')[0] || 'Utilisateur', 
          email: user.email || '' 
        },
        relatedTicket: task.related_ticket
      }));

      console.log('✅ Tâches récupérées:', formattedTasks.length);
      setTasks(formattedTasks);
    } catch (err) {
      console.error('❌ Erreur lors du chargement des tâches:', err);
      setError(`Erreur lors du chargement des tâches: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  const loadTaskNotifications = async () => {
    if (!user?.email) return;

    try {
      const currentUserId = await getCurrentUserId();
      
      const { data, error } = await supabase
        .from('task_notifications')
        .select(`
          *,
          task:user_tasks(
            *,
            related_ticket:tickets(ticket_number, title)
          )
        `)
        .eq('is_sent', false)
        .eq('user_id', currentUserId)
        .lte('notification_date', new Date().toISOString().split('T')[0]);

      if (error) {
        throw error;
      }

      const formattedNotifications: TaskNotification[] = (data || []).map(notification => ({
        id: notification.id,
        taskId: notification.task_id,
        userId: notification.user_id,
        notificationDate: notification.notification_date,
        isSent: notification.is_sent,
        createdAt: notification.created_at,
        task: notification.task ? {
          id: notification.task.id,
          title: notification.task.title,
          description: notification.task.description,
          dueDate: notification.task.due_date,
          status: notification.task.status,
          priority: notification.task.priority,
          createdBy: notification.task.created_by,
          ticketId: notification.task.ticket_id,
          createdAt: notification.task.created_at,
          updatedAt: notification.task.updated_at,
          createdByUser: { name: user.email?.split('@')[0] || 'Utilisateur', email: user.email || '' },
          relatedTicket: notification.task.related_ticket
        } : undefined
      }));

      setTaskNotifications(formattedNotifications);
    } catch (err) {
      console.error('❌ Erreur lors du chargement des notifications de tâches:', err);
    }
  };

  const createTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'createdByUser' | 'relatedTicket'>) => {
    if (!user?.email) {
      throw new Error('Utilisateur non connecté');
    }

    try {
      console.log('🔍 DEBUG - Création de tâche');
      console.log('🔍 User auth ID:', user.id);
      console.log('🔍 User email:', user.email);
      
      const currentUserId = await getCurrentUserId();
      console.log('🔍 Current user ID from users table:', currentUserId);
      
      const { data, error } = await supabase
        .from('user_tasks')
        .insert({
          title: taskData.title,
          description: taskData.description,
          due_date: taskData.dueDate,
          status: taskData.status,
          priority: taskData.priority,
          created_by: currentUserId,
          ticket_id: taskData.ticketId || null
        })
        .select(`
          *,
          related_ticket:tickets(ticket_number, title)
        `)
        .single();

      if (error) {
        console.error('🔍 Erreur Supabase détaillée:', error);
        throw error;
      }

      console.log('✅ Tâche créée avec succès:', data);
      await loadTasks(); // Recharger la liste
      return data;
    } catch (err) {
      console.error('❌ Erreur lors de la création de la tâche:', err);
      throw err;
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>>) => {
    try {
      const currentUserId = await getCurrentUserId();
      
      const updateData: any = {};
      
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.priority !== undefined) updateData.priority = updates.priority;

      const { data, error } = await supabase
        .from('user_tasks')
        .update(updateData)
        .eq('id', taskId)
        .eq('created_by', currentUserId)
        .select(`
          *,
          related_ticket:tickets(ticket_number, title)
        `)
        .single();

      if (error) {
        throw error;
      }

      console.log('✅ Tâche mise à jour avec succès:', data);
      await loadTasks(); // Recharger la liste
    } catch (err) {
      console.error('❌ Erreur lors de la mise à jour de la tâche:', err);
      throw err;
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const currentUserId = await getCurrentUserId();
      
      const { error: supabaseError } = await supabase
        .from('user_tasks')
        .delete()
        .eq('id', taskId)
        .eq('created_by', currentUserId);

      if (supabaseError) {
        throw supabaseError;
      }

      console.log('✅ Tâche supprimée avec succès');
      await loadTasks(); // Recharger la liste
    } catch (err) {
      console.error('❌ Erreur lors de la suppression de la tâche:', err);
      throw err;
    }
  };

  const markNotificationAsSent = async (notificationId: string) => {
    try {
      const { error: supabaseError } = await supabase
        .from('task_notifications')
        .update({ is_sent: true })
        .eq('id', notificationId);

      if (supabaseError) {
        throw supabaseError;
      }

      // Recharger les notifications
      await loadTaskNotifications();
    } catch (err) {
      console.error('❌ Erreur lors de la mise à jour de la notification:', err);
      throw err;
    }
  };

  useEffect(() => {
    if (user) {
      loadTasks();
      loadTaskNotifications();
    }
  }
  )

  return {
    tasks,
    taskNotifications,
    loading,
    error,
    loadTasks,
    loadTaskNotifications,
    createTask,
    updateTask,
    deleteTask,
    markNotificationAsSent
  };
};