# Audit technique et recommandations — HajjFlow Cameroun

## 1. Stack actuelle

### Frontend Web
- React 18 + Vite
- React Router
- Tailwind CSS
- Structure basée sur `web/src/pages`, `components`, `contexts`, `styles` et `routes`

### Mobile
- Expo / React Native
- Navigation par stacks et tabs
- Auth context et notifications context déjà présents
- API service partagé via le package `shared`

### Backend
- Node.js + Express
- MySQL via `mysql2/promise`
- JWT + bcryptjs
- Helmet, CORS, rate limiting, morgan
- Upload de documents et fichiers statiques dans `backend/uploads`

### Shared
- Export central des constantes, rôles, enums et API client
- Couche commune pour le web/mobile

## 2. Architecture actuelle

Le projet suit déjà une logique de monorepo orientée SaaS :

- `backend/` : API REST, contrôleurs, middleware, routes, services, uploads
- `web/` : interface de gestion admin/agence
- `mobile/` : parcours pèlerin / accompagnement
- `shared/` : logique commune et types partagés

La structure est cohérente pour une évolution vers un produit multi-tenant et multi-rôle.

## 3. Structure des dossiers

### Backend
- `src/controllers/` : logique métier par module
- `src/routes/` : endpoints HTTP
- `src/middleware/` : authentification, validation, gestion d'erreurs
- `src/config/` : connexion DB
- `src/services/` : notifications et services métier
- `src/uploads/` : fichiers téléversés

### Web
- `src/pages/` : écrans par rôle et par module
- `src/components/layout/` : navigation, shell, layout global
- `src/contexts/` : Auth, Language, Notifications
- `src/routes/` : protected routes / guards
- `src/styles/` : thème UI, Tailwind, design tokens

### Mobile
- `src/navigation/` : navigation principale
- `src/screens/` : écrans applicatif
- `src/context/` et `src/contexts/` : état global
- `src/hooks/` : hooks personnalisés

## 4. Base de données actuelle

Le backend utilise MySQL avec un pool de connexions centralisé dans :
- `backend/src/config/database.js`

Les tables principales déjà exploitées dans le code incluent :
- `utilisateurs`
- `agences`
- `encadreurs`
- `groupes_pelerins`
- `groupe_membres`
- `dossiers`
- `documents`
- `notifications`

Le projet est bien orienté vers un modèle métier réel, avec logique RBAC et multi-rôle.

## 5. APIs existantes

### Auth
- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/logout` (selon structure commune)

### Admin
- `GET /api/admin/stats`
- `GET /api/admin/agencies`
- `POST /api/admin/agencies`
- `GET /api/admin/encadreurs`
- `POST /api/admin/encadreurs`

### Dossiers
- `GET /api/dossiers`
- `GET /api/dossiers/:id`
- crud défini dans la structure du backend

### Documents
- gestion des uploads et documents dans la route dédiée

### Notifications
- route de notification interne déjà prévue

### Groupes
- gestion des groupes et affectations déjà présente

## 6. Authentification existante

La structure est déjà solide :
- bcrypt pour hash des mots de passe
- JWT pour la session
- middleware `Auth.js` pour protéger les routes
- contrôles basés sur le rôle utilisateur

Bon point : le système est déjà construit sur le principe RBAC.

## 7. Fonctionnalités déjà implémentées

- Authentification web/mobile
- Routes protégées par rôle
- Gestion admin agences/encadreurs
- Dashboard admin de synthèse
- Gestion dossiers et documents
- Navigation multi-rôle
- Notifications internes
- Vue web pour pèlerins et agences
- Palette design cohérente et architecture visuelle propre

## 8. Bugs et limites actuels

### Déjà corrigés
- duplications de packages et mauvais chemins
- imports cassés de fichiers absents
- problèmes de casse Windows/Linux
- incohérences entre backend/frontend sur les champs d'authentification

### À surveiller
- les noms de colonnes MySQL doivent rester alignés avec les routes et le frontend
- certains modules restent partiellement mockés ou non finalisés
- la version admin dashboard est fonctionnelle mais peut être enrichie pour refléter le cahier des charges SaaS complet
- les routes de notifications/documents/groupes doivent être vérifiées pour cohérence exacte avec les données réelles
- le web et le mobile n’ont pas encore la couverture complète du cahier des charges (P0/P1)

## 9. Dette technique

- certains écrans restent encore inspirés de prototypes plutôt que d’un vrai SaaS métier complet
- fonctions métier très incomplètes pour les modules voyage, vols, hôtels, présence, QR, incidents, paiement avancé
- besoin d’un vrai design system partagé
- besoin de normaliser les libellés, statuts et conventions entre web/mobile/backend
- besoin de centraliser les règles métier dans des services plutôt que dans les contrôleurs

## 10. Fonctionnalités à conserver

- architecture multi-rôle
- middleware d’authentification
- structure par module
- navigation web et mobile
- API REST centralisée
- logique de base de données MySQL
- style app moderne et lisible

## 11. Fonctionnalités à refactoriser

- normaliser les statuts dossier, paiements, documents, groupes
- centraliser les validations métier dans des services
- séparer les contrôleurs et les règles de mappage de données
- homogénéiser `success/succes` sur le backend (à corriger si besoin)
- mieux découper le code pour le multi-tenant

## 12. Fonctionnalités à créer

### Priorité P0
- modules paie avancée + solde + échéances
- gestion des forfaits et saisons Hajj
- système d’import/export CSV/XLS
- clôture de voyage et cycle complet dossier
- dashboard KPI avancé par agence
- QR code + scan + présence
- notifications multi-canaux
- audit logs plus exhaustifs

### Priorité P1
- vols, hôtels, chambres, transport, programme de pèlerin
- incidents, contacts d’urgence
- support/tickets
- offline queue pour mobile

### Priorité P2+
- feature flags, analytics avancés, webhooks, API partenaire, IA assistant

## 13. Recommandation de livraison

Le bon chemin pour continuer sans casser le projet est :

1. Finaliser l’audit technique et les conventions de données
2. Renforcer le backend métier P0
3. Rendre les dashboards web plus propres et orientés SaaS
4. Ajouter les modules voyage / groupe / présence / QR
5. Sécuriser et documenter la couche API
6. Puis avancer vers le mobile et les modules avancés

## 14. Prochaine étape prioritaire

Le prochain objectif concret est de sécuriser et enrichir le cœur métier autour de :
- admin dashboard stats
- forfaits / saisons / pèlerins
- états de dossier et paiements
- structure backend modulaire pour les modules P0

Cette base permettra ensuite d’ajouter les modules de voyage, présence, QR et incidents sans réécrire le produit entier.
