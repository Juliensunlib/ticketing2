import { useState, useEffect } from 'react';
import AirtableService from '../services/airtable';
import { Subscriber } from '../types';

// Configuration depuis les variables d'environnement
const getAirtableConfig = () => {
  const apiKey = import.meta.env.VITE_AIRTABLE_API_KEY;
  const subscribersBaseId = import.meta.env.VITE_AIRTABLE_SUBSCRIBERS_BASE_ID;

  if (!apiKey || !subscribersBaseId || apiKey === 'votre_clé_api_airtable' || subscribersBaseId === 'id_de_votre_base_abonnés') {
    console.warn('Configuration Airtable incomplète. Vérifiez votre fichier .env');
    return null;
  }

  return { apiKey, subscribersBaseId };
};

export const useAirtable = () => {
  const [airtableService, setAirtableService] = useState<AirtableService | null>(null);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  

  useEffect(() => {
    const config = getAirtableConfig();
    if (config) {
      const service = new AirtableService(config.apiKey, config.subscribersBaseId);
      setAirtableService(service);
      // Charger les données immédiatement
      console.log('🔄 Chargement automatique des abonnés Airtable...');
      loadDataWithService(service);
    } else {
      console.warn('Configuration Airtable manquante');
      setError('Configuration Airtable manquante. Vérifiez le fichier .env');
    }
  }, []);

  const loadDataWithService = async (service: AirtableService) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('📋 Récupération des abonnés depuis Airtable...');
      const subscribersData = await service.getSubscribers();
      console.log(`✅ ${subscribersData.length} abonnés récupérés avec succès`);

      setSubscribers(subscribersData);
      
    } catch (err) {
      console.error('❌ Erreur lors du chargement des abonnés:', err);
      setError(`Erreur Airtable: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
      setSubscribers([]); // S'assurer que la liste est vide en cas d'erreur
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    if (!airtableService) {
      console.warn('Service Airtable non initialisé. Vérifiez la configuration dans le fichier .env');
      setError('Service Airtable non configuré. Ajoutez vos clés API dans le fichier .env');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Rechargement des données Airtable...');
      
      const subscribersData = await airtableService.getSubscribers();

      console.log('Abonnés récupérés:', subscribersData);

      setSubscribers(subscribersData);
    } catch (err) {
      console.error('Erreur lors du chargement des données Airtable:', err);
      if (err instanceof Error && err.message.includes('Failed to fetch')) {
        setError('Connexion à Airtable impossible. Vérifiez votre connexion internet et vos clés API.');
      } else {
        setError(`Erreur lors du rechargement: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
      }
    } finally {
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
    createTicket,
    updateTicket,
  };
};