import React, { useState } from 'react';
import { Save, X, Calendar, AlertCircle, FileText } from 'lucide-react';
import { useTasks } from '../../hooks/useTasks';
import { useTickets } from '../../hooks/useTickets';
import { Task } from '../../types';

interface TaskFormProps {
  task?: Task;
  ticketId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const TaskForm: React.FC<TaskFormProps> = ({ task, ticketId, onClose, onSuccess }) => {
  const { createTask, updateTask } = useTasks();
  const { tickets } = useTickets();
  
  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    dueDate: task?.dueDate || new Date().toISOString().split('T')[0],
    status: (task?.status || 'pending') as 'pending' | 'in_progress' | 'completed' | 'cancelled',
    priority: (task?.priority || 'medium') as 'low' | 'medium' | 'high' | 'urgent',
    ticketId: task?.ticketId || ticketId || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Le titre est obligatoire';
    if (!formData.dueDate) newErrors.dueDate = 'La date d\'échéance est obligatoire';

    // Vérifier que la date n'est pas dans le passé (sauf si c'est une modification)
    const today = new Date().toISOString().split('T')[0];
    if (!task && formData.dueDate < today) {
      newErrors.dueDate = 'La date d\'échéance ne peut pas être dans le passé';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      if (task) {
        await updateTask(task.id, formData);
      } else {
        await createTask(formData);
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la tâche:', error);
      setErrors({ general: error instanceof Error ? error.message : 'Erreur inconnue' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-100 border-green-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'in_progress': return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'completed': return 'text-green-600 bg-green-100 border-green-200';
      case 'cancelled': return 'text-gray-600 bg-gray-100 border-gray-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  // Trouver le ticket associé si un ticketId est fourni
  const associatedTicket = formData.ticketId ? tickets.find(t => t.id === formData.ticketId) : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {task ? 'Modifier la Tâche' : 'Nouvelle Tâche'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errors.general && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">{errors.general}</p>
            </div>
          )}

          {/* Ticket associé */}
          {associatedTicket && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <FileText className="w-5 h-5 text-blue-600 mr-2" />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Tâche liée au ticket #{associatedTicket.ticketNumber}
                  </p>
                  <p className="text-sm text-blue-700">{associatedTicket.title}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Informations principales */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titre de la tâche *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                    errors.title ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Que devez-vous faire ?"
                />
                {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Détails de la tâche..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date d'échéance *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => handleChange('dueDate', e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                      errors.dueDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                </div>
                {errors.dueDate && <p className="text-red-500 text-sm mt-1">{errors.dueDate}</p>}
                <p className="text-xs text-gray-500 mt-1">
                  Vous recevrez une notification le jour J
                </p>
              </div>
            </div>

            {/* Statut et priorité */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priorité
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => handleChange('priority', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="low">Basse</option>
                  <option value="medium">Moyenne</option>
                  <option value="high">Haute</option>
                  <option value="urgent">Urgente</option>
                </select>
                <div className="mt-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(formData.priority)}`}>
                    {formData.priority === 'low' ? 'Basse' :
                     formData.priority === 'medium' ? 'Moyenne' :
                     formData.priority === 'high' ? 'Haute' : 'Urgente'}
                  </span>
                </div>
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
                  <option value="pending">En attente</option>
                  <option value="in_progress">En cours</option>
                  <option value="completed">Terminée</option>
                  <option value="cancelled">Annulée</option>
                </select>
                <div className="mt-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(formData.status)}`}>
                    {formData.status === 'pending' ? 'En attente' :
                     formData.status === 'in_progress' ? 'En cours' :
                     formData.status === 'completed' ? 'Terminée' : 'Annulée'}
                  </span>
                </div>
              </div>

              {/* Ticket associé (sélection) */}
              {!ticketId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ticket associé (optionnel)
                  </label>
                  <select
                    value={formData.ticketId}
                    onChange={(e) => handleChange('ticketId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="">Aucun ticket</option>
                    {tickets.filter(t => t.status !== 'Fermé').map((ticket) => (
                      <option key={ticket.id} value={ticket.id}>
                        #{ticket.ticketNumber} - {ticket.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Informations sur les notifications */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-orange-600 mr-2 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-orange-900">Notification automatique</p>
                <p className="text-sm text-orange-700 mt-1">
                  Vous recevrez une notification le <strong>{new Date(formData.dueDate).toLocaleDateString('fr-FR')}</strong> pour vous rappeler cette tâche.
                  Seul vous verrez cette notification.
                </p>
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
              disabled={loading}
              className="px-6 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sauvegarde...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {task ? 'Modifier la Tâche' : 'Créer la Tâche'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskForm;