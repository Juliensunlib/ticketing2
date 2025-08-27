interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: {
    headers: Array<{
      name: string;
      value: string;
    }>;
    body?: {
      data?: string;
    };
    parts?: Array<{
      mimeType: string;
      body: {
        data?: string;
      };
    }>;
  };
  internalDate: string;
}

interface GmailListResponse {
  messages: Array<{
    id: string;
    threadId: string;
  }>;
  nextPageToken?: string;
  resultSizeEstimate: number;
}

class GmailService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private scope: string;
  private tokenExpiresAt: number = 0;

  constructor() {
    this.clientId = import.meta.env.VITE_GMAIL_CLIENT_ID || '';
    this.clientSecret = import.meta.env.VITE_GMAIL_CLIENT_SECRET || '';
    this.redirectUri = import.meta.env.VITE_GMAIL_REDIRECT_URI || 'https://ticketing-jade.vercel.app/auth/callback';
    this.scope = 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send';
    
    // Charger les tokens sauvegardés au démarrage
    try {
      this.loadStoredTokens();
    } catch (error) {
      console.error('Erreur lors du chargement des tokens:', error);
    }
    
    console.log('🔧 Gmail Service initialisé pour abonne@sunlib.fr');
  }

  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: this.scope,
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      login_hint: 'abonne@sunlib.fr' // Suggère le compte à utiliser
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<void> {
    try {
      console.log('🔄 Échange du code d\'autorisation...');
      
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: this.redirectUri,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Erreur OAuth:', errorData);
        throw new Error(`Erreur OAuth: ${errorData.error_description || response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Tokens reçus avec succès');
      
      this.accessToken = data.access_token;
      this.refreshToken = data.refresh_token;
      this.tokenExpiresAt = Date.now() + (data.expires_in * 1000);
      
      // Sauvegarder les tokens
      this.saveTokens();
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'échange du code:', error);
      throw error;
    }
  }

  private saveTokens(): void {
    if (this.accessToken) {
      localStorage.setItem('gmail_access_token', this.accessToken);
      localStorage.setItem('gmail_token_expires_at', this.tokenExpiresAt.toString());
    }
    if (this.refreshToken) {
      localStorage.setItem('gmail_refresh_token', this.refreshToken);
    }
    console.log('💾 Tokens sauvegardés');
  }

  private loadStoredTokens(): void {
    try {
      this.accessToken = localStorage.getItem('gmail_access_token');
      this.refreshToken = localStorage.getItem('gmail_refresh_token');
      const expiresAt = localStorage.getItem('gmail_token_expires_at');
      
      if (expiresAt) {
        this.tokenExpiresAt = parseInt(expiresAt);
      }
      
      if (this.accessToken) {
        console.log('✅ Tokens chargés depuis le stockage local');
      }
    } catch (error) {
      console.error('Erreur lors du chargement des tokens depuis localStorage:', error);
      this.accessToken = null;
      this.refreshToken = null;
      this.tokenExpiresAt = 0;
    }
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('Aucun refresh token disponible');
    }

    try {
      console.log('🔄 Actualisation du token d\'accès...');
      
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: this.refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        throw new Error(`Erreur refresh token: ${response.statusText}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiresAt = Date.now() + (data.expires_in * 1000);
      
      // Sauvegarder le nouveau token
      this.saveTokens();
      
      console.log('✅ Token actualisé avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de l\'actualisation du token:', error);
      // Si le refresh échoue, supprimer tous les tokens
      this.logout();
      throw error;
    }
  }

  private async ensureValidToken(): Promise<void> {
    // Si pas de token, lancer l'authentification
    if (!this.accessToken) {
      throw new Error('NEED_AUTH');
    }

    // Si le token expire dans moins de 5 minutes, le rafraîchir
    if (this.tokenExpiresAt && Date.now() > (this.tokenExpiresAt - 5 * 60 * 1000)) {
      await this.refreshAccessToken();
    }
  }

  isAuthenticated(): boolean {
    try {
      return !!(this.accessToken && this.tokenExpiresAt > Date.now());
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'authentification:', error);
      return false;
    }
  }

  async makeGmailRequest(endpoint: string, method: 'GET' | 'POST' = 'GET', body?: any): Promise<any> {
    try {
      await this.ensureValidToken();
    } catch (error) {
      console.error('Erreur lors de la validation du token:', error);
      throw error;
    }

    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    };

    if (body && method === 'POST') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${endpoint}`, options);

    if (!response.ok) {
      if (response.status === 401) {
        // Token invalide, essayer de le rafraîchir
        try {
          await this.refreshAccessToken();
          // Réessayer la requête avec le nouveau token
          return this.makeGmailRequest(endpoint, method, body);
        } catch (refreshError) {
          throw new Error('NEED_AUTH');
        }
      }
      throw new Error(`Erreur Gmail API: ${response.statusText}`);
    }

    return response.json();
  }

  async getMessages(maxResults: number = 50): Promise<any[]> {
    try {
      console.log('📧 Récupération des emails...');
      
      // Récupérer la liste des messages
      const listResponse: GmailListResponse = await this.makeGmailRequest(
        `messages?maxResults=${maxResults}&q=in:inbox`
      );

      if (!listResponse.messages || listResponse.messages.length === 0) {
        console.log('📭 Aucun email trouvé');
        return [];
      }

      console.log(`📬 ${listResponse.messages.length} emails trouvés`);

      // Récupérer les détails de chaque message (limité à 20 pour les performances)
      const messages = await Promise.all(
        listResponse.messages.slice(0, 20).map(async (msg) => {
          try {
            const messageDetail: GmailMessage = await this.makeGmailRequest(`messages/${msg.id}`);
            return this.parseMessage(messageDetail);
          } catch (error) {
            console.error(`❌ Erreur message ${msg.id}:`, error);
            return null;
          }
        })
      );

      const validMessages = messages.filter(msg => msg !== null);
      console.log(`✅ ${validMessages.length} emails traités avec succès`);
      
      return validMessages;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des messages:', error);
      throw error;
    }
  }

  async sendReply(originalMessageId: string, to: string, subject: string, body: string): Promise<void> {
    try {
      console.log('📤 Envoi de la réponse email...');
      
      // Récupérer le message original pour obtenir le thread ID
      const originalMessage = await this.makeGmailRequest(`messages/${originalMessageId}`);
      
      // Construire l'email de réponse
      const emailContent = [
        `To: ${to}`,
        `Subject: Re: ${subject.replace(/^Re:\s*/i, '')}`,
        `In-Reply-To: ${originalMessageId}`,
        `References: ${originalMessageId}`,
        '',
        body
      ].join('\n');

      // Encoder en base64
      const encodedMessage = btoa(unescape(encodeURIComponent(emailContent)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // Envoyer l'email
      await this.makeGmailRequest('messages/send', 'POST', {
        raw: encodedMessage,
        threadId: originalMessage.threadId
      });

      console.log('✅ Réponse envoyée avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi de la réponse:', error);
      throw error;
    }
  }

  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    try {
      console.log('📤 Envoi d\'un nouvel email...');
      console.log('📧 Destinataire:', to);
      console.log('📧 Sujet:', subject);
      
      // Construire l'email
      const emailContent = [
        `To: ${to}`,
        `Subject: ${subject}`,
        `Content-Type: text/plain; charset=utf-8`,
        '',
        body
      ].join('\n');

      // Encoder en base64url (format requis par Gmail)
      const encodedMessage = btoa(unescape(encodeURIComponent(emailContent)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      console.log('📤 Envoi via Gmail API...');
      
      // Envoyer l'email
      const response = await this.makeGmailRequest('messages/send', 'POST', {
        raw: encodedMessage
      });

      console.log('✅ Email envoyé avec succès:', response);
    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi de l\'email:', error);
      
      // Améliorer les messages d'erreur
      if (error instanceof Error) {
        if (error.message.includes('400')) {
          throw new Error('Format d\'email invalide. Vérifiez l\'adresse email du destinataire.');
        } else if (error.message.includes('403')) {
          throw new Error('Permissions insuffisantes. Vérifiez que votre compte Gmail a les droits d\'envoi.');
        } else if (error.message.includes('429')) {
          throw new Error('Limite de taux dépassée. Attendez quelques minutes avant de réessayer.');
        } else if (error.message.includes('NEED_AUTH')) {
          throw new Error('Session expirée. Reconnectez-vous à Gmail.');
        } else {
          throw new Error(`Erreur Gmail: ${error.message}`);
        }
      }
      
      throw error;
    }
  }

  private parseMessage(message: GmailMessage): any {
    const headers = message.payload.headers;
    const subject = headers.find(h => h.name === 'Subject')?.value || 'Sans sujet';
    const from = headers.find(h => h.name === 'From')?.value || 'Expéditeur inconnu';
    const date = headers.find(h => h.name === 'Date')?.value || message.internalDate;

    // Extraire le corps du message
    let body = message.snippet;
    if (message.payload.body?.data) {
      body = this.decodeBase64(message.payload.body.data);
    } else if (message.payload.parts) {
      const textPart = message.payload.parts.find(part => 
        part.mimeType === 'text/plain' && part.body.data
      );
      if (textPart?.body.data) {
        body = this.decodeBase64(textPart.body.data);
      }
    }

    return {
      id: message.id,
      threadId: message.threadId,
      subject,
      from,
      date: new Date(parseInt(message.internalDate)).toISOString(),
      snippet: message.snippet,
      body,
      hasAttachments: message.payload.parts?.some(part => 
        part.body && Object.keys(part.body).length > 1
      ) || false,
      isRead: !message.labelIds.includes('UNREAD')
    };
  }

  private decodeBase64(data: string): string {
    try {
      // Gmail utilise base64url, on doit le convertir en base64 standard
      const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
      return decodeURIComponent(escape(atob(base64)));
    } catch (error) {
      console.error('❌ Erreur décodage base64:', error);
      return data;
    }
  }

  logout(): void {
    console.log('🚪 Déconnexion Gmail');
    try {
      this.accessToken = null;
      this.refreshToken = null;
      this.tokenExpiresAt = 0;
      localStorage.removeItem('gmail_access_token');
      localStorage.removeItem('gmail_refresh_token');
      localStorage.removeItem('gmail_token_expires_at');
    } catch (error) {
      console.error('Erreur lors de la suppression des tokens:', error);
    }
  }

  // Méthode pour vérifier si on a besoin d'une authentification
  needsAuthentication(): boolean {
    try {
      return !this.isAuthenticated();
    } catch (error) {
      console.error('Erreur lors de la vérification du besoin d\'authentification:', error);
      return true;
    }
  }
}

export default new GmailService();