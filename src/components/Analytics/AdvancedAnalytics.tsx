import React, { useState, useMemo } from 'react';
import { Calendar, BarChart3, TrendingUp, Clock, Filter, Download } from 'lucide-react';
import { useTickets } from '../../hooks/useTickets';
import { useSupabaseUsers } from '../../hooks/useSupabaseUsers';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  format, 
  startOfDay, 
  endOfDay, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  differenceInDays,
  differenceInHours,
  parseISO,
  isWithinInterval
} from 'date-fns';
import { fr } from 'date-fns/locale';

type TimeRange = 'day' | 'week' | 'month' | 'custom';

const AdvancedAnalytics: React.FC = () => {
  const { tickets } = useTickets();
  const { users } = useSupabaseUsers();
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [selectedType, setSelectedType] = useState<string>('all');

  // Couleurs pour les graphiques
  const colors = {
    opened: '#f59e0b',
    closed: '#10b981',
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    accent: '#ef4444'
  };

  // Calculer les dates de début et fin selon la période sélectionnée (historique)
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (timeRange) {
      case 'day':
        return {
          start: startOfDay(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)), // 7 derniers jours
          end: endOfDay(now)
        };
      case 'week':
        return {
          start: startOfWeek(new Date(now.getTime() - 3 * 7 * 24 * 60 * 60 * 1000), { locale: fr }), // 4 dernières semaines
          end: endOfWeek(now, { locale: fr })
        };
      case 'month':
        return {
          start: startOfMonth(new Date(now.getFullYear() - 1, now.getMonth(), 1)), // 12 derniers mois
          end: endOfMonth(now)
        };
      case 'custom':
        return {
          start: parseISO(startDate),
          end: parseISO(endDate)
        };
      default:
        return {
          start: startOfMonth(new Date(now.getFullYear() - 1, now.getMonth(), 1)),
          end: endOfMonth(now)
        };
    }
  }, [timeRange, startDate, endDate]);

  // Filtrer les tickets selon la période et le type
  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      const ticketDate = parseISO(ticket.createdAt);
      const isInRange = isWithinInterval(ticketDate, dateRange);
      const matchesType = selectedType === 'all' || ticket.type === selectedType;
      return isInRange && matchesType;
    });
  }, [tickets, dateRange, selectedType]);

  // Générer les données pour le graphique des tickets ouverts
  const openedTicketsData = useMemo(() => {
    let intervals;
    
    if (timeRange === 'day') {
      // 7 derniers jours
      intervals = eachDayOfInterval(dateRange).map(date => ({ 
        date, 
        label: format(date, 'EEE dd/MM', { locale: fr }) 
      }));
    } else if (timeRange === 'week') {
      // 4 dernières semaines
      intervals = eachWeekOfInterval(dateRange).map(date => ({ 
        date, 
        label: `S${format(date, 'w', { locale: fr })} ${format(date, 'dd/MM', { locale: fr })}` 
      }));
    } else if (timeRange === 'month') {
      // 12 derniers mois
      intervals = eachMonthOfInterval(dateRange).map(date => ({ 
        date, 
        label: format(date, 'MMM yyyy', { locale: fr }) 
      }));
    } else {
      // Période personnalisée - adapter selon la durée
      const daysDiff = differenceInDays(dateRange.end, dateRange.start);
      if (daysDiff <= 31) {
        intervals = eachDayOfInterval(dateRange).map(date => ({ 
          date, 
          label: format(date, 'dd/MM', { locale: fr }) 
        }));
      } else if (daysDiff <= 120) {
        intervals = eachWeekOfInterval(dateRange).map(date => ({ 
          date, 
          label: format(date, 'dd/MM', { locale: fr }) 
        }));
      } else {
        intervals = eachMonthOfInterval(dateRange).map(date => ({ 
          date, 
          label: format(date, 'MMM yyyy', { locale: fr }) 
        }));
      }
    }

    return intervals.map(({ date, label }) => {
      const periodStart = timeRange === 'day' 
        ? startOfDay(date)
      : timeRange === 'week'
        ? startOfWeek(date, { locale: fr })
        : startOfMonth(date);
      
      const periodEnd = timeRange === 'day'
        ? endOfDay(date)
        : timeRange === 'week'
        ? endOfWeek(date, { locale: fr })
        : endOfMonth(date);

      const openedCount = tickets.filter(ticket => {
        const ticketDate = parseISO(ticket.createdAt);
        return isWithinInterval(ticketDate, { start: periodStart, end: periodEnd }) &&
               (selectedType === 'all' || ticket.type === selectedType);
      }).length;

      return {
        period: label,
        opened: openedCount
      };
    });
  }, [tickets, dateRange, timeRange, selectedType]);

  // Générer les données pour le graphique des tickets fermés
  const closedTicketsData = useMemo(() => {
    let intervals;
    
    if (timeRange === 'day') {
      intervals = eachDayOfInterval(dateRange).map(date => ({ 
        date, 
        label: format(date, 'EEE dd/MM', { locale: fr }) 
      }));
    } else if (timeRange === 'week') {
      intervals = eachWeekOfInterval(dateRange).map(date => ({ 
        date, 
        label: `S${format(date, 'w', { locale: fr })} ${format(date, 'dd/MM', { locale: fr })}` 
      }));
    } else if (timeRange === 'month') {
      intervals = eachMonthOfInterval(dateRange).map(date => ({ 
        date, 
        label: format(date, 'MMM yyyy', { locale: fr }) 
      }));
    } else {
      const daysDiff = differenceInDays(dateRange.end, dateRange.start);
      if (daysDiff <= 31) {
        intervals = eachDayOfInterval(dateRange).map(date => ({ 
          date, 
          label: format(date, 'dd/MM', { locale: fr }) 
        }));
      } else if (daysDiff <= 120) {
        intervals = eachWeekOfInterval(dateRange).map(date => ({ 
          date, 
          label: format(date, 'dd/MM', { locale: fr }) 
        }));
      } else {
        intervals = eachMonthOfInterval(dateRange).map(date => ({ 
          date, 
          label: format(date, 'MMM yyyy', { locale: fr }) 
        }));
      }
    }

    return intervals.map(({ date, label }) => {
      const periodStart = timeRange === 'day' 
        ? startOfDay(date)
      : timeRange === 'week'
        ? startOfWeek(date, { locale: fr })
        : startOfMonth(date);
      
      const periodEnd = timeRange === 'day'
        ? endOfDay(date)
        : timeRange === 'week'
        ? endOfWeek(date, { locale: fr })
        : endOfMonth(date);

      const closedCount = tickets.filter(ticket => {
        const ticketDate = parseISO(ticket.updatedAt);
        return ticket.status === 'Fermé' &&
               isWithinInterval(ticketDate, { start: periodStart, end: periodEnd }) &&
               (selectedType === 'all' || ticket.type === selectedType);
      }).length;

      return {
        period: label,
        closed: closedCount
      };
    });
  }, [tickets, dateRange, timeRange, selectedType]);

  // Calculer les délais moyens en heures
  const averageResolutionTime = useMemo(() => {
    const closedTickets = tickets.filter(ticket => 
      ticket.status === 'Fermé' && 
      (selectedType === 'all' || ticket.type === selectedType)
    );

    if (closedTickets.length === 0) return { overall: 0, overallHours: 0, byType: [] };

    // Délai moyen global en heures
    const totalHours = closedTickets.reduce((sum, ticket) => {
      const created = parseISO(ticket.createdAt);
      const closed = parseISO(ticket.updatedAt);
      return sum + differenceInHours(closed, created);
    }, 0);

    const overallAverage = totalHours / closedTickets.length;

    // Délai moyen par type
    const typeGroups = closedTickets.reduce((groups, ticket) => {
      if (!groups[ticket.type]) {
        groups[ticket.type] = [];
      }
      groups[ticket.type].push(ticket);
      return groups;
    }, {} as Record<string, typeof closedTickets>);

    const byType = Object.entries(typeGroups).map(([type, typeTickets]) => {
      const typeHours = typeTickets.reduce((sum, ticket) => {
        const created = parseISO(ticket.createdAt);
        const closed = parseISO(ticket.updatedAt);
        return sum + differenceInHours(closed, created);
      }, 0);

      const averageHours = typeHours / typeTickets.length;

      return {
        type,
        averageHours: Math.round(averageHours * 10) / 10,
        count: typeTickets.length
      };
    }).sort((a, b) => b.averageHours - a.averageHours);

    return {
      overall: overallAverage,
      overallHours: Math.round(overallAverage * 10) / 10,
      byType
    };
  }, [tickets, selectedType]);

  // Statistiques par utilisateur
  const userStatistics = useMemo(() => {
    const userStats = users.map(user => {
      // Tickets créés par cet utilisateur dans la période
      const createdTickets = tickets.filter(ticket => {
        const ticketDate = parseISO(ticket.createdAt);
        const matchesUser = ticket.createdBy === user.name || ticket.createdBy === user.id;
        const isInRange = isWithinInterval(ticketDate, dateRange);
        const matchesType = selectedType === 'all' || ticket.type === selectedType;
        return matchesUser && isInRange && matchesType;
      });

      // Tickets assignés à cet utilisateur dans la période
      const assignedTickets = tickets.filter(ticket => {
        const ticketDate = parseISO(ticket.createdAt);
        const matchesUser = ticket.assignedTo === user.id;
        const isInRange = isWithinInterval(ticketDate, dateRange);
        const matchesType = selectedType === 'all' || ticket.type === selectedType;
        return matchesUser && isInRange && matchesType;
      });

      // Tickets fermés par cet utilisateur (basé sur les tickets assignés qui sont fermés)
      const closedTickets = assignedTickets.filter(ticket => ticket.status === 'Fermé');

      // Délai moyen de résolution pour cet utilisateur
      let averageResolutionHours = 0;
      if (closedTickets.length > 0) {
        const totalHours = closedTickets.reduce((sum, ticket) => {
          const created = parseISO(ticket.createdAt);
          const closed = parseISO(ticket.updatedAt);
          return sum + differenceInHours(closed, created);
        }, 0);
        averageResolutionHours = Math.round((totalHours / closedTickets.length) * 10) / 10;
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        userGroup: user.user_group,
        createdCount: createdTickets.length,
        assignedCount: assignedTickets.length,
        closedCount: closedTickets.length,
        averageResolutionHours,
        resolutionRate: assignedTickets.length > 0 ? Math.round((closedTickets.length / assignedTickets.length) * 100) : 0
      };
    });

    // Trier par nombre de tickets fermés (performance)
    return userStats.sort((a, b) => b.closedCount - a.closedCount);
  }, [users, tickets, dateRange, selectedType]);
  // Types de tickets disponibles
  const ticketTypes = [
    'SAV / question technique',
    'Recouvrement',
    'Plainte Installateur',
    'changement date prélèvement/RIB',
    'Résiliation anticipée / cession de contrat',
    'Ajout contrat / Flexibilité'
  ];

  const handleExportData = () => {
    const data = {
      period: `${format(dateRange.start, 'dd/MM/yyyy')} - ${format(dateRange.end, 'dd/MM/yyyy')}`,
      type: selectedType === 'all' ? 'Tous les types' : selectedType,
      openedTickets: openedTicketsData,
      closedTickets: closedTicketsData,
      averageResolutionTime
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `statistiques-tickets-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Statistiques Avancées</h1>
        <p className="text-gray-600">Analyse détaillée des performances et tendances des tickets</p>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Filter className="w-5 h-5 mr-2 text-orange-500" />
            Filtres d'analyse
          </h2>
          <button
            onClick={handleExportData}
            className="flex items-center px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Sélection de période */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Période d'analyse
            </label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="day">7 derniers jours</option>
              <option value="week">4 dernières semaines</option>
              <option value="month">12 derniers mois</option>
              <option value="custom">Période personnalisée</option>
            </select>
          </div>

          {/* Dates personnalisées */}
          {timeRange === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de début
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de fin
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </>
          )}

          {/* Type de ticket */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type de demande
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="all">Tous les types</option>
              {ticketTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          <p>
            Période analysée : <strong>{format(dateRange.start, 'dd MMMM yyyy', { locale: fr })}</strong> au{' '}
            <strong>{format(dateRange.end, 'dd MMMM yyyy', { locale: fr })}</strong>
          </p>
          <p>
            Type sélectionné : <strong>{selectedType === 'all' ? 'Tous les types' : selectedType}</strong>
          </p>
          <p>
            Tickets dans la période : <strong>{filteredTickets.length}</strong>
          </p>
        </div>
      </div>

      {/* Métriques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tickets ouverts</p>
              <p className="text-2xl font-bold text-orange-600">
                {openedTicketsData.reduce((sum, item) => sum + item.opened, 0)}
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tickets fermés</p>
              <p className="text-2xl font-bold text-green-600">
                {closedTicketsData.reduce((sum, item) => sum + item.closed, 0)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Délai moyen</p>
              <p className="text-2xl font-bold text-blue-600">
                {averageResolutionTime.overallHours}h
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Taux de résolution</p>
              <p className="text-2xl font-bold text-purple-600">
                {filteredTickets.length > 0 
                  ? Math.round((closedTicketsData.reduce((sum, item) => sum + item.closed, 0) / filteredTickets.length) * 100)
                  : 0
                }%
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graphique des tickets ouverts */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {timeRange === 'day' ? 'Tickets ouverts - 7 derniers jours' :
             timeRange === 'week' ? 'Tickets ouverts - 4 dernières semaines' :
             timeRange === 'month' ? 'Tickets ouverts - 12 derniers mois' :
             'Tickets ouverts - Période personnalisée'}
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={openedTicketsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip 
                  labelFormatter={(label) => `Période: ${label}`}
                  formatter={(value, name) => [value, 'Tickets ouverts']}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="opened" 
                  stroke={colors.opened} 
                  strokeWidth={3}
                  dot={{ fill: colors.opened, strokeWidth: 2, r: 4 }}
                  name="Tickets ouverts"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graphique des tickets fermés */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {timeRange === 'day' ? 'Tickets fermés - 7 derniers jours' :
             timeRange === 'week' ? 'Tickets fermés - 4 dernières semaines' :
             timeRange === 'month' ? 'Tickets fermés - 12 derniers mois' :
             'Tickets fermés - Période personnalisée'}
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={closedTicketsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip 
                  labelFormatter={(label) => `Période: ${label}`}
                  formatter={(value, name) => [value, 'Tickets fermés']}
                />
                <Legend />
                <Bar 
                  dataKey="closed" 
                  fill={colors.closed}
                  name="Tickets fermés"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Délais de résolution */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Délais moyens de résolution par type de demande (en heures)
        </h3>
        
        <div className="mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Délai moyen global (heures)</h4>
            <div className="flex items-center space-x-4">
              <div className="text-2xl font-bold text-blue-600">
                {averageResolutionTime.overallHours}h
              </div>
              {averageResolutionTime.overallHours >= 24 && (
                <div className="text-sm text-blue-700">
                  ({Math.round(averageResolutionTime.overallHours / 24 * 10) / 10} jours)
                </div>
              )}
            </div>
          </div>
        </div>

        {averageResolutionTime.byType.length > 0 ? (
          <div className="space-y-4">
            {averageResolutionTime.byType.map((typeData, index) => (
              <div key={typeData.type} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium text-gray-900">{typeData.type}</h5>
                  <span className="text-sm text-gray-500">
                    {typeData.count} ticket{typeData.count > 1 ? 's' : ''} fermé{typeData.count > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-green-400 to-red-400 h-2 rounded-full"
                      style={{ 
                        width: `${Math.min((typeData.averageHours / Math.max(...averageResolutionTime.byType.map(t => t.averageHours))) * 100, 100)}%` 
                      }}
                    />
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    {typeData.averageHours}h
                  </div>
                  {typeData.averageHours >= 24 && (
                    <div className="text-xs text-gray-500">
                      ({Math.round(typeData.averageHours / 24 * 10) / 10}j)
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Aucun ticket fermé dans la période sélectionnée</p>
          </div>
        )}
      </div>

      {/* Tableau des statistiques par utilisateur */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Statistiques par utilisateur
        </h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rôle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tickets créés
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tickets assignés
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tickets fermés
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Taux de résolution
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Délai moyen (h)
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {userStatistics.length > 0 ? (
                userStatistics.map((userStat) => (
                  <tr key={userStat.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-400 to-yellow-500 flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              {userStat.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {userStat.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {userStat.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        userStat.userGroup === 'admin' 
                          ? 'bg-red-100 text-red-800'
                          : userStat.userGroup === 'service_technique'
                          ? 'bg-purple-100 text-purple-800'
                          : userStat.userGroup === 'commercial'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {userStat.userGroup}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <span className="font-medium">{userStat.createdCount}</span>
                        {userStat.createdCount > 0 && (
                          <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-orange-500 h-2 rounded-full"
                              style={{ 
                                width: `${Math.min((userStat.createdCount / Math.max(...userStatistics.map(u => u.createdCount))) * 100, 100)}%` 
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <span className="font-medium">{userStat.assignedCount}</span>
                        {userStat.assignedCount > 0 && (
                          <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full"
                              style={{ 
                                width: `${Math.min((userStat.assignedCount / Math.max(...userStatistics.map(u => u.assignedCount))) * 100, 100)}%` 
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <span className="font-medium">{userStat.closedCount}</span>
                        {userStat.closedCount > 0 && (
                          <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full"
                              style={{ 
                                width: `${Math.min((userStat.closedCount / Math.max(...userStatistics.map(u => u.closedCount))) * 100, 100)}%` 
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <span className={`font-medium ${
                          userStat.resolutionRate >= 80 ? 'text-green-600' :
                          userStat.resolutionRate >= 60 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {userStat.resolutionRate}%
                        </span>
                        <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              userStat.resolutionRate >= 80 ? 'bg-green-500' :
                              userStat.resolutionRate >= 60 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${userStat.resolutionRate}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="font-medium">
                        {userStat.averageResolutionHours > 0 ? `${userStat.averageResolutionHours}h` : '-'}
                      </span>
                      {userStat.averageResolutionHours >= 24 && (
                        <div className="text-xs text-gray-500">
                          ({Math.round(userStat.averageResolutionHours / 24 * 10) / 10}j)
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <Calendar className="w-12 h-12 text-gray-300 mb-4" />
                      <p>Aucune donnée utilisateur pour la période sélectionnée</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {userStatistics.length > 0 && (
          <div className="mt-4 text-sm text-gray-600">
            <p>
              <strong>Légende :</strong> Les barres de progression permettent de comparer visuellement les performances entre utilisateurs.
            </p>
            <p>
              <strong>Taux de résolution :</strong> Pourcentage de tickets assignés qui ont été fermés.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedAnalytics;