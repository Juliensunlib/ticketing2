import React, { useState, useEffect } from 'react';
import { Mail, Plus, Search, RefreshCw, Calendar, User, Paperclip, ExternalLink, Key, CheckCircle, AlertCircle, Send, X, Inbox, Archive, FileText } from 'lucide-react';
import gmailService from '../../services/gmailService';
import { useTickets } from '../../hooks/useTickets';

interface Email {
  id: string;
  threadId?: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  body?: string;
  hasAttachments: boolean;
  isRead: boolean;
}

interface GmailIntegrationProps {
  onCreateTicketFromEmail?: (email: Email) => void;
}

const GmailIntegration: React.FC<GmailIntegrationProps> = ({ onCreateTicketFromEmail }) => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [processedEmails, setProcessedEmails] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'inbox' | 'processed'>('inbox');
  const [loading, setLoading] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const { tickets } = useTickets();

  // Charger les emails traités depuis le localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('processed_emails');
      if (stored) {
        setProcessedEmails(new Set(JSON.parse(stored)));
      }
    } catch (error) {
      console.error('Erreur lors du chargement des emails traités:', error);
      setProcessedEmails(new Set());
    }
  }, []);

  // Sauvegarder les emails traités
  const saveProcessedEmails = (emailIds: Set<string>) => {
    localStorage.setItem('processed_emails', JSON.stringify([...emailIds]));
  };

  // Vérifier l'authentification au chargement
  useEffect(() => {
    const initializeGmail = async () => {
      try {
        checkAuthentication();
        
        // Écouter les changements d'URL pour capturer le code d'autorisation
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        
        if (code) {
          await handleAuthCallback(code);
        }
      } catch (error) {
        console.error('Erreur lors de l\'initialisation Gmail:', error);
        setAuthError('Erreur lors de l\'initialisation de Gmail');
        setLoading(false);
      }
    };

    initializeGmail();
  }, []);

  // Effet séparé pour gérer l'état de chargement initial
  useEffect(() => {
    // S'assurer que loading est false après l'initialisation
    const timer = setTimeout(() => {
      if (loading && !isAuthenticated) {
        setLoading(false);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [loading, isAuthenticated]);

  const checkAuthentication = () => {
    try {
      const authenticated = gmailService.isAuthenticated();
      setIsAuthenticated(authenticated);
      
      if (authenticated) {
        console.log('✅ Utilisateur déjà authentifié, chargement des emails...');
        loadEmails();
      } else {
        console.log('🔑 Authentification requise');
        setLoading(false);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'authentification:', error);
      setIsAuthenticated(false);
      setLoading(false);
    }
  };

  const handleAuthCallback = async (code: string) => {
    try {
      setLoading(true);
      setAuthError(null);
      
      console.log('🔄 Traitement du code d\'autorisation...');
      await gmailService.exchangeCodeForToken(code);
      
      setIsAuthenticated(true);
      
      // Nettoyer l'URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Charger les emails
      await loadEmails();
      
    } catch (error) {
      console.error('❌ Erreur d\'authentification:', error);
      setAuthError(error instanceof Error ? error.message : 'Erreur d\'authentification');
    } finally {
      setLoading(false);
    }
  };

  const handleGmailAuth = () => {
    try {
      if (!gmailService.isConfigured()) {
        setAuthError('Configuration Gmail manquante. Vérifiez vos variables d\'environnement.');
        return;
      }

      const authUrl = gmailService.getAuthUrl();
      console.log('🔗 Redirection vers:', authUrl);
      window.location.href = authUrl;
    } catch (error) {
      console.error('Erreur lors de l\'authentification Gmail:', error);
      setAuthError('Erreur lors de l\'authentification Gmail');
    }
  };

  const loadEmails = async () => {
    if (!isAuthenticated) {
      console.log('❌ Non authentifié, impossible de charger les emails');
      setLoading(false);
      return;
    }

    setLoading(true);
    setAuthError(null);

    try {
      console.log('📧 Chargement des emails depuis Gmail...');
      const gmailEmails = await gmailService.getMessages(50);
      
      console.log(`✅ ${gmailEmails.length} emails chargés`);
      setEmails(gmailEmails);
      
    } catch (error) {
      console.error('❌ Erreur lors du chargement des emails:', error);
      
      if (error instanceof Error && error.message === 'NEED_AUTH') {
        setIsAuthenticated(false);
        setAuthError('Session expirée. Veuillez vous reconnecter.');
      } else if (error instanceof Error && error.message.includes('Failed to fetch')) {
        setAuthError('Impossible de se connecter à Gmail. Vérifiez votre connexion internet.');
      } else if (error instanceof Error && error.message.includes('401')) {
        setAuthError('Session expirée. Veuillez vous reconnecter.');
      } else {
        setAuthError(`Erreur lors du chargement: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    try {
      setAuthError(null);
      if (isAuthenticated) {
        loadEmails();
      } else {
        checkAuthentication();
      }
    } catch (error) {
      console.error('Erreur lors de l\'actualisation:', error);
      setAuthError('Erreur lors de l\'actualisation');
      setLoading(false);
    }
  };

  const handleCreateTicket = (email: Email) => {
    // Marquer l'email comme traité
    const newProcessedEmails = new Set(processedEmails);
    newProcessedEmails.add(email.id);
    setProcessedEmails(newProcessedEmails);
    saveProcessedEmails(newProcessedEmails);

    if (onCreateTicketFromEmail) {
      onCreateTicketFromEmail(email);
    } else {
      alert(`Création d'un ticket depuis l'email: ${email.subject}`);
    }
  };

  const handleDeleteEmail = (emailId: string, emailSubject: string) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer définitivement l'email :\n"${emailSubject}" ?\n\nCette action est irréversible.`)) {
      // Marquer l'email comme supprimé (même système que les emails traités)
      const newProcessedEmails = new Set(processedEmails);
      newProcessedEmails.add(emailId);
      setProcessedEmails(newProcessedEmails);
      saveProcessedEmails(newProcessedEmails);
      
      // Optionnel : Retirer aussi de la liste locale pour effet immédiat
      setEmails(prev => prev.filter(email => email.id !== emailId));
      
      // Si c'était l'email sélectionné, le désélectionner
      if (selectedEmail?.id === emailId) {
        setSelectedEmail(null);
      }
    }
  };

  const handleSendReply = async () => {
    if (!selectedEmail || !replyContent.trim()) return;

    setSendingReply(true);
    try {
      await gmailService.sendReply(
        selectedEmail.id,
        selectedEmail.from,
        selectedEmail.subject,
        replyContent
      );
      
      setReplyContent('');
      setShowReplyForm(false);
      alert('Réponse envoyée avec succès !');
      
    } catch (error) {
      console.error('❌ Erreur envoi réponse:', error);
      alert('Erreur lors de l\'envoi de la réponse');
    } finally {
      setSendingReply(false);
    }
  };

  const handleLogout = () => {
    try {
      gmailService.logout();
      setIsAuthenticated(false);
      setEmails([]);
      setSelectedEmail(null);
      setAuthError(null);
      setLoading(false);
      console.log('🚪 Déconnexion effectuée');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  const markAsRead = (emailId: string) => {
    setEmails(prev => 
      prev.map(email => 
        email.id === emailId ? { ...email, isRead: true } : email
      )
    );
  };

  const filteredEmails = emails.filter(email =>
    !processedEmails.has(email.id) && (
      email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.snippet.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'À l\'instant';
    } else if (diffInHours < 24) {
      return `Il y a ${diffInHours}h`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays === 1) {
        return 'Hier';
      } else if (diffInDays < 7) {
        return `Il y a ${diffInDays} jours`;
      } else {
        return date.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      }
    }
  };

  const unreadCount = emails.filter(email => !email.isRead).length;
  const processedCount = emails.filter(email => processedEmails.has(email.id)).length;

  // Filtrer les emails selon l'onglet actif
  const getEmailsForTab = () => {
    if (activeTab === 'inbox') {
      return filteredEmails;
    } else {
      // Onglet "Mails traités" - emails qui ont été traités
      return emails.filter(email => 
        processedEmails.has(email.id) && (
          email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
          email.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
          email.snippet.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
  };

  // Trouver le ticket associé à un email traité
  const getTicketForEmail = (email: Email) => {
    // Chercher un ticket qui contient l'ID de l'email dans sa description
    return tickets.find(ticket => 
      ticket.description.includes(email.id) ||
      ticket.description.includes(email.subject) ||
      ticket.description.includes(email.from)
    );
  };

  // Gestion de l'état de chargement initial
  if (loading && emails.length === 0 && !authError) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Emails Abonnés</h1>
          <p className="text-gray-600">Chargement en cours...</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Initialisation de Gmail...</p>
          </div>
        </div>
      </div>
    );
  }

  // Interface de connexion
  if (!isAuthenticated) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Emails Abonnés</h1>
          <p className="text-gray-600">Connectez-vous à la boîte mail abonne@sunlib.fr</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
              <Mail className="w-8 h-8 text-orange-600" />
            </div>
            
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Connexion à Gmail
              </h2>
              <p className="text-gray-600">
                Connectez-vous à la boîte mail <strong>abonne@sunlib.fr</strong> pour voir les emails des abonnés
              </p>
            </div>

            {authError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                  <p className="text-red-800 text-sm">{authError}</p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <button
                onClick={handleGmailAuth}
                disabled={loading || !gmailService.isConfigured()}
                className="w-full flex items-center justify-center px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Connexion en cours...
                  </>
                ) : (
                  <>
                    <Key className="w-5 h-5 mr-2" />
                    Se connecter à Gmail
                  </>
                )}
              </button>

              {!gmailService.isConfigured() && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-yellow-500 mr-2" />
                    <p className="text-yellow-800 text-sm">
                      Configuration Gmail manquante. Vérifiez vos variables d'environnement.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="text-xs text-gray-500 space-y-1">
              <p>🔒 Connexion sécurisée via OAuth 2.0</p>
              <p>📧 Accès en lecture et envoi d'emails</p>
              <p>💾 Session sauvegardée automatiquement</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Interface principale avec emails
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Emails Abonnés</h1>
        <p className="text-gray-600">
          Boîte mail abonne@sunlib.fr - {unreadCount} message{unreadCount !== 1 ? 's' : ''} non lu{unreadCount !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Barre d'outils */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center text-green-600">
              <CheckCircle className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium">Connecté à Gmail</span>
            </div>
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Rechercher dans les emails..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
            <button
              onClick={() => {
                setProcessedEmails(new Set());
                localStorage.removeItem('processed_emails');
              }}
              className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors text-sm"
              title="Réafficher tous les emails (y compris ceux traités/supprimés)"
            >
              Tout réafficher
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors"
            >
              Déconnexion
            </button>
          </div>
        </div>
        <div className="text-sm text-gray-600">
          abonne@sunlib.fr • {emails.length} email{emails.length !== 1 ? 's' : ''} • {unreadCount} non lu{unreadCount !== 1 ? 's' : ''} • {processedCount} traité{processedCount !== 1 ? 's' : ''}
        </div>
      </div>

      {authError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <p className="text-red-800 text-sm">{authError}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Liste des emails */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {/* Onglets */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => {
                  setActiveTab('inbox');
                  setSelectedEmail(null);
                }}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'inbox'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <Inbox className="w-4 h-4 mr-2" />
                  Boîte de réception
                  {filteredEmails.length > 0 && (
                    <span className="ml-2 bg-orange-100 text-orange-800 text-xs font-medium px-2 py-1 rounded-full">
                      {filteredEmails.length}
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => {
                  setActiveTab('processed');
                  setSelectedEmail(null);
                }}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'processed'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <Archive className="w-4 h-4 mr-2" />
                  Mails traités
                  {processedCount > 0 && (
                    <span className="ml-2 bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                      {processedCount}
                    </span>
                  )}
                </div>
              </button>
            </nav>
          </div>

          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {activeTab === 'inbox' ? 'Boîte de réception' : 'Mails traités'} ({getEmailsForTab().length})
            </h2>
          </div>
          
          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {loading && getEmailsForTab().length === 0 ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Chargement des emails...</p>
              </div>
            ) : getEmailsForTab().length === 0 ? (
              <div className="p-8 text-center">
                {activeTab === 'inbox' ? (
                  <Inbox className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                ) : (
                  <Archive className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                )}
                <p className="text-gray-600">
                  {searchTerm 
                    ? 'Aucun email trouvé pour cette recherche' 
                    : activeTab === 'inbox' 
                      ? 'Aucun email dans votre boîte de réception'
                      : 'Aucun email traité'
                  }
                </p>
                {!loading && emails.length === 0 && !authError && (
                  <button
                    onClick={handleRefresh}
                    className="mt-4 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
                  >
                    Actualiser
                  </button>
                )}
              </div>
            ) : (
              getEmailsForTab().map((email) => {
                const associatedTicket = activeTab === 'processed' ? getTicketForEmail(email) : null;
                
                return (
                <div
                  key={email.id}
                  onClick={() => {
                    setSelectedEmail(email);
                    if (!email.isRead) {
                      markAsRead(email.id);
                    }
                  }}
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    selectedEmail?.id === email.id ? 'bg-orange-50 border-r-4 border-orange-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className={`text-sm font-medium ${email.isRead ? 'text-gray-700' : 'text-gray-900 font-semibold'}`}>
                        {email.subject}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">{email.from}</p>
                      {activeTab === 'processed' && associatedTicket && (
                        <div className="flex items-center mt-1">
                          <FileText className="w-3 h-3 text-green-600 mr-1" />
                          <span className="text-xs text-green-600 font-medium">
                            Ticket #{associatedTicket.id}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {email.hasAttachments && (
                        <Paperclip className="w-3 h-3 text-gray-400" />
                      )}
                      {!email.isRead && (
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      )}
                      {activeTab === 'processed' && (
                        <div className="w-2 h-2 bg-green-500 rounded-full" title="Email traité"></div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                    {email.snippet}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {formatDate(email.date)}
                    </span>
                    {activeTab === 'inbox' ? (
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCreateTicket(email);
                          }}
                          className="text-xs px-2 py-1 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded transition-colors flex items-center"
                          title="Créer un ticket depuis cet email"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Créer ticket
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEmail(email.id, email.subject);
                          }}
                          className="text-xs px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors flex items-center"
                          title="Supprimer cet email de la liste"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1">
                        {associatedTicket ? (
                          <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded flex items-center">
                            <FileText className="w-3 h-3 mr-1" />
                            Ticket #{associatedTicket.id}
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                            Traité
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                );
              })
            )}
          </div>
        </div>

        {/* Détail de l'email sélectionné */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Détail de l'email</h2>
              {selectedEmail && activeTab === 'processed' && (
                <div className="flex items-center text-green-600">
                  <Archive className="w-4 h-4 mr-1" />
                  <span className="text-sm font-medium">Email traité</span>
                </div>
              )}
            </div>
          </div>
          
          {selectedEmail ? (
            <div className="p-4 space-y-4">
              {/* Informations sur le ticket associé pour les emails traités */}
              {activeTab === 'processed' && (() => {
                const associatedTicket = getTicketForEmail(selectedEmail);
                return associatedTicket ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 text-green-600 mr-2" />
                        <span className="text-sm font-medium text-green-900">
                          Ticket associé : #{associatedTicket.id}
                        </span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        associatedTicket.status === 'Fermé' 
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {associatedTicket.status}
                      </span>
                    </div>
                    <p className="text-sm text-green-800 mt-1">
                      {associatedTicket.title}
                    </p>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center">
                      <Archive className="w-4 h-4 text-gray-600 mr-2" />
                      <span className="text-sm text-gray-700">
                        Email traité sans ticket associé trouvé
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">{selectedEmail.subject}</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    <span>De: {selectedEmail.from}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>{new Date(selectedEmail.date).toLocaleString('fr-FR')}</span>
                  </div>
                  {selectedEmail.hasAttachments && (
                    <div className="flex items-center">
                      <Paperclip className="w-4 h-4 mr-2" />
                      <span>Pièces jointes</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="border-t border-gray-200 pt-4">
                <h4 className="font-medium text-gray-900 mb-2">Contenu:</h4>
                <div className="bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedEmail.body || selectedEmail.snippet}
                  </p>
                </div>
              </div>
              
              {/* Formulaire de réponse */}
              {showReplyForm && (
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="font-medium text-gray-900 mb-2">Répondre:</h4>
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Tapez votre réponse..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                  <div className="flex space-x-2 mt-2">
                    <button
                      onClick={handleSendReply}
                      disabled={sendingReply || !replyContent.trim()}
                      className="flex items-center px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                    >
                      {sendingReply ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Envoi...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Envoyer
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setShowReplyForm(false);
                        setReplyContent('');
                      }}
                      className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
              
              {activeTab === 'inbox' ? (
                <div className="flex space-x-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleCreateTicket(selectedEmail)}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Créer un ticket
                  </button>
                  <button
                    onClick={() => handleDeleteEmail(selectedEmail.id, selectedEmail.subject)}
                    className="px-4 py-2 border border-red-300 hover:bg-red-50 text-red-700 rounded-lg transition-colors flex items-center"
                    title="Supprimer cet email"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Supprimer
                  </button>
                  <button
                    onClick={() => setShowReplyForm(!showReplyForm)}
                    className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors flex items-center"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Répondre
                  </button>
                  <button
                    onClick={() => window.open(`mailto:${selectedEmail.from}`, '_blank')}
                    className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex space-x-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setShowReplyForm(!showReplyForm)}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Répondre
                  </button>
                  <button
                    onClick={() => window.open(`mailto:${selectedEmail.from}`, '_blank')}
                    className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      // Remettre l'email dans la boîte de réception
                      const newProcessedEmails = new Set(processedEmails);
                      newProcessedEmails.delete(selectedEmail.id);
                      setProcessedEmails(newProcessedEmails);
                      saveProcessedEmails(newProcessedEmails);
                      setActiveTab('inbox');
                      setSelectedEmail(null);
                    }}
                    className="px-4 py-2 border border-blue-300 hover:bg-blue-50 text-blue-700 rounded-lg transition-colors flex items-center"
                    title="Remettre dans la boîte de réception"
                  >
                    <Inbox className="w-4 h-4 mr-2" />
                    Restaurer
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center">
              {activeTab === 'inbox' ? (
                <Inbox className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              ) : (
                <Archive className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              )}
              <p className="text-gray-600">
                Sélectionnez un email pour voir les détails
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GmailIntegration;
