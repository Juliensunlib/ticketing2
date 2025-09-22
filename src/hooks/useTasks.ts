import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Task, TaskNotification } from '../types';

export const useTasks = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskNotifications, setTaskNotifications] = useState<TaskNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      console.log('Chargement des tâches utilisateur...');
      
      // Récupérer l'utilisateur depuis la table users
      const { data: currentUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', user.email)
        .single();

      if (!currentUser) {
        throw new Error('Utilisateur non trouvé');
      }

      const { data, error: supabaseError } = await supabase
        .from('user_tasks')
        .select(`
          *,
          created_by_user:users!user_tasks_created_by_fkey(name, email),
          related_ticket:tickets(ticket_number, title)
        `)
        .eq('created_by', currentUser.id)
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
        createdByUser: task.created_by_user,
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
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error: supabaseError } = await supabase
        .from('task_notifications')
        .select(`
          *,
          task:user_tasks(
            *,
            created_by_user:users!user_tasks_created_by_fkey(name, email),
            related_ticket:tickets(ticket_number, title)
          )
        `)
        .eq('user_id', user.id)
        .eq('notification_date', today)
        .eq('is_sent', false);

      if (supabaseError) {
        throw supabaseError;
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
          createdByUser: notification.task.created_by_user,
          relatedTicket: notification.task.related_ticket
        } : undefined
      }));

      setTaskNotifications(formattedNotifications);
    } catch (err) {
      console.error('❌ Erreur lors du chargement des notifications de tâches:', err);
    }
  };

  const createTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'createdByUser' | 'relatedTicket'>) => {
    if (!user) {
      throw new Error('Utilisateur non connecté');
    }

    try {
      const { data, error: supabaseError } = await supabase
        .from('user_tasks')
        .insert([{
          title: taskData.title,
          description: taskData.description,
          due_date: taskData.dueDate,
          status: taskData.status,
          priority: taskData.priority,
          created_by: user.id,
          ticket_id: taskData.ticketId || null
        }])
        .select(`
          *,
          created_by_user:users!user_tasks_created_by_fkey(name, email),
          related_ticket:tickets(ticket_number, title)
        `)
        .single();

      if (supabaseError) {
        throw supabaseError;
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
      const updateData: any = {};
      
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.priority !== undefined) updateData.priority = updates.priority;

      const { data, error: supabaseError } = await supabase
        .from('user_tasks')
        .update(updateData)
        .eq('id', taskId)
        .eq('created_by', user.id)
        .select(`
          *,
          created_by_user:users!user_tasks_created_by_fkey(name, email),
          related_ticket:tickets(ticket_number, title)
        `)
        .single();

      if (supabaseError) {
        throw supabaseError;
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
      const { error: supabaseError } = await supabase
        .from('user_tasks')
        .delete()
        .eq('id', taskId);

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
  }, [user]);

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