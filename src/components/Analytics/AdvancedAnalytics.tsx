import React, { useState, useMemo } from 'react';
import { Calendar, BarChart3, TrendingUp, Clock, Filter, Download } from 'lucide-react';
import { useTickets } from '../../hooks/useTickets';
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

  // Calculer les dates de début et fin selon la période sélectionnée
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (timeRange) {
      case 'day':
        return {
          start: startOfDay(now),
          end: endOfDay(now)
        };
      case 'week':
        return {
          start: startOfWeek(now, { locale: fr }),
          end: endOfWeek(now, { locale: fr })
        };
      case 'month':
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        };
      case 'custom':
        return {
          start: parseISO(startDate),
          end: parseISO(endDate)
        };
      default:
        return {
          start: startOfMonth(now),
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
    const intervals = timeRange === 'day' 
      ? eachDayOfInterval(dateRange).map(date => ({ date, label: format(date, 'dd/MM', { locale: fr }) }))
      : timeRange === 'week'
      ? eachWeekOfInterval(dateRange).map(date => ({ date, label: format(date, 'dd/MM', { locale: fr }) }))
      : eachMonthOfInterval(dateRange).map(date => ({ date, label: format(date, 'MMM yyyy', { locale: fr }) }));

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
    const intervals = timeRange === 'day' 
      ? eachDayOfInterval(dateRange).map(date => ({ date, label: format(date, 'dd/MM', { locale: fr }) }))
      : timeRange === 'week'
      ? eachWeekOfInterval(dateRange).map(date => ({ date, label: format(date, 'dd/MM', { locale: fr }) }))
      : eachMonthOfInterval(dateRange).map(date => ({ date, label: format(date, 'MMM yyyy', { locale: fr }) }));

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

  // Calculer les délais moyens
  const averageResolutionTime = useMemo(() => {
    const closedTickets = tickets.filter(ticket => 
      ticket.status === 'Fermé' && 
      (selectedType === 'all' || ticket.type === selectedType)
    );

    if (closedTickets.length === 0) return { overall: 0, byType: [] };

    // Délai moyen global
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

      return {
        type,
        averageHours: typeHours / typeTickets.length,
        averageDays: Math.round((typeHours / typeTickets.length) / 24 * 10) / 10,
        count: typeTickets.length
      };
    }).sort((a, b) => b.averageHours - a.averageHours);

    return {
      overall: overallAverage,
      overallDays: Math.round((overallAverage / 24) * 10) / 10,
      byType
    };
  }, [tickets, selectedType]);

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
              <option value="day">Aujourd'hui</option>
              <option value="week">Cette semaine</option>
              <option value="month">Ce mois</option>
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
                {averageResolutionTime.overallDays}j
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
            Évolution des tickets ouverts
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
            Évolution des tickets fermés
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
          Délais moyens de résolution par type de demande
        </h3>
        
        <div className="mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Délai moyen global</h4>
            <div className="flex items-center space-x-4">
              <div className="text-2xl font-bold text-blue-600">
                {averageResolutionTime.overallDays} jours
              </div>
              <div className="text-sm text-blue-700">
                ({Math.round(averageResolutionTime.overall)} heures)
              </div>
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
                    {typeData.averageDays} jours
                  </div>
                  <div className="text-xs text-gray-500">
                    ({Math.round(typeData.averageHours)}h)
                  </div>
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
    </div>
  );
};

export default AdvancedAnalytics;