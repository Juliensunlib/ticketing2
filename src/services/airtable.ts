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
      
      const response = await this.makeRequest(this.subscribersBaseId, 'Abonnés');
      
      if (!response.records) {
        console.warn('⚠️ Aucun record trouvé dans la réponse Airtable');
        return [];
      }
      
      console.log(`📊 ${response.records.length} records trouvés dans Airtable`);
      
      const subscribers = response.records.map((record: any) => ({
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
      
      console.log('✅ Abonnés traités:', subscribers.slice(0, 3)); // Afficher les 3 premiers pour debug
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