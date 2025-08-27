import { useState, useEffect } from 'react';
import AirtableService from '../services/airtable';
import { Subscriber } from '../types';
import { useAuth } from '../contexts/AuthContext';

// Configuration depuis les variables d'environnement
const getAirtableConfig = () => {
  const apiKey = import.meta.env.VITE_AIRTABLE_API_KEY;
  const subscribersBaseId = import.meta.env.VITE_AIRTABLE_SUBSCRIBERS_BASE_ID;

  console.log('🔧 Variables d\'environnement Airtable:');
  console.log('🔧 API Key présente:', !!apiKey);
  console.log('🔧 Base ID présente:', !!subscribersBaseId);
  console.log('🔧 API Key (début):', apiKey ? apiKey.substring(0, 10) + '...' : 'MANQUANTE');
  console.log('🔧 Base ID:', subscribersBaseId || 'MANQUANTE');

  if (!apiKey || !subscribersBaseId || apiKey === 'votre_clé_api_airtable' || subscribersBaseId === 'id_de_votre_base_abonnés') {
    console.warn('⚠️ Configuration Airtable incomplète. Variables Vercel non configurées ou invalides.');
    return null;
  }

  return { apiKey, subscribersBaseId };
};

export const useAirtable = () => {
  const { user } = useAuth();
  const [airtableService, setAirtableService] = useState<AirtableService | null>(null);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  
  // Debug: Afficher l'utilisateur connecté
  useEffect(() => {
    if (user) {
      console.log('👤 Utilisateur connecté pour Airtable:', user.email);
    }
  }, [user]);

  useEffect(() => {
    const config = getAirtableConfig();
    if (config) {
      console.log('🔧 Configuration Airtable détectée pour:', user?.email || 'utilisateur inconnu');
      const service = new AirtableService(config.apiKey, config.subscribersBaseId);
      setAirtableService(service);
      // Charger les données immédiatement
      console.log('🔄 Chargement automatique des abonnés Airtable pour:', user?.email || 'utilisateur inconnu');
      loadDataWithService(service);
    } else {
      console.warn('⚠️ Configuration Airtable manquante pour:', user?.email || 'utilisateur inconnu');
      setError('Configuration Airtable manquante. Vérifiez les variables d\'environnement Vercel.');
    }
  }, [user]);

  const loadDataWithService = async (service: AirtableService, isRetry = false) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`📋 ${isRetry ? 'Nouvelle tentative' : 'Récupération'} des abonnés depuis Airtable pour:`, user?.email || 'utilisateur inconnu');
      console.log('🔄 Tentative', retryCount + 1, 'sur', maxRetries);
      
      const subscribersData = await service.getSubscribers();
      console.log(`🎉 SUCCÈS: ${subscribersData.length} abonnés récupérés avec succès depuis Airtable pour:`, user?.email || 'utilisateur inconnu');

      setSubscribers(subscribersData);
      setRetryCount(0); // Reset retry count on success
      
    } catch (err) {
      console.error('❌ Erreur lors du chargement des abonnés pour:', user?.email || 'utilisateur inconnu', err);
      
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      
      // Retry logic
      if (retryCount < maxRetries - 1 && !errorMessage.includes('401') && !errorMessage.includes('403')) {
        console.log(`🔄 Tentative de retry dans 2 secondes... (${retryCount + 1}/${maxRetries})`);
        setRetryCount(prev => prev + 1);
        setTimeout(() => {
          loadDataWithService(service, true);
        }, 2000);
        return;
      }
      
      setError(`Erreur Airtable pour ${user?.email}: ${errorMessage}`);
      setSubscribers([]);
      setRetryCount(0);
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    if (!airtableService) {
      console.warn('⚠️ Service Airtable non initialisé pour:', user?.email || 'utilisateur inconnu');
      setError('Service Airtable non configuré. Vérifiez les variables d\'environnement Vercel.');
      return;
    }

    setRetryCount(0); // Reset retry count for manual reload
    await loadDataWithService(airtableService);
  };

  const forceReload = async () => {
    console.log('🔄 Rechargement forcé des données Airtable pour:', user?.email || 'utilisateur inconnu');
    setLoading(true);
    setError(null);
    setRetryCount(0);
    setSubscribers([]); // Clear current data

    if (airtableService) {
      await loadDataWithService(airtableService);
    } else {
      setError('Service Airtable non disponible');
      setLoading(false);
    }
  };

  const createTicket = async (ticketData: any) => {
    if (!airtableService) {
      console.warn('Service Airtable non configuré, ticket créé uniquement dans Supabase');
      return null;
    }
    return await airtableService.createTicketRecord(ticketData);
  };

  const updateTicket = async (recordId: string, ticketData: any) => {
    if (!airtableService) {
      console.warn('Service Airtable non configuré, mise à jour uniquement dans Supabase');
      return null;
    }
    return await airtableService.updateTicketRecord(recordId, ticketData);
  };

  return {
    subscribers,
    loading,
    error,
    loadData,
    forceReload,
    createTicket,
    updateTicket,
    retryCount,
    maxRetries,
  };
};