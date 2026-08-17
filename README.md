# Hajj App — version corrigée

Monorepo de l'application de gestion des dossiers de pèlerinage : web, mobile Expo et API Express/MySQL.

## Structure

- `backend/` — API Express, authentification JWT, dossiers, documents, notifications.
- `mobile/` — application Expo/React Native.
- `web/` — interface React/Vite pour administrateurs et agences.
- `shared/src/` — constantes, validateurs et client API communs.

## Installation

```bash
npm install
```

### Backend

Copier `backend/.env.example` vers `backend/.env`, puis adapter la connexion MySQL.

```bash
npm run db:migrate
npm run db:seed
npm run dev:backend
```

API de santé : `http://localhost:3000/api/health`

### Web

```bash
npm run dev:web
```

### Mobile

Définir `EXPO_PUBLIC_API_URL` vers l'adresse IP accessible depuis le téléphone/émulateur, puis :

```bash
npm run dev:mobile
```

> `localhost` convient au navigateur et à certains simulateurs, mais pas à un téléphone physique. Utiliser l'IP LAN du PC pour ce dernier.

## Sécurité

- Aucun fichier `.env` réel n'est inclus dans l'archive.
- Les secrets de production doivent être configurés via l'environnement.
- Le secret JWT de secours est réservé au développement ; il doit être remplacé en production.
- `node_modules`, `.expo`, `dist` et `.git` ne sont pas distribués : ils sont régénérables et peuvent contenir des artefacts dépendants du système.

## Connexion Web + Mobile au backend

1. Démarrer MySQL puis exécuter `npm run db:migrate`.
2. Créer `backend/.env` depuis `backend/.env.example` et renseigner `DB_*`, `JWT_SECRET` et `PORT=3000`.
3. Démarrer l'API : `npm run dev:backend` puis vérifier `http://localhost:3000/api/health`.
4. Web : créer `web/.env` depuis `web/.env.example` avec `VITE_API_URL=http://localhost:3000` si le backend n'est pas servi par le proxy Vite.
5. Mobile : créer `mobile/.env` avec `EXPO_PUBLIC_API_URL=http://IP_DE_TON_PC:3000` pour un téléphone réel sur le même Wi-Fi. Pour l'émulateur Android, utiliser `http://10.0.2.2:3000`.
6. L'inscription appelle `POST /api/auth/register`, reçoit immédiatement un JWT, le stocke puis ouvre `/dashboard` sur le web ou `MainTabs` sur le mobile.
7. La connexion appelle `POST /api/auth/login`, stocke le JWT puis redirige selon le rôle.
