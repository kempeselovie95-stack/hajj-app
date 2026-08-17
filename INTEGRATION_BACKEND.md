# Intégration Web + Mobile ↔ Backend

## Flux d'authentification

- Web et mobile utilisent le client Axios partagé dans `shared/src/api`.
- `POST /api/auth/register` crée un pèlerin et renvoie `{ token, user }`.
- `POST /api/auth/login` renvoie `{ token, user }`.
- Le token est conservé dans `localStorage` sur le web et `expo-secure-store` sur mobile.
- `GET /api/auth/me` restaure la session au redémarrage.
- Une réponse HTTP 401 purge automatiquement le token.
- Après inscription/connexion, le web arrive sur `/dashboard` pour un pèlerin ; le mobile bascule automatiquement de `AuthStack` vers `MainTabs`.

## URLs selon l'environnement

| Client | URL API recommandée |
|---|---|
| Web en développement | `http://localhost:3000` |
| Android Emulator | `http://10.0.2.2:3000` |
| iOS Simulator | `http://localhost:3000` |
| Téléphone réel | `http://IP_LAN_DU_PC:3000` |

Ne mets jamais `localhost` dans `EXPO_PUBLIC_API_URL` si l'application tourne sur un téléphone réel : `localhost` désigne le téléphone lui-même.

## Ordre de démarrage

```text
MySQL → Backend :3000 → Web :5173 / Expo
```

Test backend : `GET /api/health`.

## Important

Les variables `.env` ne sont pas incluses. Copie les fichiers `.env.example` et renseigne les valeurs adaptées à ta machine.
