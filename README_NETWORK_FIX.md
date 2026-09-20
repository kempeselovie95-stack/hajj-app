# Correctif Network Error — Hajj App Mobile

## Pourquoi l'erreur arrivait

Une application Expo exécutée sur un téléphone ne doit pas appeler `http://localhost:3000` pour joindre le backend installé sur le PC. `localhost` désigne le téléphone lui-même.

## Installation

1. Copie `shared/src/api/Client.js` dans ton branche `shared/src/api/Client.js`.
2. Copie `mobile/src/contexts/AuthContext.jsx` dans ton branche `mobile/src/contexts/AuthContext.jsx`.
3. Si `mobile/src/context/AuthContext.jsx` existe encore, remplace-le également afin d'éviter qu'une ancienne branche soit utilisée.
4. Dans `mobile/.env`, mets l'IPv4 LAN du PC :

   `EXPO_PUBLIC_API_URL=http://192.168.1.25:3000`

   Remplace `192.168.1.25` par la valeur obtenue avec `ipconfig`.
5. Démarre le backend : `npm start`.
6. Depuis le navigateur du téléphone, vérifie `http://IP_DU_PC:3000/api/health`.
7. Dans le dossier mobile : `npx expo start -c`.

## Test attendu

Le téléphone doit accéder à `/api/health`, puis l'inscription doit appeler `/api/auth/register`.

## Attention

- PC et téléphone doivent être sur le même réseau local.
- Autorise Node.js/port TCP 3000 dans le pare-feu Windows si nécessaire.
- Ne mets pas `localhost` dans `EXPO_PUBLIC_API_URL` sur un téléphone physique.
- Le backend doit écouter sur toutes les interfaces. `app.listen(PORT)` de Node le permet par défaut.
