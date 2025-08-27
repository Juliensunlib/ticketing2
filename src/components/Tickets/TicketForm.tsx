import React, { useState, useEffect } from 'react';
import { Save, X, Upload, User, Building, Users, Search, Paperclip } from 'lucide-react';
import { useTickets } from '../../hooks/useTickets';
import { useSupabaseUsers } from '../../hooks/useSupabaseUsers';
import { useAirtable } from '../../hooks/useAirtable';
import { Ticket } from '../../types';

interface TicketFormProps {
  ticket?: Ticket;
  onClose: () => void;
  onSuccess: () => void;
}

const TicketForm: React.FC<TicketFormProps> = ({ ticket, onClose, onSuccess }) => {
  const { createTicket, updateTicket } = useTickets();
  const { subscribers, loadData } = useAirtable();
  const { users: employees } = useSupabaseUsers();
  
  const [formData, setFormData] = useState({
    title: ticket?.title || '',
    description: ticket?.description || '',
    priority: (ticket?.priority || 'Moyenne') as 'Haute' | 'Moyenne' | 'Basse',
    status: (ticket?.status || 'Nouveau') as 'Nouveau' | 'En attente du client' | 'En attente de l\'installateur' | 'En attente retour service technique' | 'Fermé' | 'Ouvert',
    type: (ticket?.type || 'SAV / question technique') as 'SAV / question technique' | 'Recouvrement' | 'Plainte Installateur' | 'changement date prélèvement/RIB' | 'Résiliation anticipée / cession de contrat' | 'Ajout contrat / Flexibilité',
    origin: (ticket?.origin || 'SunLib') as 'Installateur' | 'SunLib' | 'Abonné',
    channel: (ticket?.channel || 'Formulaire de contact') as 'Mail' | 'Téléphone' | 'Formulaire de contact' | 'Site abonné' | 'Application SunLib',
    createdBy: 'emp1',
    assignedTo: ticket?.assignedTo || null,
    subscriberId: ticket?.subscriberId || '',
    installerId: ticket?.installerId || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [subscriberSearch, setSubscriberSearch] = useState(ticket?.subscriberId || '');
  const [showSubscriberDropdown, setShowSubscriberDropdown] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);

  useEffect(() => {
    console.log('TicketForm: Chargement des abonnés...');
    loadData();
  }, []);

  useEffect(() => {
    console.log('TicketForm: Données mises à jour');
    console.log('Abonnés:', subscribers);
    console.log('Employés Supabase:', employees);
  }, [subscribers, employees]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Le titre est obligatoire';
    if (!formData.description.trim()) newErrors.description = 'La description est obligatoire';
    if (!subscriberSearch.trim()) newErrors.subscriberId = 'Veuillez saisir le nom de l\'abonné';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Créer le ticket
    try {
      // Préparer les données avec le nom de l'abonné
      const ticketDataWithSubscriberName = {
        ...formData,
        subscriberId: subscriberSearch // Utilise le nom complet affiché
      };
      
      // Supprimer les pièces jointes des données de mise à jour pour éviter les erreurs
      const { attachments: _, ...ticketDataForUpdate } = ticketDataWithSubscriberName as any;
      
      if (ticket) {
        // Mode édition
        updateTicket(ticket.id, ticketDataForUpdate);
      } else {
        // Mode création
        createTicket(ticketDataForUpdate);
        
        // TODO: Gérer l'upload des pièces jointes après création du ticket
        if (attachments.length > 0) {
          console.log('Pièces jointes à traiter:', attachments);
        }
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du ticket:', error);
      setErrors({ general: 'Erreur lors de la sauvegarde du ticket' });
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
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
    setShowSubscriberDropdown(subscribers.length > 0); // Seulement si on a des abonnés
    // Réinitialiser la sélection si l'utilisateur tape
    if (formData.subscriberId) {
      setFormData(prev => ({ ...prev, subscriberId: '' }));
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files);
      setAttachments(prev => [...prev, ...newFiles]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {ticket ? 'Modifier le Ticket' : 'Nouveau Ticket'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Informations principales */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <User className="w-5 h-5 mr-2 text-orange-500" />
                Informations du Ticket
              </h3>
              
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
                  placeholder="Résumé du problème..."
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
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                    errors.description ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Description détaillée du problème..."
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Origine
                  </label>
                  <select
                    value={formData.origin}
                    onChange={(e) => handleChange('origin', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="Installateur">Installateur</option>
                    <option value="SunLib">SunLib</option>
                    <option value="Abonné">Abonné</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Canal d'entrée
                  </label>
                  <select
                    value={formData.channel}
                    onChange={(e) => handleChange('channel', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="Mail">Mail</option>
                    <option value="Téléphone">Téléphone</option>
                    <option value="Formulaire de contact">Formulaire de contact</option>
                    <option value="Site abonné">Site abonné</option>
                    <option value="Application SunLib">Application SunLib</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Assignation */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Users className="w-5 h-5 mr-2 text-orange-500" />
                Assignation
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Abonné concerné *
                </label>
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={subscriberSearch}
                      onChange={(e) => handleSubscriberSearchChange(e.target.value)}
                      onFocus={() => setShowSubscriberDropdown(true)}
                      placeholder={subscribers.length === 0 ? 'Saisir manuellement le nom de l\'abonné (ex: Jean Dupont - SL-000123)' : 'Rechercher un abonné...'}
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
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-gray-500 text-center">
                          Aucun abonné trouvé pour "{subscriberSearch}"
                        </div>
                      )}
                    </div>
                  )}
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


              {/* Zone de téléchargement - Désactivée temporairement en mode édition */}
              {!ticket && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pièces jointes
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-orange-400 transition-colors cursor-pointer"
                     onClick={() => document.getElementById('file-upload')?.click()}>
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    Glissez vos fichiers ici ou <span className="text-orange-600 font-medium">parcourez</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    PNG, JPG, PDF jusqu'à 10MB
                  </p>
                  <input
                    id="file-upload"
                    type="file"
                    multiple
                    accept=".png,.jpg,.jpeg,.pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
                
                {/* Liste des fichiers sélectionnés */}
                {attachments.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">Fichiers sélectionnés :</h4>
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <Paperclip className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-700">{file.name}</span>
                          <span className="text-xs text-gray-500 ml-2">
                            ({(file.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              )}
              
              {/* Message pour le mode édition */}
              {ticket && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    💡 <strong>Mode édition :</strong> L'ajout de pièces jointes sera disponible prochainement. 
                    Vous pouvez modifier les autres informations du ticket.
                  </p>
                </div>
              )}
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
              {ticket ? 'Modifier le Ticket' : 'Créer le Ticket'}
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

export default TicketForm;