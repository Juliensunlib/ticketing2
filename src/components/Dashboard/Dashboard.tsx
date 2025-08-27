import React from 'react';
import { Ticket, AlertCircle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import StatsCard from './StatsCard';
import { useTickets } from '../../hooks/useTickets';

const Dashboard: React.FC = () => {
  const { tickets } = useTickets();

  // Calcul des statistiques par statut
  const nouveauTickets = tickets.filter(t => t.status === 'Nouveau').length;
  const attenteClientTickets = tickets.filter(t => t.status === 'En attente du client').length;
  const attenteInstallateurTickets = tickets.filter(t => t.status === 'En attente de l\'installateur').length;
  const attenteServiceTickets = tickets.filter(t => t.status === 'En attente retour service technique').length;
  const fermeTickets = tickets.filter(t => t.status === 'Fermé').length;
  const ouvertTickets = tickets.filter(t => t.status === 'Ouvert').length;

  const recentTickets = tickets
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Haute': return 'text-red-600 bg-red-100';
      case 'Moyenne': return 'text-yellow-600 bg-yellow-100';
      case 'Basse': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ouvert': return 'text-green-600 bg-green-100';
      case 'En cours': return 'text-blue-600 bg-blue-100';
      case 'Résolu': return 'text-orange-600 bg-orange-100';
      case 'Fermé': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Vue d'ensemble de l'activité des tickets</p>
      </div>

      {/* Statistiques par statut */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatsCard
          title="Nouveau"
          value={nouveauTickets}
          icon={AlertCircle}
          color="blue"
        />
        <StatsCard
          title="Attente Client"
          value={attenteClientTickets}
          icon={Clock}
          color="yellow"
        />
        <StatsCard
          title="Attente Installateur"
          value={attenteInstallateurTickets}
          icon={Clock}
          color="red"
        />
        <StatsCard
          title="Attente Service"
          value={attenteServiceTickets}
          icon={Clock}
          color="purple"
        />
        <StatsCard
          title="Fermé"
          value={fermeTickets}
          icon={CheckCircle}
          color="red"
        />
        <StatsCard
          title="Ouvert"
          value={ouvertTickets}
          icon={CheckCircle}
          color="green"
        />
      </div>

      {/* Répartition par statut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Total par Type</h2>
          <div className="space-y-3">
            {[
              'SAV / question technique',
              'Recouvrement',
              'Plainte Installateur',
              'changement date prélèvement/RIB',
              'Résiliation anticipée / cession de contrat',
              'Ajout contrat / Flexibilité'
            ].map((type) => {
              const count = tickets.filter(t => t.type === type).length;
              
              return (
                <div key={type} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <span className="text-sm text-gray-600" title={type}>
                    {type}
                  </span>
                  <span className="text-lg font-bold text-gray-900">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Total par Priorité</h2>
          <div className="space-y-3">
            {[
              'Haute',
              'Moyenne',
              'Basse'
            ].map((priority) => {
              const count = tickets.filter(t => t.priority === priority).length;
              
              return (
                <div key={priority} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <span className="text-sm text-gray-600">{priority}</span>
                  <span className="text-lg font-bold text-gray-900">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Total par Origine</h2>
          <div className="space-y-3">
            {[
              'Installateur',
              'SunLib',
              'Abonné'
            ].map((origin) => {
              const count = tickets.filter(t => t.origin === origin).length;
              
              return (
                <div key={origin} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <span className="text-sm text-gray-600">{origin}</span>
                  <span className="text-lg font-bold text-gray-900">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;