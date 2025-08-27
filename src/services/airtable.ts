import { Subscriber } from '../types';

class AirtableService {
  private apiKey: string;
  private subscribersBaseId: string;

  constructor(apiKey: string, subscribersBaseId: string) {
    this.apiKey = apiKey;
    this.subscribersBaseId = subscribersBaseId;
  }

  private async makeRequest(baseId: string, tableName: string, method: 'GET' | 'POST' | 'PATCH' = 'GET', data?: any) {
    const url = `https://api.airtable.com/v0/${baseId}/${tableName}`;
    
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
      const response = await fetch(url, options);
      
      if (!response.ok) {
        // Messages d'erreur plus explicites
        if (response.status === 401) {
          throw new Error(`Clé API Airtable invalide. Vérifiez VITE_AIRTABLE_API_KEY dans votre fichier .env`);
        } else if (response.status === 404) {
          throw new Error(`Base ou table Airtable introuvable. Vérifiez VITE_AIRTABLE_SUBSCRIBERS_BASE_ID et le nom de la table`);
        } else if (response.status === 403) {
          throw new Error(`Accès refusé à Airtable. Vérifiez les permissions de votre clé API`);
        } else {
          throw new Error(`Erreur Airtable ${response.status}: ${response.statusText}`);
        }
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      // Gestion spécifique de l'erreur "Failed to fetch"
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('Impossible de se connecter à Airtable. Vérifiez votre connexion internet et que les clés API sont correctes.');
      }
      
      throw error;
    }
  }

  async getSubscribers(): Promise<Subscriber[]> {
    try {
      console.log('🔍 Tentative de connexion à Airtable...');
      console.log('🔍 Base ID:', this.subscribersBaseId);
      console.log('🔍 API Key:', this.apiKey.substring(0, 10) + '...');
      
      // Récupérer tous les enregistrements avec pagination
      let allRecords: any[] = [];
      let offset: string | undefined = undefined;
      let pageCount = 0;
      
      do {
        pageCount++;
        console.log(`📄 Récupération de la page ${pageCount}...`);
        
        const url = offset ? `Abonnés?offset=${offset}` : 'Abonnés';
        const response = await this.makeRequest(this.subscribersBaseId, url);
        
        if (response.records) {
          allRecords = allRecords.concat(response.records);
          console.log(`📊 Page ${pageCount}: ${response.records.length} enregistrements (Total: ${allRecords.length})`);
        }
        
        offset = response.offset;
      } while (offset);
      
      if (allRecords.length === 0) {
        console.warn('⚠️ Aucun abonné trouvé dans Airtable');
        return [];
      }
      
      console.log(`✅ TOTAL: ${allRecords.length} abonnés récupérés depuis Airtable en ${pageCount} page(s)`);
      
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
      
      console.log('✅ Premiers abonnés traités:', subscribers.slice(0, 3)); // Afficher les 3 premiers pour debug
      console.log('✅ Derniers abonnés traités:', subscribers.slice(-3)); // Afficher les 3 derniers pour debug
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