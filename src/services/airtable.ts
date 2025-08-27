import { Subscriber } from '../types';

class AirtableService {
  private apiKey: string;
  private subscribersBaseId: string;

  constructor(apiKey: string, subscribersBaseId: string) {
    this.apiKey = apiKey;
    this.subscribersBaseId = subscribersBaseId;
  }

  private async makeRequest(baseId: string, tableName: string, method: 'GET' | 'POST' | 'PATCH' = 'GET', data?: any) {
    const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`;
    
    console.log('🌐 Tentative de requête Airtable:', {
      url,
      method,
      baseId,
      tableName,
      hasApiKey: !!this.apiKey,
      apiKeyLength: this.apiKey?.length
    });

    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    };

    if (data && (method === 'POST' || method === 'PATCH')) {
      options.body = JSON.stringify(data);
    }

    try {
      console.log('🔄 Envoi de la requête...');
      const response = await fetch(url, options);
      
      console.log('📡 Réponse reçue:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Réponse d\'erreur Airtable:', errorText);
        
        // Messages d'erreur plus explicites
        if (response.status === 401) {
          throw new Error(`Clé API Airtable invalide. Vérifiez VITE_AIRTABLE_API_KEY dans votre fichier .env`);
        } else if (response.status === 404) {
          throw new Error(`Base ou table Airtable introuvable. Base ID: ${baseId}, Table: ${tableName}. Vérifiez VITE_AIRTABLE_SUBSCRIBERS_BASE_ID et le nom de la table`);
        } else if (response.status === 403) {
          throw new Error(`Accès refusé à Airtable. Vérifiez les permissions de votre clé API`);
        } else if (response.status === 422) {
          throw new Error(`Erreur de validation Airtable (422). Vérifiez le nom de la table "${tableName}"`);
        } else {
          throw new Error(`Erreur Airtable ${response.status}: ${response.statusText}. Détails: ${errorText}`);
        }
      }
      
      console.log('✅ Réponse OK, parsing JSON...');
      const result = await response.json();
      console.log('📊 Données reçues:', {
        recordsCount: result.records?.length || 0,
        hasOffset: !!result.offset
      });
      return result;
    } catch (error) {
      console.error('❌ Erreur détaillée:', {
        name: error?.constructor?.name,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Gestion spécifique de l'erreur "Failed to fetch"
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error(`Erreur de réseau: Impossible de se connecter à Airtable. Vérifiez votre connexion internet et les paramètres CORS.`);
      }
      
      if (error instanceof Error && error.message.includes('CORS')) {
        throw new Error(`Erreur CORS: Airtable bloque la requête. Cela peut être dû aux paramètres de sécurité du navigateur.`);
      }
      
      throw error;
    }
  }

  async getSubscribers(): Promise<Subscriber[]> {
    try {
      console.log('📡 Connexion à Airtable...');
      
      // Récupérer tous les enregistrements avec pagination
      let allRecords: any[] = [];
      let offset: string | undefined = undefined;
      let pageCount = 0;
      
      do {
        pageCount++;
        if (pageCount === 1) {
          console.log(`📄 Récupération des données...`);
        }
        
        const url = offset ? `Abonnés?offset=${offset}` : 'Abonnés';
        const response = await this.makeRequest(this.subscribersBaseId, url);
        
        if (response.records) {
          allRecords = allRecords.concat(response.records);
          if (pageCount === 1) {
            console.log(`📊 ${response.records.length} enregistrements trouvés`);
          }
        }
        
        offset = response.offset;
      } while (offset);
      
      if (allRecords.length === 0) {
        console.warn('⚠️ Aucun abonné trouvé dans Airtable');
        return [];
      }
      
      console.log(`✅ ${allRecords.length} abonnés récupérés depuis Airtable`);
      
      const subscribers = allRecords.map((record: any) => ({
        id: record.id,
        nom: record.fields.Nom || '',
        prenom: record.fields.Prenom || '',
        contratAbonne: record.fields['Contrat abonné'] || '',
        nomEntreprise: record.fields['Nom de l\'entreprise'] || '',
        installateur: record.fields.Installateur || '',
        lienCRM: record.fields['Lien CRM'] || '',
        email: record.fields.Email || record.fields['Adresse email'] || '',
        telephone: record.fields.Téléphone || record.fields['Numéro de téléphone'] || '',
      }));
      
      return subscribers;
    } catch (error) {
      console.error('❌ Erreur détaillée Airtable:', error);
      throw error;
    }
  }

  async createTicketRecord(ticketData: any) {
    try {
      const response = await this.makeRequest(
        this.subscribersBaseId,
        'Tickets',
        'POST',
        {
          records: [{
            fields: ticketData
          }]
        }
      );
      return response.records?.[0];
    } catch (error) {
      throw error;
    }
  }

  async updateTicketRecord(recordId: string, ticketData: any) {
    try {
      const response = await this.makeRequest(
        this.subscribersBaseId,
        `Tickets/${recordId}`,
        'PATCH',
        {
          fields: ticketData
        }
      );
      return response;
    } catch (error) {
      throw error;
    }
  }
}

export default AirtableService;