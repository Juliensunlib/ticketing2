import React, { useState } from 'react';
import { Search, Filter, Eye, Edit, MessageCircle, Paperclip } from 'lucide-react';
import { useTickets } from '../../hooks/useTickets';
import { useSupabaseUsers } from '../../hooks/useSupabaseUsers';
import { Ticket } from '../../types';

interface TicketListProps {
  onViewTicket: (ticket: Ticket) => void;
  onEditTicket?: (ticket: Ticket) => void;
}

const TicketList: React.FC<TicketListProps> = ({ onViewTicket, onEditTicket }) => {
  const { tickets, loading } = useTickets();
  const { users } = useSupabaseUsers();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [originFilter, setOriginFilter] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('');
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.id.includes(searchTerm);
    const matchesStatus = !statusFilter || ticket.status === statusFilter;
    const matchesPriority = !priorityFilter || ticket.priority === priorityFilter;
    const matchesOrigin = !originFilter || ticket.origin === originFilter;
    const matchesAssigned = !assignedFilter || ticket.assignedTo === assignedFilter;

    return matchesSearch && matchesStatus && matchesPriority && matchesOrigin && matchesAssigned;
  });

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

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-gray-200 h-20 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Tous les Tickets</h1>
        <p className="text-gray-600">Gérez et suivez tous les tickets de support</p>
      </div>

      {/* Filtres et recherche */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Rechercher par titre, description ou ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="">Tous les statuts</option>
            <option value="Nouveau">Nouveau</option>
            <option value="En attente du client">En attente du client</option>
            <option value="En attente de l'installateur">En attente de l'installateur</option>
            <option value="En attente retour service technique">En attente retour service technique</option>
            <option value="Fermé">Fermé</option>
            <option value="Ouvert">Ouvert</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="">Toutes les priorités</option>
            <option value="Haute">Haute</option>
            <option value="Moyenne">Moyenne</option>
            <option value="Basse">Basse</option>
          </select>

          <select
            value={originFilter}
            onChange={(e) => setOriginFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="">Toutes les origines</option>
            <option value="Installateur">Installateur</option>
            <option value="SunLib">SunLib</option>
            <option value="Abonné">Abonné</option>
          </select>

          <select
            value={assignedFilter}
            onChange={(e) => setAssignedFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="">Tous les assignés</option>
            <option value="">Non assigné</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Liste des tickets */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {filteredTickets.length} ticket{filteredTickets.length !== 1 ? 's' : ''}
            </h2>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Filter className="w-4 h-4" />
              <span>Filtres actifs</span>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredTickets.map((ticket) => (
            <div key={ticket.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-sm font-medium text-gray-900">
                      {ticket.subscriberId} - {ticket.title}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(ticket.status)}`}>
                      {ticket.status}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {ticket.description}
                  </p>
                  
                  <div className="flex items-center space-x-6 text-xs text-gray-500">
                    <span>Créé le {new Date(ticket.createdAt).toLocaleDateString('fr-FR')}</span>
                    <span>•</span>
                    <span>Par: {ticket.createdBy}</span>
                    <span>•</span>
                    <span>Assigné à: {ticket.assignedTo 
                      ? users.find(u => u.id === ticket.assignedTo)?.name || 'Utilisateur inconnu'
                      : 'Non assigné'
                    }</span>
                    <span>•</span>
                    <span>Origine: {ticket.origin}</span>
                    <span>•</span>
                    <span>Canal: {ticket.channel}</span>
                    <span>•</span>
                    <span>Type: {ticket.type}</span>
                  </div>
                  
                  <div className="flex items-center space-x-4 mt-2">
                    {ticket.comments.length > 0 && (
                      <div className="flex items-center text-xs text-gray-500">
                        <MessageCircle className="w-3 h-3 mr-1" />
                        {ticket.comments.length} commentaire{ticket.comments.length !== 1 ? 's' : ''}
                      </div>
                    )}
                    {ticket.attachments.length > 0 && (
                      <div className="flex items-center text-xs text-gray-500">
                        <Paperclip className="w-3 h-3 mr-1" />
                        {ticket.attachments.length} pièce{ticket.attachments.length !== 1 ? 's' : ''} jointe{ticket.attachments.length !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => onViewTicket(ticket)}
                    className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                    title="Voir le détail"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Modifier"
                    onClick={() => onEditTicket && onEditTicket(ticket)}
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {filteredTickets.length === 0 && (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun ticket trouvé</h3>
              <p className="text-gray-600">
                Essayez de modifier vos critères de recherche ou de filtrage.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketList;