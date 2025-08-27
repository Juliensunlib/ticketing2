import React, { useState } from 'react';
import { X, Edit, MessageCircle, Paperclip, Clock, User, Building, Phone, Mail, Calendar, Tag, AlertCircle, ExternalLink, Send, Plus, AtSign } from 'lucide-react';
import { Ticket } from '../../types';
import { useTickets } from '../../hooks/useTickets';
import { useAuth } from '../../contexts/AuthContext';
import { useSupabaseUsers } from '../../hooks/useSupabaseUsers';
import { useAirtable } from '../../hooks/useAirtable';
import gmailService from '../../services/gmailService';

interface TicketDetailProps {
  ticket: Ticket;
  onClose: () => void;
}

const TicketDetail: React.FC<TicketDetailProps> = ({ ticket, onClose }) => {
  const { tickets, updateTicket, addComment } = useTickets();
  const { user } = useAuth();
  const { users } = useSupabaseUsers();
  const { subscribers } = useAirtable();
  const [newComment, setNewComment] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [commentType, setCommentType] = useState<'comment' | 'email'>('comment');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailRecipient, setEmailRecipient] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [editData, setEditData] = useState({
    status: ticket.status,
    priority: ticket.priority,
    assignedTo: ticket.assignedTo || ''
  });
  const [showEmailReply, setShowEmailReply] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  // Utiliser le ticket mis à jour depuis l'état global au lieu de la prop
  const currentTicket = tickets.find(t => t.id === ticket.id) || ticket;

  const handleStatusUpdate = async () => {
    try {
      console.log('🔍 Mise à jour avec les données:', editData);
      console.log('🔍 ID du ticket:', ticket.id);
      console.log('🔍 Statut actuel:', ticket.status);
      console.log('🔍 Nouveau statut:', editData.status);
      
      // Préparer les données de mise à jour
      const updateData = {
        status: editData.status,
        priority: editData.priority,
        assigned_to: editData.assignedTo === '' ? null : editData.assignedTo
      };
      
      console.log('🔍 Données à envoyer:', updateData);
      
      const result = await updateTicket(ticket.id, updateData);
      console.log('✅ Résultat de la mise à jour:', result);
      
      // Afficher un message de succès
      alert('Ticket mis à jour avec succès !');
      
      setIsEditing(false);
      
      // Fermer le modal et forcer le rechargement
      onClose();
      
      // Attendre un peu avant de recharger pour laisser le temps à Supabase
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      alert(`Erreur lors de la mise à jour du ticket: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;

    setSendingComment(true);

    if (commentType === 'email') {
      handleSendEmailFromComment();
    } else {
      // Commentaire simple
      addComment(ticket.id, newComment).then(() => {
        console.log('✅ Commentaire ajouté avec succès');
        setNewComment('');
      }).catch((error) => {
        console.error('Erreur lors de l\'ajout du commentaire:', error);
        alert('Erreur lors de l\'ajout du commentaire');
      }).finally(() => {
        setSendingComment(false);
      });
    }
  };

  const handleSendEmailFromComment = async () => {
    if (!newComment.trim()) return;

    // Utiliser l'email saisi manuellement ou celui détecté automatiquement
    const finalEmail = emailRecipient.trim();
    
    if (!finalEmail) {
      alert('Veuillez saisir une adresse email valide.');
      setSendingComment(false);
      return;
    }

    // Validation basique de l'email
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(finalEmail)) {
      alert('Format d\'adresse email invalide.');
      setSendingComment(false);
      return;
    }

    try {
      // Vérifier l'authentification Gmail avant d'envoyer
      if (!gmailService.isAuthenticated()) {
        alert('Vous devez être connecté à Gmail pour envoyer des emails. Allez dans l\'onglet "Emails Abonnés" pour vous connecter.');
        setSendingComment(false);
        return;
      }

      const subject = emailSubject || `Réponse à votre ticket #${currentTicket.id} - ${currentTicket.title}`;
      const emailBody = `Bonjour,

Suite à votre demande concernant le ticket #${currentTicket.id}, voici notre réponse :

${newComment}

Si vous avez d'autres questions, n'hésitez pas à nous recontacter.

Cordialement,
L'équipe SunLib

---
Ticket #${currentTicket.id} - ${currentTicket.title}
Statut: ${currentTicket.status}
Priorité: ${currentTicket.priority}`;

      console.log('📧 Envoi email vers:', finalEmail);
      console.log('📧 Sujet:', subject);
      
      // Envoyer l'email via Gmail (nouveau email, pas une réponse)
      await gmailService.sendEmail(finalEmail, subject, emailBody);
      
      // Ajouter aussi un commentaire au ticket
      await addComment(currentTicket.id, `📧 Email envoyé à ${finalEmail} :\n\nSujet: ${subject}\n\n${newComment}`);
      
      setNewComment('');
      setEmailSubject('');
      setEmailRecipient('');
      setCommentType('comment');
      alert('Email envoyé avec succès !');
      
    } catch (error) {
      console.error('Erreur envoi email:', error);
      
      // Messages d'erreur plus spécifiques
      if (error instanceof Error) {
        alert(`Erreur lors de l'envoi de l'email: ${error.message}`);
      } else {
        alert('Erreur lors de l\'envoi de l\'email. Vérifiez que vous êtes connecté à Gmail.');
      }
    } finally {
      setSendingComment(false);
    }
  };

  // Fonction pour détecter automatiquement l'email de l'abonné
  const detectSubscriberEmail = () => {
    console.log('🔍 === DÉTECTION EMAIL AUTOMATIQUE ===');
    console.log('🔍 Abonné recherché:', currentTicket.subscriberId);
    console.log('🔍 Nombre d\'abonnés Airtable disponibles:', subscribers.length);
    
    // 1. D'abord, chercher un email directement dans le subscriberId (format "Nom <email@domain.com>")
    const emailInSubscriberIdMatch = currentTicket.subscriberId?.match(/<([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>/);
    if (emailInSubscriberIdMatch) {
      console.log('✅ Email trouvé dans subscriberId (format <email>):', emailInSubscriberIdMatch[1]);
      return emailInSubscriberIdMatch[1];
    }
    console.log('❌ Pas d\'email trouvé au format <email>');
    
    // 2. Si pas trouvé, chercher un email simple dans le subscriberId
    const emailMatch = currentTicket.subscriberId?.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) {
      console.log('✅ Email trouvé dans subscriberId (format simple):', emailMatch[1]);
      return emailMatch[1];
    }
    console.log('❌ Pas d\'email trouvé au format simple');
    
    // 3. Si toujours pas trouvé, chercher dans les abonnés Airtable
    console.log('🔍 Recherche dans Airtable...');
    console.log('🔍 Abonnés disponibles:', subscribers.map(s => ({ 
      nom: s.nom, 
      prenom: s.prenom, 
      contrat: s.contratAbonne, 
      email: s.email 
    })));
    
    const subscriber = subscribers.find(sub => 
      currentTicket.subscriberId?.includes(sub.contratAbonne) || 
      currentTicket.subscriberId?.includes(`${sub.prenom} ${sub.nom}`) ||
      currentTicket.subscriberId?.includes(sub.nom) ||
      currentTicket.subscriberId?.includes(sub.prenom)
    );
    
    if (subscriber?.email) {
      console.log('✅ Email trouvé dans Airtable:', subscriber.email);
      console.log('✅ Abonné trouvé:', subscriber);
      return subscriber.email;
    }
    
    if (subscriber) {
      console.log('⚠️ Abonné trouvé mais sans email:', subscriber);
    } else {
      console.log('❌ Aucun abonné correspondant trouvé');
    }
    
    console.log('❌ Aucun email trouvé pour:', currentTicket.subscriberId);
    console.log('🔍 === FIN DÉTECTION ===');
    return '';
  };

  // Détecter l'email automatiquement quand on passe en mode email
  React.useEffect(() => {
    if (commentType === 'email' && !emailRecipient) {
      const detectedEmail = detectSubscriberEmail();
      setEmailRecipient(detectedEmail);
    }
  }, [commentType, currentTicket.subscriberId, subscribers]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Haute': return 'text-red-600 bg-red-100 border-red-200';
      case 'Moyenne': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'Basse': return 'text-green-600 bg-green-100 border-green-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Nouveau': return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'En attente du client': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'En attente de l\'installateur': return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'En attente retour service technique': return 'text-purple-600 bg-purple-100 border-purple-200';
      case 'Fermé': return 'text-gray-600 bg-gray-100 border-gray-200';
      case 'Ouvert': return 'text-green-600 bg-green-100 border-green-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'SAV / question technique': return AlertCircle;
      case 'Recouvrement': return Tag;
      case 'Plainte Installateur': return User;
      case 'changement date prélèvement/RIB': return Calendar;
      case 'Résiliation anticipée / cession de contrat': return X;
      case 'Ajout contrat / Flexibilité': return Building;
      default: return User;
    }
  };

  const TypeIcon = getTypeIcon(currentTicket.type);

  // Trouver l'abonné correspondant dans Airtable
  const subscriber = subscribers.find(sub => 
    currentTicket.subscriberId.includes(sub.contratAbonne) || 
    currentTicket.subscriberId.includes(`${sub.prenom} ${sub.nom}`)
  );

  // Fonction pour détecter si le ticket vient d'un email
  const isFromEmail = () => {
    return currentTicket.description.includes('Email reçu de:') || 
           currentTicket.description.includes('De: ') ||
           currentTicket.channel === 'Mail';
  };

  // Fonction pour extraire l'email depuis la description du ticket (si créé depuis email)
  const getEmailFromDescription = () => {
    if (!isFromEmail()) return null;
    
    console.log('🔍 === EXTRACTION EMAIL DEPUIS DESCRIPTION ===');
    console.log('🔍 Description du ticket:', currentTicket.description);
    
    // 1. Chercher "Email reçu de: Nom <email@domain.com>" ou "Email reçu de: email@domain.com"
    const emailRecuMatch = currentTicket.description.match(/Email reçu de:\s*(?:[^<]*<)?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>?/);
    if (emailRecuMatch) {
      console.log('✅ Email trouvé avec "Email reçu de:":', emailRecuMatch[1]);
      return emailRecuMatch[1];
    }
    console.log('❌ Pas d\'email trouvé avec "Email reçu de:"');
    
    // 2. Chercher "De: Nom <email@domain.com>" ou "De: email@domain.com"
    const fromMatch = currentTicket.description.match(/De:\s*(?:[^<]*<)?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>?/);
    if (fromMatch) {
      console.log('✅ Email trouvé avec "De:":', fromMatch[1]);
      return fromMatch[1];
    }
    console.log('❌ Pas d\'email trouvé avec "De:"');
    
    // 3. Chercher n'importe quel email dans la description
    const anyEmailMatch = currentTicket.description.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (anyEmailMatch) {
      console.log('✅ Email trouvé (recherche générale):', anyEmailMatch[1]);
      return anyEmailMatch[1];
    }
    console.log('❌ Aucun email trouvé dans la description');
    
    console.log('🔍 === FIN EXTRACTION ===');
    
    return null;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex">
        {/* Contenu principal */}
        <div className="flex-1 overflow-y-auto">
          {/* En-tête */}
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <TypeIcon className="w-5 h-5 text-orange-500" />
                  <h1 className="text-xl font-semibold text-gray-900">
                    {currentTicket.subscriberId} - Ticket #{currentTicket.id}
                  </h1>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(currentTicket.priority)}`}>
                    {currentTicket.priority}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(currentTicket.status)}`}>
                    {currentTicket.status}
                  </span>
                </div>
                <h2 className="text-lg font-medium text-gray-900 mb-2">{currentTicket.title}</h2>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    Créé le {new Date(currentTicket.createdAt).toLocaleDateString('fr-FR')}
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    Mis à jour le {new Date(currentTicket.updatedAt).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Contenu */}
          <div className="p-6 space-y-6">
            {/* Description */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Description</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700 whitespace-pre-wrap">{currentTicket.description}</p>
              </div>
            </div>

            {/* Informations détaillées */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Informations du ticket</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Type</span>
                    <span className="text-sm font-medium text-gray-900 capitalize">{currentTicket.type}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Origine</span>
                    <span className="text-sm font-medium text-gray-900">{currentTicket.origin}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Canal</span>
                    <span className="text-sm font-medium text-gray-900">{currentTicket.channel}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-600">Créé par</span>
                    <span className="text-sm font-medium text-gray-900">
                      {currentTicket.createdBy || 'Utilisateur inconnu'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Assignation</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Assigné à</span>
                    <span className="text-sm font-medium text-gray-900">
                      {currentTicket.assignedTo 
                        ? users.find(u => u.id === currentTicket.assignedTo)?.name || 'Utilisateur inconnu'
                        : 'Non assigné'
                      }
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Abonné</span>
                    <span className="text-sm font-medium text-gray-900">
                      {currentTicket.subscriberId}
                    </span>
                  </div>
                  {subscriber?.lienCRM && (
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">Fiche CRM</span>
                      <a
                        href={subscriber.lienCRM}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors"
                      >
                        Voir la fiche
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </div>
                  )}
                  
                  {/* Email du client */}
                  {(subscriber?.email || getEmailFromDescription()) && (
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600 flex items-center">
                        <AtSign className="w-3 h-3 mr-1" />
                        Email
                      </span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900">
                          {subscriber?.email || getEmailFromDescription()}
                        </span>
                        <a
                          href={`mailto:${subscriber?.email || getEmailFromDescription()}`}
                          className="text-orange-600 hover:text-orange-700 transition-colors"
                          title="Envoyer un email"
                        >
                          <Mail className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  )}
                  
                  {/* Téléphone du client (uniquement si client Airtable) */}
                  {subscriber?.telephone && !isFromEmail() && (
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600 flex items-center">
                        <Phone className="w-3 h-3 mr-1" />
                        Téléphone
                      </span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900">
                          {subscriber.telephone}
                        </span>
                        <a
                          href={`tel:${subscriber.telephone}`}
                          className="text-orange-600 hover:text-orange-700 transition-colors"
                          title="Appeler"
                        >
                          <Phone className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  )}
                  
                  {currentTicket.installerId && (
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-600">Installateur</span>
                      <span className="text-sm font-medium text-gray-900">{currentTicket.installerId}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Pièces jointes */}
            {currentTicket.attachments.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                  <Paperclip className="w-5 h-5 mr-2" />
                  Pièces jointes ({currentTicket.attachments.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {currentTicket.attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center p-3 bg-gray-50 rounded-lg">
                      <Paperclip className="w-4 h-4 text-gray-400 mr-3" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{attachment.name}</p>
                        <p className="text-xs text-gray-500">
                          Ajouté le {new Date(attachment.uploadedAt).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Formulaire d'envoi d'email */}

            {/* Commentaires */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                <MessageCircle className="w-5 h-5 mr-2" />
                Historique ({currentTicket.comments.length})
              </h3>
              
              <div className="space-y-4">
                {currentTicket.comments.map((comment) => (
                  <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {comment.content.startsWith('📧 Email envoyé') ? (
                          <Mail className="w-4 h-4 text-blue-500" />
                        ) : (
                          <MessageCircle className="w-4 h-4 text-gray-500" />
                        )}
                        <span className="text-sm font-medium text-gray-900">{comment.authorName}</span>
                        {comment.content.startsWith('📧 Email envoyé') && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            Email envoyé
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(comment.createdAt).toLocaleDateString('fr-FR')} à {new Date(comment.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                  </div>
                ))}
                
                {/* Nouveau commentaire */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-900">Ajouter une réponse :</h4>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCommentType('comment')}
                        className={`flex items-center px-3 py-1 rounded-lg transition-colors text-sm ${
                          commentType === 'comment' 
                            ? 'bg-gray-200 text-gray-900' 
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                      >
                        <MessageCircle className="w-4 h-4 mr-1" />
                        Commentaire
                      </button>
                      <button
                        onClick={() => setCommentType('email')}
                        className={`flex items-center px-3 py-1 rounded-lg transition-colors text-sm ${
                          commentType === 'email' 
                            ? 'bg-blue-200 text-blue-900' 
                            : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                        }`}
                      >
                        <Send className="w-4 h-4 mr-1" />
                        Email à l'abonné
                      </button>
                    </div>
                  </div>

                  {commentType === 'email' && (
                    <div className="mb-3">
                      <div className="bg-blue-50 rounded-lg p-3 mb-3">
                        <p className="text-sm text-blue-800">
                          📧 Email sera envoyé depuis <strong>abonne@sunlib.fr</strong> vers l'abonné concerné par ce ticket.
                        </p>
                      </div>
                      
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Destinataire *
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="email"
                            value={emailRecipient}
                            onChange={(e) => setEmailRecipient(e.target.value)}
                            placeholder="adresse@email.com"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const detectedEmail = detectSubscriberEmail();
                              if (detectedEmail) {
                                setEmailRecipient(detectedEmail);
                                console.log('✅ Email mis à jour:', detectedEmail);
                              } else {
                                console.log('❌ Aucun email détecté, conservation de l\'email actuel');
                                alert('Aucun email automatique trouvé. Vérifiez que l\'abonné a un email dans Airtable ou saisissez l\'email manuellement.');
                              }
                            }}
                            className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors text-sm"
                            title="Détecter automatiquement l'email"
                          >
                            🔍 Auto
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Email détecté automatiquement ou saisissez manuellement
                        </p>
                      </div>
                      
                      <input
                        type="text"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        placeholder={`Réponse à votre ticket #${currentTicket.id} - ${currentTicket.title}`}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-2"
                      />
                      <label className="text-xs text-gray-500">Sujet de l'email (optionnel)</label>
                    </div>
                  )}

                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={
                      commentType === 'email' 
                        ? "Tapez votre message à l'abonné..." 
                        : "Ajouter un commentaire interne..."
                    }
                    rows={4}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-orange-500 ${
                      commentType === 'email' 
                        ? 'border-blue-300 focus:ring-blue-500 focus:border-blue-500' 
                        : 'border-gray-300 focus:ring-orange-500'
                    }`}
                  />
                  
                  <div className="flex justify-between items-center mt-3">
                    <div className="text-xs text-gray-500">
                      {commentType === 'email' ? (
                        <span className="flex items-center">
                          <Send className="w-3 h-3 mr-1" />
                          Sera envoyé par email ET ajouté aux commentaires
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <MessageCircle className="w-3 h-3 mr-1" />
                          Commentaire interne uniquement
                        </span>
                      )}
                    </div>
                    <button
                      onClick={handleAddComment}
                      disabled={!newComment.trim() || sendingComment || (commentType === 'email' && !emailRecipient.trim())}
                      className={`px-4 py-2 rounded-lg transition-colors text-white ${
                        commentType === 'email'
                          ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300'
                          : 'bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300'
                      }`}
                    >
                      {sendingComment ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                          {commentType === 'email' ? 'Envoi...' : 'Ajout...'}
                        </>
                      ) : (
                        <>
                          {commentType === 'email' ? (
                            <>
                              <Send className="w-4 h-4 mr-2 inline-block" />
                              Envoyer l'email
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4 mr-2 inline-block" />
                              Ajouter
                            </>
                          )}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Panneau d'édition */}
        {isEditing && (
          <div className="w-80 border-l border-gray-200 bg-gray-50 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Modifier le ticket</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Statut
                </label>
                <select
                  value={editData.status}
                  onChange={(e) => setEditData(prev => ({ ...prev, status: e.target.value as any }))}
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priorité
                </label>
                <select
                  value={editData.priority}
                  onChange={(e) => setEditData(prev => ({ ...prev, priority: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="Basse">Basse</option>
                  <option value="Moyenne">Moyenne</option>
                  <option value="Haute">Haute</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assigné à
                </label>
                <select
                  value={editData.assignedTo}
                  onChange={(e) => setEditData(prev => ({ ...prev, assignedTo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">Non assigné</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-2 pt-4">
                <button
                  onClick={handleStatusUpdate}
                  className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
                >
                  Sauvegarder
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketDetail;