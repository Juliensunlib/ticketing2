import React, { useState, useRef, useEffect } from 'react';
import { Bell, X, Eye, Trash2, FileText, User, Calendar, CheckSquare } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { useTasks } from '../../hooks/useTasks';
import { Ticket } from '../../types';
import TaskForm from '../Tasks/TaskForm';

interface NotificationDropdownProps {
  onViewTicket: (ticketId: string) => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ onViewTicket }) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotification, clearAllNotifications } = useNotifications();
  const { tasks } = useTasks();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fermer le dropdown quand on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id);
    
    if (notification.ticketId) {
      // C'est une notification de ticket
      onViewTicket(notification.ticketId);
    } else {
      // C'est une notification de tâche
      const taskTitle = notification.title;
      const task = tasks.find(t => t.title === taskTitle);
      if (task) {
        setSelectedTask(task);
      }
    }
    setIsOpen(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'À l\'instant';
    } else if (diffInMinutes < 60) {
      return `Il y a ${diffInMinutes} min`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `Il y a ${hours}h`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bouton de notification */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown des notifications */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-2 bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                    {unreadCount} nouvelle{unreadCount > 1 ? 's' : ''}
                  </span>
                )}
              </h3>
              <div className="flex items-center space-x-2">
                {notifications.length > 0 && (
                  <>
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-blue-600 hover:text-blue-700 flex items-center"
                      title="Marquer tout comme lu"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Tout lire
                    </button>
                    <button
                      onClick={clearAllNotifications}
                      className="text-xs text-red-600 hover:text-red-700 flex items-center"
                      title="Supprimer toutes les notifications"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Tout supprimer
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Liste des notifications */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-sm">Aucune notification</p>
                <p className="text-gray-400 text-xs mt-1">
                  Vous serez notifié quand des tickets vous seront assignés
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                        !notification.isRead ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            {notification.ticketNumber > 0 ? (
                              <>
                                <FileText className="w-4 h-4 text-orange-500" />
                                <span className="text-sm font-medium text-gray-900">
                                  Ticket #{notification.ticketNumber}
                                </span>
                              </>
                            ) : (
                              <>
                                <CheckSquare className="w-4 h-4 text-blue-500" />
                                <span className="text-sm font-medium text-gray-900">
                                  Tâche personnelle
                                </span>
                              </>
                            )}
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                          </div>
                          
                          <h4 className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">
                            {notification.title}
                          </h4>
                          
                          <div className="flex items-center text-xs text-gray-600 mb-2">
                            <User className="w-3 h-3 mr-1" />
                            <span>{notification.subscriberName}</span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">
                              {notification.message}
                            </span>
                            <div className="flex items-center text-xs text-gray-400">
                              <Calendar className="w-3 h-3 mr-1" />
                              {formatDate(notification.createdAt)}
                            </div>
                          </div>
                        </div>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            clearNotification(notification.id);
                          }}
                          className="ml-2 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Supprimer cette notification"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 bg-gray-50 text-center">
              <p className="text-xs text-gray-500">
                Cliquez sur une notification pour voir le détail du ticket
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modale de tâche */}
      {selectedTask && (
        <TaskForm
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onSuccess={() => {
            setSelectedTask(null);
            // Optionnel : recharger les notifications
          }}
        />
      )}
    </div>
  );
};

export default NotificationDropdown;