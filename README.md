# Outil de Ticketing SunLib

Un outil de ticketing moderne et complet pour gérer les tickets de support provenant de différentes sources (installateurs, abonnés, équipe SunLib).

## 🚀 Fonctionnalités

- **Dashboard** avec statistiques en temps réel
- **Création de tickets** avec formulaire dynamique
- **Gestion complète** des tickets (statuts, priorités, assignation)
- **Système de commentaires** et historique
- **Intégration Airtable** pour la synchronisation des données
- **Interface responsive** optimisée mobile et desktop
- **Notifications** configurables

## ⚙️ Configuration

### Variables d'environnement

Créez un fichier `.env` à la racine du projet avec vos identifiants Airtable :

```env
VITE_AIRTABLE_API_KEY=votre_clé_api_airtable
VITE_AIRTABLE_SUBSCRIBERS_BASE_ID=id_de_votre_base_abonnés
VITE_AIRTABLE_HR_BASE_ID=id_de_votre_base_rh
```

### Comment obtenir vos identifiants Airtable

1. **Clé API** : 
   - Connectez-vous à Airtable
   - Allez dans Account → API
   - Générez une nouvelle clé API

2. **ID de base** :
   - Ouvrez votre base Airtable
### Structure des bases Airtable requise

#### Base Abonnés
- **Table "Abonnés"** : Nom, Prenom, Contrat abonné, Nom de l'entreprise (from Installateur)
- **Table "Installateurs"** : Name, Company
- **Table "Tickets"** : pour la synchronisation des tickets créés

### Configuration Supabase

L'application utilise maintenant Supabase pour la gestion des utilisateurs (remplace la base RH Airtable).

1. **Connexion Supabase** : Cliquez sur "Connect to Supabase" en haut à droite
2. **Base de données** : Une table `users` sera automatiquement créée
3. **Gestion** : Ajoutez vos utilisateurs via l'interface de paramètres

## 🛠️ Installation et démarrage

```bash
# Installation des dépendances
npm install

# Démarrage en mode développement
npm run dev

# Build pour la production
npm run build
```

## 📱 Utilisation

1. **Configuration Supabase** : 
   - Cliquez sur "Connect to Supabase" pour configurer la base de données
   - Les migrations créeront automatiquement les utilisateurs de test
2. **Configuration Airtable** : Ajoutez vos clés Airtable dans le fichier `.env`
3. **Vérification** : Allez dans Paramètres pour vérifier la connexion
4. **Connexion** : Utilisez les comptes de test ou créez vos propres utilisateurs
5. **Utilisation** : Créez vos premiers tickets !

### Comptes de test

Après la configuration Supabase, vous pouvez vous connecter avec :
- **Admin** : admin@sunlib.fr / admin123
- **Support** : marie.dubois@sunlib.fr / support123

## 🎨 Design

L'interface utilise la palette graphique SunLib avec des tons orange/jaune rappelant l'énergie solaire, optimisée pour une utilisation professionnelle.

## 🔒 Sécurité

- Configuration via variables d'environnement
- Authentification Supabase sécurisée
- Row Level Security (RLS) activé
- Validation des données côté client
- Gestion d'erreurs robuste

## 📞 Support

Pour toute question ou problème, consultez la section Paramètres de l'application qui contient des guides détaillés pour la configuration.