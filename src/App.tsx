import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginForm from './components/Auth/LoginForm';
import Header from './components/Layout/Header';
import Sidebar from './components/Layout/Sidebar';
import Dashboard from './components/Dashboard/Dashboard';
import TicketForm from './components/Tickets/TicketForm';
import TicketList from './components/Tickets/TicketList';
import TicketDetail from './components/Tickets/TicketDetail';
import GmailIntegration from './components/Gmail/GmailIntegration';
import TicketFormFromEmail from './components/Tickets/TicketFormFromEmail';
import Settings from './components/Settings/Settings';
import AdvancedAnalytics from './components/Analytics/AdvancedAnalytics';
import { Ticket } from './types';
import { useTickets } from './hooks/useTickets';

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

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const { tickets } = useTickets();
  const [activeView, setActiveView] = useState('dashboard');
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [showEmailTicketForm, setShowEmailTicketForm] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);

  const handleViewChange = (view: string) => {
    setActiveView(view);
    if (view === 'create') {
      setShowTicketForm(true);
    }
  };

  const handleTicketFormClose = () => {
    setShowTicketForm(false);
    setActiveView('dashboard');
  };

  const handleTicketFormSuccess = () => {
    // Optionnel : afficher une notification de succès
    console.log('Ticket créé avec succès !');
  };

  const handleViewTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
  };

  const handleCloseTicketDetail = () => {
    setSelectedTicket(null);
  };

  const handleEditTicket = (ticket: Ticket) => {
    setEditingTicket(ticket);
  };

  const handleCloseEditTicket = () => {
    setEditingTicket(null);
  };

  const handleEditTicketSuccess = () => {
    setEditingTicket(null);
    console.log('Ticket modifié avec succès !');
  };

  const handleCreateTicketFromEmail = (email: Email) => {
    setSelectedEmail(email);
    setShowEmailTicketForm(true);
  };

  const handleCloseEmailTicketForm = () => {
    setShowEmailTicketForm(false);
    setSelectedEmail(null);
  };

  const handleEmailTicketFormSuccess = () => {
    setShowEmailTicketForm(false);
    setSelectedEmail(null);
    setActiveView('tickets'); // Rediriger vers la liste des tickets
    console.log('Ticket créé depuis email avec succès !');
  };

  const handleViewTicketFromNotification = (ticketId: string) => {
    // Trouver le ticket par son ID
    const ticket = tickets.find(t => t.id === ticketId);
    if (ticket) {
      setSelectedTicket(ticket);
      // Optionnel : changer la vue vers les tickets
      setActiveView('tickets');
    }
  };

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard />;
      case 'tickets':
        return <TicketList onViewTicket={handleViewTicket} onEditTicket={handleEditTicket} />;
      case 'emails':
        return <GmailIntegration onCreateTicketFromEmail={handleCreateTicketFromEmail} />;
      case 'settings':
        return <Settings />;
      case 'analytics':
        return (
          <AdvancedAnalytics />
        );
      default:
        return <Dashboard />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Initialisation de l'application...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onViewTicket={handleViewTicketFromNotification} />
      <div className="flex">
        <Sidebar activeView={activeView} onViewChange={handleViewChange} />
        <main className="flex-1">
          {renderContent()}
        </main>
      </div>

      {/* Modales */}
      {showTicketForm && (
        <TicketForm
          onClose={handleTicketFormClose}
          onSuccess={handleTicketFormSuccess}
        />
      )}

      {selectedTicket && (
        <TicketDetail
          ticket={selectedTicket}
          onClose={handleCloseTicketDetail}
        />
      )}

      {editingTicket && (
        <TicketForm
          ticket={editingTicket}
          onClose={handleCloseEditTicket}
          onSuccess={handleEditTicketSuccess}
        />
      )}

      {showEmailTicketForm && selectedEmail && (
        <TicketFormFromEmail
          email={selectedEmail}
          onClose={handleCloseEmailTicketForm}
          onSuccess={handleEmailTicketFormSuccess}
        />
      )}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;