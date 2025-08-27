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
        headers: Object.fromEntries(response.headers.entries()),
        url: response.url
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Réponse d\'erreur Airtable:', errorText);
        
        // Messages d'erreur plus explicites
        if (response.status === 401) {
          throw new Error(`Clé API Airtable invalide. Vérifiez VITE_AIRTABLE_API_KEY dans votre fichier .env`);
        } else if (response.status === 403) {
          throw new Error(`Accès refusé à Airtable. Vérifiez que votre clé API a les permissions pour accéder à la base ${baseId} et à la table "${tableName}"`);
        } else if (response.status === 404) {
          throw new Error(`Base ou table Airtable introuvable. Base ID: ${baseId}, Table: "${tableName}". Vérifiez VITE_AIRTABLE_SUBSCRIBERS_BASE_ID et que la table "Abonnés" existe`);
        } else if (response.status === 422) {
          // Erreur 422 souvent liée aux permissions ou modèle introuvable
          const errorData = JSON.parse(errorText);
          if (errorData.error?.type === 'INVALID_PERMISSIONS_OR_MODEL_NOT_FOUND') {
            throw new Error(`ERREUR PERMISSIONS AIRTABLE:\n\n` +
              `🔑 Clé API: ${this.apiKey.substring(0, 15)}...\n` +
              `📊 Base ID: ${baseId}\n` +
              `📋 Table: "${tableName}"\n\n` +
              `SOLUTIONS:\n` +
              `1. Vérifiez que votre clé API a accès à cette base spécifique\n` +
              `2. Confirmez que la table "Abonnés" existe dans la base\n` +
              `3. Allez dans Airtable → Account → API → Vérifiez les permissions\n` +
              `4. Testez dans l'API Explorer: https://airtable.com/api`);
          }
          throw new Error(`Erreur de validation Airtable (422). Détails: ${errorText}`);
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
      console.log('📡 === CONNEXION AIRTABLE ===');
      console.log('🔧 Tentative de connexion à Airtable...');
      console.log('🔧 Base ID:', this.subscribersBaseId);
      console.log('🔧 API Key:', this.apiKey ? `${this.apiKey.substring(0, 15)}...` : 'MANQUANTE');
      console.log('🔧 URL de test:', `https://api.airtable.com/v0/${this.subscribersBaseId}/${encodeURIComponent('Abonnés')}`);
      
      // Vérification préliminaire des paramètres
      if (!this.apiKey || !this.subscribersBaseId) {
        throw new Error('Configuration Airtable incomplète: clé API ou Base ID manquante');
      }
      
      if (!this.apiKey.startsWith('pat') && !this.apiKey.startsWith('key')) {
        throw new Error('Format de clé API Airtable invalide. La clé doit commencer par "pat" ou "key"');
      }
      
      if (!this.subscribersBaseId.startsWith('app')) {
        throw new Error('Format de Base ID Airtable invalide. L\'ID doit commencer par "app"');
      }
      
      // Récupérer tous les enregistrements avec pagination
      let allRecords: any[] = [];
      let offset: string | undefined = undefined;
      let pageCount = 0;
      
      do {
        pageCount++;
        if (pageCount === 1) {
          console.log(`📄 Récupération page ${pageCount}...`);
        }
        
        const tableName = 'Abonnés';
        const url = offset ? `${encodeURIComponent(tableName)}?offset=${offset}` : encodeURIComponent(tableName);
        console.log('🔗 URL de requête:', url);
        const response = await this.makeRequest(this.subscribersBaseId, tableName, 'GET');
        
        if (response.records) {
          allRecords = allRecords.concat(response.records);
          if (pageCount === 1) {
            console.log(`📊 ${response.records.length} enregistrements sur cette page`);
            // Afficher un exemple d'enregistrement pour debug
            if (response.records.length > 0) {
              console.log('📋 Exemple d\'enregistrement:', {
                id: response.records[0].id,
                fields: Object.keys(response.records[0].fields || {}),
                sampleData: response.records[0].fields
              });
            }
          }
        }
        
        offset = response.offset;
      } while (offset);
      
      if (allRecords.length === 0) {
        console.warn('⚠️ === AUCUN ABONNÉ TROUVÉ ===');
        console.warn('⚠️ Vérifiez:');
        console.warn('⚠️ 1. Table "Abonnés" existe dans Airtable');
        console.warn('⚠️ 2. Table contient des données');
        console.warn('⚠️ 3. Permissions de la clé API');
        return [];
      }
      
      console.log(`✅ TOTAL: ${allRecords.length} abonnés récupérés`);
      
      const subscribers = allRecords.map((record: any) => ({
        id: record.id,
        nom: record.fields['Nom'] || record.fields['nom'] || record.fields['NOM'] || '',
        prenom: record.fields['Prénom'] || record.fields['Prenom'] || record.fields['prenom'] || record.fields['PRENOM'] || '',
        contratAbonne: record.fields['Contrat abonné'] || record.fields['Contrat Abonné'] || record.fields['CONTRAT ABONNE'] || record.fields['Numéro de contrat'] || '',
        nomEntreprise: record.fields['Nom de l\'entreprise'] || record.fields['Nom entreprise'] || record.fields['Entreprise'] || '',
        installateur: record.fields['Installateur'] || record.fields['INSTALLATEUR'] || '',
        lienCRM: record.fields['Lien CRM'] || record.fields['URL CRM'] || '',
        email: record.fields['Email'] || record.fields['Adresse email'] || record.fields['email'] || record.fields['E-mail'] || '',
        telephone: record.fields['Téléphone'] || record.fields['Numéro de téléphone'] || record.fields['Tel'] || record.fields['Phone'] || '',
      }));
      
      // Debug détaillé des champs
      if (allRecords.length > 0) {
        const firstRecord = allRecords[0];
        console.log('🔍 === ANALYSE DES CHAMPS AIRTABLE ===');
        console.log('🔍 ID du premier enregistrement:', firstRecord.id);
        console.log('🔍 Nombre total de champs:', Object.keys(firstRecord.fields).length);
        console.log('🔍 Tous les champs disponibles:', Object.keys(firstRecord.fields));
        
        // Chercher les champs qui contiennent "nom", "prenom", "contrat"
        const nomFields = Object.keys(firstRecord.fields).filter(key => 
          key.toLowerCase().includes('nom') && !key.toLowerCase().includes('prenom')
        );
        const prenomFields = Object.keys(firstRecord.fields).filter(key => 
          key.toLowerCase().includes('prenom') || key.toLowerCase().includes('prénom')
        );
        const contratFields = Object.keys(firstRecord.fields).filter(key => 
          key.toLowerCase().includes('contrat') || key.toLowerCase().includes('abonne') || key.toLowerCase().includes('abonné')
        );
        const emailFields = Object.keys(firstRecord.fields).filter(key => 
          key.toLowerCase().includes('email') || key.toLowerCase().includes('mail')
        );
        
        console.log('🔍 Champs "nom" trouvés:', nomFields);
        console.log('🔍 Champs "prénom" trouvés:', prenomFields);
        console.log('🔍 Champs "contrat" trouvés:', contratFields);
        console.log('🔍 Champs "email" trouvés:', emailFields);
        
        // Afficher les valeurs des premiers champs trouvés
        if (nomFields.length > 0) {
          console.log('🔍 Valeur du champ nom:', firstRecord.fields[nomFields[0]]);
        }
        if (prenomFields.length > 0) {
          console.log('🔍 Valeur du champ prénom:', firstRecord.fields[prenomFields[0]]);
        }
        if (contratFields.length > 0) {
          console.log('🔍 Valeur du champ contrat:', firstRecord.fields[contratFields[0]]);
        }
        
        console.log('🔍 === FIN ANALYSE ===');
      }
      
      // Filtrer les abonnés qui ont au moins un nom ou prénom
      const validSubscribers = subscribers.filter(sub => 
        sub.nom.trim() !== '' || sub.prenom.trim() !== '' || sub.contratAbonne.trim() !== ''
      );
      
      console.log('✅ Abonnés valides après filtrage:', validSubscribers.length);
      console.log('✅ Premiers abonnés mappés:', validSubscribers.slice(0, 3));
      console.log('📡 === FIN CONNEXION AIRTABLE ===');
      return validSubscribers;
    } catch (error) {
      console.error('❌ === ERREUR AIRTABLE ===', error);
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