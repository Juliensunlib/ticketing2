import { useState, useEffect, useRef } from 'react';
import AirtableService from '../services/airtable';
import { Subscriber } from '../types';

// Configuration depuis les variables d'environnement
const getAirtableConfig = () => {
  const apiKey = import.meta.env.VITE_AIRTABLE_API_KEY;
  const subscribersBaseId = import.meta.env.VITE_AIRTABLE_SUBSCRIBERS_BASE_ID;

  console.log('🔧 === DIAGNOSTIC AIRTABLE ===');
  console.log('🔧 API Key présente:', !!apiKey, apiKey ? `(${apiKey.substring(0, 15)}...)` : '');
  console.log('🔧 Base ID présente:', !!subscribersBaseId, subscribersBaseId || '');
  console.log('🔧 Toutes les variables env:', {
    VITE_AIRTABLE_API_KEY: import.meta.env.VITE_AIRTABLE_API_KEY ? 'SET' : 'MISSING',
    VITE_AIRTABLE_SUBSCRIBERS_BASE_ID: import.meta.env.VITE_AIRTABLE_SUBSCRIBERS_BASE_ID ? 'SET' : 'MISSING',
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL ? 'SET' : 'MISSING',
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'SET' : 'MISSING'
  });
  console.log('🔧 === FIN DIAGNOSTIC ===');

  if (!apiKey || !subscribersBaseId || apiKey === 'votre_clé_api_airtable' || subscribersBaseId === 'id_de_votre_base_abonnés') {
    console.warn('⚠️ Configuration Airtable incomplète. Variables Vercel non configurées ou invalides.');
    return null;
  }

  return { apiKey, subscribersBaseId };
};

export const useAirtable = () => {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  
  // Utiliser des refs pour éviter les re-renders infinis
  const airtableServiceRef = useRef<AirtableService | null>(null);
  const isInitializedRef = useRef(false);
  const isLoadingRef = useRef(false);

  // Initialiser le service une seule fois
  useEffect(() => {
    if (!isInitializedRef.current) {
      const config = getAirtableConfig();
      if (config) {
        console.log('🔧 Configuration Airtable détectée');
        console.log('🔧 API Key (début):', config.apiKey.substring(0, 10) + '...');
        console.log('🔧 Base ID:', config.subscribersBaseId);
        airtableServiceRef.current = new AirtableService(config.apiKey, config.subscribersBaseId);
        isInitializedRef.current = true;
        
        // Charger les données automatiquement après initialisation
        setTimeout(() => {
          loadDataInternal();
        }, 100);
      } else {
        console.warn('⚠️ Configuration Airtable manquante');
        setError('Configuration Airtable manquante. Vérifiez les variables d\'environnement Vercel.');
        isInitializedRef.current = true;
      }
    }
  }, []);

  const loadDataInternal = async (isRetry = false) => {
    if (isLoadingRef.current) {
      console.log('🔄 Chargement déjà en cours, ignorer cette tentative');
      return;
    }

    if (!airtableServiceRef.current) {
      console.warn('⚠️ Service Airtable non initialisé');
      setError('Service Airtable non configuré. Vérifiez les variables d\'environnement Vercel.');
      return;
    }

    isLoadingRef.current = true;
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Tentative', retryCount + 1, 'sur', maxRetries);
      
      const subscribersData = await airtableServiceRef.current.getSubscribers();
      console.log(`🎉 SUCCÈS: ${subscribersData.length} abonnés récupérés avec succès depuis Airtable`);

      setSubscribers(subscribersData);
      setRetryCount(0); // Reset retry count on success
      
    } catch (err) {
      console.error('❌ Erreur lors du chargement des abonnés:', err);
      
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      
      // Messages d'aide spécifiques selon le type d'erreur
      let helpMessage = '';
      if (errorMessage.includes('INVALID_PERMISSIONS_OR_MODEL_NOT_FOUND')) {
        helpMessage = '\n\n🔧 AIDE AU DIAGNOSTIC:\n' +
          '1. Vérifiez que votre clé API Airtable a les permissions pour cette base\n' +
          '2. Confirmez que la table "Abonnés" existe dans votre base\n' +
          '3. Vérifiez que le Base ID est correct (commence par "app")\n' +
          '4. Assurez-vous que la clé API n\'a pas expiré';
      } else if (errorMessage.includes('403') || errorMessage.includes('Accès refusé')) {
        helpMessage = '\n\n🔧 AIDE AU DIAGNOSTIC:\n' +
          '1. Votre clé API n\'a pas les permissions nécessaires\n' +
          '2. Allez dans Airtable → Account → API → Vérifiez les permissions\n' +
          '3. La clé doit avoir accès en lecture à la base spécifiée';
      } else if (errorMessage.includes('404') || errorMessage.includes('introuvable')) {
        helpMessage = '\n\n🔧 AIDE AU DIAGNOSTIC:\n' +
          '1. Vérifiez le Base ID dans l\'URL de votre base Airtable\n' +
          '2. Confirmez que la table s\'appelle exactement "Abonnés"\n' +
          '3. Vérifiez qu\'il n\'y a pas de fautes de frappe';
      }
      
      // Retry logic
      if (retryCount < maxRetries - 1 && !errorMessage.includes('401') && !errorMessage.includes('403')) {
        console.log(`🔄 Tentative de retry dans 2 secondes... (${retryCount + 1}/${maxRetries})`);
        setRetryCount(prev => prev + 1);
        setTimeout(() => {
          loadDataInternal(true);
        }, 3000);
        return;
      }
      
      setError(errorMessage + helpMessage);
      setSubscribers([]);
      setRetryCount(0);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  };

  const loadData = async () => {
    if (!isInitializedRef.current) {
      console.warn('⚠️ Service Airtable pas encore initialisé');
      return;
    }

    setRetryCount(0); // Reset retry count for manual reload
    await loadDataInternal();
  };

  const forceReload = async () => {
    console.log('🔄 Rechargement forcé des données Airtable');
    setLoading(true);
    setError(null);
    setRetryCount(0);
    setSubscribers([]); // Clear current data
    isLoadingRef.current = false; // Reset loading flag

    if (airtableServiceRef.current) {
      await loadDataInternal();
    } else {
      setError('Service Airtable non disponible');
      setLoading(false);
    }
  };

  const createTicket = async (ticketData: any) => {
    if (!airtableServiceRef.current) {
      console.warn('Service Airtable non configuré, ticket créé uniquement dans Supabase');
      return null;
    }
    return await airtableServiceRef.current.createTicketRecord(ticketData);
  };

  const updateTicket = async (recordId: string, ticketData: any) => {
    if (!airtableServiceRef.current) {
      console.warn('Service Airtable non configuré, mise à jour uniquement dans Supabase');
      return null;
    }
    return await airtableServiceRef.current.updateTicketRecord(recordId, ticketData);
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