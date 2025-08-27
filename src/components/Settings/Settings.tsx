import React, { useState } from 'react';
import { Save, Key, Database, Bell, Users, Shield, CheckCircle, AlertCircle, Plus } from 'lucide-react';
import { useSupabaseUsers } from '../../hooks/useSupabaseUsers';
import { useAirtable } from '../../hooks/useAirtable';

const Settings: React.FC = () => {
  const { users, loading: usersLoading, createUser } = useSupabaseUsers();
  const { subscribers, loading: airtableLoading, error: airtableError, loadData, forceReload, retryCount, maxRetries } = useAirtable();
  
  // Vérifier la configuration Airtable depuis les variables d'environnement
  const airtableConfig = {
    apiKey: import.meta.env.VITE_AIRTABLE_API_KEY || '',
    subscribersBaseId: import.meta.env.VITE_AIRTABLE_SUBSCRIBERS_BASE_ID || ''
  };

  const isAirtableConfigured = airtableConfig.apiKey && airtableConfig.subscribersBaseId;
  
  // Vérifier la configuration Supabase
  const supabaseConfig = {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || ''
  };
  
  const isSupabaseConfigured = supabaseConfig.url && supabaseConfig.anonKey;

  // Debug des variables d'environnement
  React.useEffect(() => {
    console.log('🔧 === DEBUG VARIABLES D\'ENVIRONNEMENT ===');
    console.log('🔧 VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL ? 'PRÉSENTE' : 'MANQUANTE');
    console.log('🔧 VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'PRÉSENTE' : 'MANQUANTE');
    console.log('🔧 VITE_AIRTABLE_API_KEY:', import.meta.env.VITE_AIRTABLE_API_KEY ? 'PRÉSENTE' : 'MANQUANTE');
    console.log('🔧 VITE_AIRTABLE_SUBSCRIBERS_BASE_ID:', import.meta.env.VITE_AIRTABLE_SUBSCRIBERS_BASE_ID ? 'PRÉSENTE' : 'MANQUANTE');
    console.log('🔧 === FIN DEBUG ===');
  }, []);

  const [notifications, setNotifications] = useState({
    emailOnNewTicket: true,
    emailOnStatusChange: true,
    emailOnComment: false,
    pushNotifications: true
  });

  const [newUser, setNewUser] = useState({
    email: '',
    name: '',
    user_group: 'service_client'
  });

  const handleSaveNotifications = () => {
    // Sauvegarder les préférences de notifications
    localStorage.setItem('notification_settings', JSON.stringify(notifications));
    alert('Préférences de notifications sauvegardées !');
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createUser(newUser);
      setNewUser({ email: '', name: '', user_group: 'support' });
      alert('Utilisateur créé avec succès !');
    } catch (error) {
      console.error('Erreur lors de la création de l\'utilisateur:', error);
      alert('Erreur lors de la création de l\'utilisateur');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Paramètres</h1>
        <p className="text-gray-600">Configurez votre outil de ticketing</p>
      </div>

      {/* Configuration Supabase */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Database className="w-5 h-5 mr-2 text-blue-500" />
              Configuration Supabase (Utilisateurs)
            </h2>
            <div className="flex items-center">
              {isSupabaseConfigured ? (
                <div className="flex items-center text-green-600">
                  <CheckCircle className="w-5 h-5 mr-1" />
                  <span className="text-sm font-medium">Configuré</span>
                </div>
              ) : (
                <div className="flex items-center text-red-600">
                  <AlertCircle className="w-5 h-5 mr-1" />
                  <span className="text-sm font-medium">Non configuré</span>
                </div>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Gestion des utilisateurs via Supabase (remplace la base RH Airtable)
          </p>
        </div>
        
        <div className="p-6 space-y-4">
          {isSupabaseConfigured ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-green-900 mb-2 flex items-center">
                <CheckCircle className="w-4 h-4 mr-1" />
                Supabase connecté - {users.length} utilisateur{users.length !== 1 ? 's' : ''} disponible{users.length !== 1 ? 's' : ''}
              </h4>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-red-900 mb-2 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                Configuration Supabase manquante
              </h4>
              <div className="text-sm text-red-800 space-y-2">
                <p>Cliquez sur "Connect to Supabase" en haut à droite pour configurer Supabase.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Configuration Airtable */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Database className="w-5 h-5 mr-2 text-orange-500" />
              Configuration Airtable
            </h2>
            <div className="flex items-center">
              {isAirtableConfigured ? (
                <div className="flex items-center text-green-600">
                  <CheckCircle className="w-5 h-5 mr-1" />
                  <span className="text-sm font-medium">Configuré</span>
                </div>
              ) : (
                <div className="flex items-center text-red-600">
                  <AlertCircle className="w-5 h-5 mr-1" />
                  <span className="text-sm font-medium">Non configuré</span>
                </div>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Configuration automatique via le fichier .env
          </p>
        </div>
        
        <div className="p-6 space-y-4">
          {isAirtableConfigured ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-green-900 mb-2 flex items-center">
                <CheckCircle className="w-4 h-4 mr-1" />
                Configuration Vercel active - {airtableLoading ? `Chargement... ${retryCount > 0 ? `(tentative ${retryCount}/${maxRetries})` : ''}` : `${subscribers.length} abonné${subscribers.length !== 1 ? 's' : ''} chargé${subscribers.length !== 1 ? 's' : ''}`}
              </h4>
              <div className="text-sm text-green-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span>Clé API (Vercel) :</span>
                  <span className="font-mono text-xs">
                    {airtableConfig.apiKey.substring(0, 8)}...{airtableConfig.apiKey.slice(-4)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Base Abonnés (Vercel) :</span>
                  <span className="font-mono text-xs">{airtableConfig.subscribersBaseId}</span>
                </div>
                {airtableError && (
                  <div className="text-red-800 text-xs mt-2">
                    ⚠️ Erreur: {airtableError}
                    <div className="mt-2 p-2 bg-red-100 rounded text-xs">
                      <strong>Actions recommandées:</strong>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>Vérifiez vos permissions Airtable</li>
                        <li>Confirmez que la table "Abonnés" existe</li>
                        <li>Vérifiez le Base ID dans l'URL Airtable</li>
                        <li>Testez votre clé API dans l'API Explorer Airtable</li>
                      </ul>
                    </div>
                    {retryCount > 0 && (
                      <div className="mt-1">
                        🔄 Tentatives de reconnexion: {retryCount}/{maxRetries}
                      </div>
                    )}
                  </div>
                )}
                {airtableLoading && (
                  <div className="text-blue-800 text-xs mt-2">
                    🔄 Chargement des abonnés en cours... {retryCount > 0 ? `(retry ${retryCount}/${maxRetries})` : ''}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-red-900 mb-2 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                Configuration Airtable manquante
              </h4>
              <div className="text-sm text-red-800 space-y-2">
                <p>Pour configurer Airtable, ajoutez ces variables d'environnement :</p>
                <div className="bg-red-100 rounded p-3 font-mono text-xs space-y-1">
                  <div>VITE_AIRTABLE_API_KEY=votre_clé_api</div>
                  <div>VITE_AIRTABLE_SUBSCRIBERS_BASE_ID=id_base_abonnés</div>
                </div>
                <div className="bg-yellow-100 border border-yellow-300 rounded p-2 mt-2">
                  <p className="text-xs font-medium text-yellow-800">Comment obtenir ces valeurs:</p>
                  <ul className="text-xs text-yellow-700 mt-1 space-y-1">
                    <li>• <strong>Clé API:</strong> Airtable → Account → API → Generate API key</li>
                    <li>• <strong>Base ID:</strong> Dans l'URL de votre base (app...)</li>
                    <li>• <strong>Table:</strong> Doit s'appeler exactement "Abonnés"</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Structure des bases Airtable requise :</h4>
            <div className="text-xs text-blue-800 space-y-1">
              <p><strong>Base "BDD Abonné" (ID: {airtableConfig.subscribersBaseId || 'non configuré'}) :</strong></p>
              <ul className="ml-4 space-y-1">
                <li>• Table <strong>"Abonnés"</strong> (exactement ce nom) : Nom, Prenom, Contrat abonné, Email</li>
                <li>• Table "Tickets" : pour synchronisation des tickets créés</li>
              </ul>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-yellow-900 mb-2">Vérifications importantes :</h4>
            <div className="text-xs text-yellow-800 space-y-1">
              <p><strong>✅ Clé API :</strong> Doit commencer par "pat" ou "key"</p>
              <p><strong>✅ Base ID :</strong> Doit commencer par "app" (trouvé dans l'URL)</p>
              <p><strong>✅ Base Name :</strong> "BDD Abonné" dans Airtable</p>
              <p><strong>✅ Table "Abonnés" :</strong> Nom exact, sensible à la casse</p>
              <p><strong>✅ Permissions :</strong> Clé API avec accès lecture à la base</p>
              <p><strong>✅ Test :</strong> Utilisez l'API Explorer d'Airtable pour tester</p>
            </div>
          </div>
        </div>
      </div>

      {/* Test de connexion */}
      {isAirtableConfigured && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Database className="w-5 h-5 mr-2 text-orange-500" />
              Test de connexion
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Vérifiez que la connexion à Airtable fonctionne correctement
            </p>
          </div>
          
          <div className="p-6">
            <button
              onClick={() => {
                console.log('🔄 Test de connexion Airtable demandé');
                forceReload();
              }}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors flex items-center"
              disabled={airtableLoading}
            >
              {airtableLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {retryCount > 0 ? `Retry ${retryCount}/${maxRetries}...` : 'Chargement...'}
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 mr-2" />
                  Recharger les données
                </>
              )}
            </button>
            <p className="text-xs text-gray-500 mt-2">
              Force le rechargement des données depuis Airtable. Vérifiez la console (F12) pour les détails.
            </p>
            
            {/* Informations de debug */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <h5 className="text-sm font-medium text-gray-900 mb-2">Debug :</h5>
              <div className="text-xs text-gray-600 space-y-1">
                <p>• Abonnés chargés : {subscribers.length}</p>
                <p>• Utilisateurs chargés : {users.length}</p>
                <p>• État de chargement Airtable : {airtableLoading ? 'En cours...' : 'Terminé'}</p>
                <p>• État de chargement Users : {usersLoading ? 'En cours...' : 'Terminé'}</p>
                {airtableError && <p className="text-red-600">• Erreur Airtable : {airtableError}</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Configuration supprimée - maintenant via .env */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Database className="w-5 h-5 mr-2 text-orange-500" />
            Configuration manuelle (désactivée)
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            La configuration se fait maintenant via le fichier .env pour plus de sécurité
          </p>
        </div>
        
        <div className="p-6">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <Key className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">
              Pour des raisons de sécurité, la configuration Airtable se fait maintenant via le fichier .env
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Cela évite d'exposer vos clés API dans l'interface utilisateur
            </p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Bell className="w-5 h-5 mr-2 text-orange-500" />
            Notifications
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Configurez quand recevoir des notifications
          </p>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={notifications.emailOnNewTicket}
                onChange={(e) => setNotifications(prev => ({ ...prev, emailOnNewTicket: e.target.checked }))}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <span className="ml-3 text-sm text-gray-700">Email lors de la création d'un nouveau ticket</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={notifications.emailOnStatusChange}
                onChange={(e) => setNotifications(prev => ({ ...prev, emailOnStatusChange: e.target.checked }))}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <span className="ml-3 text-sm text-gray-700">Email lors du changement de statut</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={notifications.emailOnComment}
                onChange={(e) => setNotifications(prev => ({ ...prev, emailOnComment: e.target.checked }))}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <span className="ml-3 text-sm text-gray-700">Email lors de l'ajout d'un commentaire</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={notifications.pushNotifications}
                onChange={(e) => setNotifications(prev => ({ ...prev, pushNotifications: e.target.checked }))}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <span className="ml-3 text-sm text-gray-700">Notifications push dans le navigateur</span>
            </label>
          </div>

          <button
            onClick={handleSaveNotifications}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors flex items-center"
          >
            <Save className="w-4 h-4 mr-2" />
            Sauvegarder les préférences
          </button>
        </div>
      </div>

      {/* Gestion des utilisateurs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Users className="w-5 h-5 mr-2 text-orange-500" />
            Gestion des utilisateurs (Supabase)
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Gérez les accès et permissions
          </p>
        </div>
        
        <div className="p-6">
          {isSupabaseConfigured ? (
            <div className="space-y-6">
              {/* Liste des utilisateurs */}
              <div>
                <h3 className="text-md font-medium text-gray-900 mb-3">Utilisateurs existants</h3>
                {usersLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500 mx-auto"></div>
                    <p className="text-sm text-gray-600 mt-2">Chargement des utilisateurs...</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {users.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <p className="text-sm text-gray-600">{user.email}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.user_group === 'admin' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {user.user_group}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Formulaire d'ajout d'utilisateur */}
              <div>
                <h3 className="text-md font-medium text-gray-900 mb-3">Ajouter un utilisateur</h3>
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nom complet
                      </label>
                      <input
                        type="text"
                        value={newUser.name}
                        onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Groupe d'utilisateur
                    </label>
                    <select
                      value={newUser.user_group}
                      onChange={(e) => setNewUser(prev => ({ ...prev, user_group: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                      <option value="service_client">Service client</option>
                      <option value="service_technique">Service technique</option>
                      <option value="commercial">Commercial</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter l'utilisateur
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <Shield className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                Configurez d'abord Supabase pour gérer les utilisateurs.
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Cliquez sur "Connect to Supabase" en haut à droite.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Informations système */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Informations système</h2>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Version :</span>
              <span className="ml-2 font-medium">1.0.0</span>
            </div>
            <div>
              <span className="text-gray-600">Dernière mise à jour :</span>
              <span className="ml-2 font-medium">Janvier 2025</span>
            </div>
            <div>
              <span className="text-gray-600">Statut :</span>
              <span className="ml-2 font-medium text-green-600">Opérationnel</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;