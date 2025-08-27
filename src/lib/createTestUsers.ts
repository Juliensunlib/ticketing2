import { supabase } from './supabase';

export const createTestUsers = async () => {
  try {
    // Vérifier si les utilisateurs de test existent déjà
    const { data: existingUsers } = await supabase
      .from('users')
      .select('email')
      .in('email', ['admin@sunlib.fr', 'marie.dubois@sunlib.fr']);

    if (existingUsers && existingUsers.length >= 2) {
      console.log('Les utilisateurs de test existent déjà');
      return;
    }

    // Créer l'utilisateur admin
    const { error: adminError } = await supabase.auth.admin.createUser({
      email: 'admin@sunlib.fr',
      password: 'admin123',
      email_confirm: true,
      user_metadata: {
        name: 'Administrateur SunLib',
        user_group: 'admin'
      }
    });

    if (adminError && !adminError.message.includes('already registered')) {
      console.error('Erreur création admin:', adminError);
    }

    // Créer l'utilisateur support
    const { error: supportError } = await supabase.auth.admin.createUser({
      email: 'marie.dubois@sunlib.fr',
      password: 'support123',
      email_confirm: true,
      user_metadata: {
        name: 'Marie Dubois',
        user_group: 'support'
      }
    });

    if (supportError && !supportError.message.includes('already registered')) {
      console.error('Erreur création support:', supportError);
    }

    console.log('Utilisateurs de test créés avec succès');
  } catch (error) {
    console.error('Erreur lors de la création des utilisateurs de test:', error);
  }
};