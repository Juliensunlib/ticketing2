import { Save, X, Mail, User, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { useTickets } from '../../hooks/useTickets';
import { useSupabaseUsers } from '../../hooks/useSupabaseUsers';
import { useAirtable } from '../../hooks/useAirtable';
import { Search } from 'lucide-react';
import React, { useState, useEffect } from 'react';

interface Email {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  body?: string;
  hasAttachments: boolean;
  isRead: boolean;
}

interface TicketFormFromEmailProps {
  email: Email;
  onClose: () => void;
  onSuccess: () => void;
}

const TicketFormFromEmail: React.FC<TicketFormFromEmailProps> = ({ email, onClose, onSuccess }) => {
  const { createTicket } = useTickets();
  const { users: employees } = useSupabaseUsers();
  const { subscribers, loadData } = useAirtable();
  
  const [subscriberSearch, setSubscriberSearch] = useState('');
  const [showSubscriberDropdown, setShowSubscriberDropdown] = useState(false);
  const [subscriberType, setSubscriberType] = useState<'airtable' | 'email'>('email');
  const [manualSubscriberName, setManualSubscriberName] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  
  const [formData, setFormData] = useState({
    title: email.subject,
    description: `Email reçu de: ${email.from}\nDate: ${new Date(email.date).toLocaleString('fr-FR')}\n\n${email.body || email.snippet}`,
    priority: 'Moyenne' as 'Haute' | 'Moyenne' | 'Basse',
    status: 'Nouveau' as 'Nouveau' | 'En attente du client' | 'En attente de l\'installateur' | 'En attente retour service technique' | 'Fermé' | 'Ouvert',
    type: 'SAV / question technique' as 'SAV / question technique' | 'Recouvrement' | 'Plainte Installateur' | 'changement date prélèvement/RIB' | 'Résiliation anticipée / cession de contrat' | 'Ajout contrat / Flexibilité',
    origin: 'Abonné' as 'Installateur' | 'SunLib' | 'Abonné',
    channel: 'Mail' as 'Mail' | 'Téléphone' | 'Formulaire de contact' | 'Site abonné' | 'Application SunLib',
    assignedTo: '',
    subscriberId: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Charger les abonnés Airtable au chargement
  useEffect(() => {
    console.log('TicketFormFromEmail: Chargement des abonnés...');
    loadData();
    
    // Pré-remplir avec l'email de l'expéditeur pour suggestion
    const emailMatch = email.from.match(/<(.+)>/) || email.from.match(/([^\s<>]+@[^\s<>]+)/);
    const senderEmail = emailMatch ? emailMatch[1] || emailMatch[0] : email.from;
    setManualEmail(senderEmail);
    
    // Pré-remplir le nom de l'abonné depuis l'email si possible
    const nameMatch = email.from.match(/^([^<]+)</);
    if (nameMatch) {
      setManualSubscriberName(nameMatch[1].trim());
    }
    
    // Essayer de trouver automatiquement l'abonné dans Airtable par email
    if (senderEmail && subscribers.length > 0) {
      const foundSubscriber = subscribers.find(sub => 
        sub.email && sub.email.toLowerCase() === senderEmail.toLowerCase()
      );
      
      if (foundSubscriber) {
        console.log('✅ Abonné trouvé automatiquement dans Airtable:', foundSubscriber);
        setSubscriberType('airtable');
        const subscriberDisplayName = `${foundSubscriber.prenom} ${foundSubscriber.nom} - ${foundSubscriber.contratAbonne}`;
        setSubscriberSearch(subscriberDisplayName);
        setFormData(prev => ({ ...prev, subscriberId: foundSubscriber.id }));
      } else {
        console.log('ℹ️ Abonné non trouvé dans Airtable, utilisation de l\'email');
        setSubscriberType('email');
      }
    }
  }, []);

  useEffect(() => {
    console.log('TicketFormFromEmail: Données mises à jour');
    console.log('Abonnés:', subscribers);
  }, [subscribers]);

  // Détection automatique du type de ticket basé sur le contenu
  React.useEffect(() => {
    const content = (email.subject + ' ' + email.snippet).toLowerCase();
    
    if (content.includes('prélèvement') || content.includes('rib') || content.includes('paiement')) {
      setFormData(prev => ({ ...prev, type: 'changement date prélèvement/RIB' }));
    } else if (content.includes('résiliation') || content.includes('cession')) {
      setFormData(prev => ({ ...prev, type: 'Résiliation anticipée / cession de contrat' }));
    } else if (content.includes('recouvrement') || content.includes('facture') || content.includes('impayé')) {
      setFormData(prev => ({ ...prev, type: 'Recouvrement' }));
    } else if (content.includes('installateur') || content.includes('plainte')) {
      setFormData(prev => ({ ...prev, type: 'Plainte Installateur' }));
    } else if (content.includes('contrat') || content.includes('ajout') || content.includes('flexibilité')) {
      setFormData(prev => ({ ...prev, type: 'Ajout contrat / Flexibilité' }));
    }
    
    // Détection de la priorité
    if (content.includes('urgent') || content.includes('panne') || content.includes('problème grave')) {
      setFormData(prev => ({ ...prev, priority: 'Haute' }));
    }
  }, [email]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Le titre est obligatoire';
    if (!formData.description.trim()) newErrors.description = 'La description est obligatoire';
    
    // Validation selon le type d'abonné
    if (subscriberType === 'airtable' && !formData.subscriberId.trim()) {
      newErrors.subscriberId = 'Veuillez choisir un abonné dans la liste';
    } else if (subscriberType === 'email' && !manualEmail.trim()) {
      newErrors.subscriberId = 'Veuillez saisir l\'adresse email';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      // Préparer les données selon le type d'abonné
      let ticketData = { ...formData };
      
      if (subscriberType === 'email') {
        // Utiliser le nom extrait de l'email + l'adresse email
        const displayName = manualSubscriberName ? 
          `${manualSubscriberName} <${manualEmail}>` : 
          manualEmail;
        ticketData.subscriberId = displayName;
      }
      
      createTicket(ticketData);
      
      // Marquer l'email comme traité dans le localStorage
      const processedEmails = JSON.parse(localStorage.getItem('processed_emails') || '[]');
      processedEmails.push(email.id);
      localStorage.setItem('processed_emails', JSON.stringify(processedEmails));
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erreur lors de la création du ticket:', error);
      setErrors({ general: 'Erreur lors de la création du ticket' });
    }
  };

  // Filtrer les abonnés selon la recherche
  const filteredSubscribers = subscribers.filter(subscriber => {
    const searchTerm = subscriberSearch.toLowerCase();
    return (
      subscriber.nom.toLowerCase().includes(searchTerm) ||
      subscriber.prenom.toLowerCase().includes(searchTerm) ||
      subscriber.contratAbonne.toLowerCase().includes(searchTerm) ||
      (subscriber.nomEntreprise && subscriber.nomEntreprise.toLowerCase().includes(searchTerm))
    );
  });

  const handleSubscriberSelect = (subscriber: any) => {
    setFormData(prev => ({ ...prev, subscriberId: subscriber.id }));
    const subscriberDisplayName = `${subscriber.prenom} ${subscriber.nom} - ${subscriber.contratAbonne}`;
    setSubscriberSearch(subscriberDisplayName);
    setShowSubscriberDropdown(false);
    if (errors.subscriberId) {
      setErrors(prev => ({ ...prev, subscriberId: '' }));
    }
  };

  const handleSubscriberSearchChange = (value: string) => {
    setSubscriberSearch(value);
    setShowSubscriberDropdown(subscribers.length > 0);
    // Réinitialiser la sélection si l'utilisateur tape
    if (formData.subscriberId) {
      setFormData(prev => ({ ...prev, subscriberId: '' }));
    }
  };

  const handleSubscriberTypeChange = (type: 'airtable' | 'email') => {
    setSubscriberType(type);
    setSubscriberSearch('');
    setFormData(prev => ({ ...prev, subscriberId: '' }));
    setShowSubscriberDropdown(false);
    if (errors.subscriberId) {
      setErrors(prev => ({ ...prev, subscriberId: '' }));
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Mail className="w-5 h-5 mr-2 text-orange-500" />
            Créer un Ticket depuis Email
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Informations de l'email source */}
        <div className="p-6 bg-blue-50 border-b border-gray-200">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Email source :</h3>
          <div className="space-y-1 text-sm text-blue-800">
            <div className="flex items-center">
              <User className="w-4 h-4 mr-2" />
              <span>De: {email.from}</span>
            </div>
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              <span>Date: {new Date(email.date).toLocaleString('fr-FR')}</span>
            </div>
            <div className="flex items-center">
              <Mail className="w-4 h-4 mr-2" />
              <span>Sujet: {email.subject}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errors.general && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">{errors.general}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Informations du ticket */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Informations du Ticket</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titre du ticket *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                    errors.title ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  rows={6}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                    errors.description ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priorité
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => handleChange('priority', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="Basse">Basse</option>
                    <option value="Moyenne">Moyenne</option>
                    <option value="Haute">Haute</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Statut
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="Nouveau">Nouveau</option>
                    <option value="En attente du client">En attente du client</option>
                    <option value="En attente de l'installateur">En attente de l'installateur</option>
                    <option value="En attente retour service technique">En attente retour service technique</option>
                    <option value="Fermé">Fermé</option>
                    <option value="Ouvert">Ouvert</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type de problème
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => handleChange('type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="SAV / question technique">SAV / question technique</option>
                  <option value="Recouvrement">Recouvrement</option>
                  <option value="Plainte Installateur">Plainte Installateur</option>
                  <option value="changement date prélèvement/RIB">changement date prélèvement/RIB</option>
                  <option value="Résiliation anticipée / cession de contrat">Résiliation anticipée / cession de contrat</option>
                  <option value="Ajout contrat / Flexibilité">Ajout contrat / Flexibilité</option>
                </select>
              </div>
            </div>

            {/* Assignation */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Assignation</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Abonné concerné *
                </label>
                
                {/* Sélecteur de type d'abonné */}
                <div className="mb-4">
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => handleSubscriberTypeChange('airtable')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        subscriberType === 'airtable'
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      📋 Client Airtable
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSubscriberTypeChange('email')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        subscriberType === 'email'
                          ? 'bg-orange-100 text-orange-800 border border-orange-300'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      📧 Adresse Email
                    </button>
                  </div>
                </div>
                
                {subscriberType === 'airtable' && (
                  <div className="space-y-3">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800">
                        📋 <strong>Client Airtable</strong> - Sélectionnez un abonné existant dans votre base de données
                      </p>
                    </div>
                    <div className="relative">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="text"
                          value={subscriberSearch}
                          onChange={(e) => handleSubscriberSearchChange(e.target.value)}
                          onFocus={() => setShowSubscriberDropdown(true)}
                          placeholder={subscribers.length === 0 ? 'Chargement des clients...' : 'Rechercher par nom, prénom ou contrat...'}
                          className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                            errors.subscriberId ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                      </div>
                      
                      {/* Dropdown des résultats */}
                      {showSubscriberDropdown && subscribers.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {filteredSubscribers.length > 0 ? (
                            filteredSubscribers.map((subscriber) => (
                              <button
                                key={subscriber.id}
                                type="button"
                                onClick={() => handleSubscriberSelect(subscriber)}
                                className="w-full text-left px-4 py-3 hover:bg-orange-50 focus:bg-orange-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                              >
                                <div className="font-medium text-gray-900">
                                  {subscriber.prenom} {subscriber.nom}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {subscriber.contratAbonne}
                                  {subscriber.nomEntreprise && (
                                    <span className="ml-2 text-orange-600">({subscriber.nomEntreprise})</span>
                                  )}
                                  {subscriber.installateur && (
                                    <span className="ml-2 text-blue-600">- {subscriber.installateur}</span>
                                  )}
                                  {subscriber.email && (
                                    <span className="ml-2 text-green-600">📧 {subscriber.email}</span>
                                  )}
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-3 text-gray-500 text-center">
                              <div>Aucun client trouvé pour "{subscriberSearch}"</div>
                              <button
                                type="button"
                                onClick={() => handleSubscriberTypeChange('email')}
                                className="mt-2 text-sm text-orange-600 hover:text-orange-700 underline"
                              >
                                Utiliser l'adresse email à la place
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {subscriberType === 'email' && (
                  <div className="space-y-3">
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <p className="text-sm text-orange-800">
                        📧 <strong>Adresse Email</strong> - Pour un client non répertorié dans Airtable
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nom du client (optionnel)
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="text"
                          value={manualSubscriberName}
                          onChange={(e) => setManualSubscriberName(e.target.value)}
                          placeholder="Nom et prénom du client"
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Adresse email *
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="email"
                          value={manualEmail}
                          onChange={(e) => setManualEmail(e.target.value)}
                          placeholder="adresse@email.com"
                          className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                            errors.subscriberId ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                      </div>
                    </div>
                    
                    {subscribers.length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800 mb-2">
                          💡 <strong>Suggestion :</strong> Vérifiez si ce client existe dans Airtable
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            handleSubscriberTypeChange('airtable');
                            setSubscriberSearch(manualEmail);
                            setShowSubscriberDropdown(true);
                          }}
                          className="text-sm text-blue-600 hover:text-blue-700 underline"
                        >
                          Rechercher "{manualEmail}" dans la base Airtable
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    💡 <strong>Email source :</strong> {email.from}
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    {subscriberType === 'airtable' ? 
                      'Les réponses seront envoyées à l\'email du client Airtable' :
                      'Les réponses seront envoyées à cette adresse email'
                    }
                  </p>
                </div>
                
                {errors.subscriberId && <p className="text-red-500 text-sm mt-1">{errors.subscriberId}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assigné à
                </label>
                <select
                  value={formData.assignedTo}
                  onChange={(e) => handleChange('assignedTo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">Non assigné</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name} - {employee.user_group}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors flex items-center"
            >
              <Save className="w-4 h-4 mr-2" />
              Créer le Ticket
            </button>
          </div>
        </form>

        {/* Overlay pour fermer le dropdown */}
        {showSubscriberDropdown && (
          <div 
            className="fixed inset-0 z-5"
            onClick={() => setShowSubscriberDropdown(false)}
          />
        )}
      </div>
    </div>
  );
};

export default TicketFormFromEmail;
