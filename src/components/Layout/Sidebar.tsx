import React from 'react';
import { Home, Plus, Users, Settings, BarChart3, FileText, Mail } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSupabaseUsers } from '../../hooks/useSupabaseUsers';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange }) => {
  const { user } = useAuth();
  const { users } = useSupabaseUsers();
  
  // Trouver l'utilisateur actuel dans la liste des utilisateurs pour vérifier son rôle
  const currentUser = users.find(u => u.email === user?.email);
  const isAdmin = currentUser?.user_group === 'admin';

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'create', label: 'Nouveau Ticket', icon: Plus },
    { id: 'tickets', label: 'Tous les Tickets', icon: FileText },
    { id: 'emails', label: 'Emails Abonnés', icon: Mail },
    { id: 'analytics', label: 'Statistiques', icon: BarChart3 },
    ...(isAdmin ? [{ id: 'settings', label: 'Paramètres', icon: Settings }] : []),
  ];

  return (
    <aside className="w-64 bg-white shadow-sm border-r border-gray-200 min-h-screen">
      <nav className="mt-8">
        <div className="px-4">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              
              return (
                <li key={item.id}>
                  <button
                    onClick={() => onViewChange(item.id)}
                    className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'bg-orange-50 text-orange-700 border-r-2 border-orange-500'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className={`mr-3 w-5 h-5 ${isActive ? 'text-orange-500' : 'text-gray-400'}`} />
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;