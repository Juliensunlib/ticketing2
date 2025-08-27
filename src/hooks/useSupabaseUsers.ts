import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface SupabaseUser {
  id: string;
  email: string;
  name: string;
  user_group: string;
  created_at: string;
  updated_at: string;
}

export const useSupabaseUsers = () => {
  const [users, setUsers] = useState<SupabaseUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('Chargement des utilisateurs depuis Supabase...');
      
      const { data, error: supabaseError } = await supabase
        .from('users')
        .select('*')
        .order('name');

      if (supabaseError) {
        throw supabaseError;
      }

      console.log('✅ Utilisateurs récupérés avec succès:', data?.length || 0);
      setUsers(data || []);
    } catch (err) {
      console.error('❌ Erreur lors de la récupération des utilisateurs:', err);
      setError(`Erreur lors du chargement des utilisateurs: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (userData: Omit<SupabaseUser, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error: supabaseError } = await supabase
        .from('users')
        .insert([userData])
        .select()
        .single();

      if (supabaseError) {
        throw supabaseError;
      }

      console.log('✅ Utilisateur créé avec succès:', data);
      await loadUsers(); // Recharger la liste
      return data;
    } catch (err) {
      console.error('❌ Erreur lors de la création de l\'utilisateur:', err);
      throw err;
    }
  };

  const updateUser = async (userId: string, updates: Partial<Omit<SupabaseUser, 'id' | 'created_at' | 'updated_at'>>) => {
    try {
      const { data, error: supabaseError } = await supabase
        .from('users')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();

      if (supabaseError) {
        throw supabaseError;
      }

      console.log('✅ Utilisateur mis à jour avec succès:', data);
      await loadUsers(); // Recharger la liste
      return data;
    } catch (err) {
      console.error('❌ Erreur lors de la mise à jour de l\'utilisateur:', err);
      throw err;
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const { error: supabaseError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (supabaseError) {
        throw supabaseError;
      }

      console.log('✅ Utilisateur supprimé avec succès');
      await loadUsers(); // Recharger la liste
    } catch (err) {
      console.error('❌ Erreur lors de la suppression de l\'utilisateur:', err);
      throw err;
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  return {
    users,
    loading,
    error,
    loadUsers,
    createUser,
    updateUser,
    deleteUser
  };
};