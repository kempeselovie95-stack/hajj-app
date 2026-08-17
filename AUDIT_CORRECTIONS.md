# Audit et corrections appliquées

## Bloquants corrigés

1. Manifestes nommés `Package.JSON` au lieu de `package.json`.
2. Workspaces racine pointant vers `packages/*` alors que les dossiers réels sont `backend`, `mobile`, `shared/src` et `web`.
3. Imports sensibles à la casse (`Client.js`/`client.js`, contrôleurs et middleware backend) incompatibles avec Linux.
4. Le backend importait des fichiers inexistants (`errorHandler`, contrôleurs et service de notifications).
5. Les routes backend étaient des routes de démonstration alors que les contrôleurs réels existaient.
6. Les routes d'authentification frontend et backend n'utilisaient pas les mêmes chemins ni les mêmes noms de champs.
7. Le frontend attendait `user`, tandis que le backend renvoyait uniquement `utilisateur`.
8. Les statuts métier étaient incohérents entre le frontend partagé et la base MySQL.
9. Le service de notification push manquait et le code mélangeait FCM et tokens Expo.
10. Les routes de documents et l'upload n'étaient pas réellement implémentés.
11. Deux contextes d'authentification mobile identiques existaient ; un seul a été conservé.
12. Le client API partagé référençait un fichier `client.js` absent et imposait un `Content-Type` JSON incompatible avec les uploads multipart.
13. Les dépendances mobiles réellement importées n'étaient pas déclarées dans `mobile/package.json`.
14. Les anciens fichiers et manifestes en doublon ont été supprimés pour éviter les architectures concurrentes.
15. Les anciens fichiers `node_modules`, `.expo`, `dist` et `.git` ne sont plus considérés comme des sources du projet et ne sont pas redistribués.

## Vérifications effectuées

- Analyse des imports locaux : aucune référence locale cassée restante.
- Analyse des imports externes : chaque dépendance applicative est déclarée dans son workspace.
- Parsing JavaScript/JSX : tous les fichiers source passent l'analyse syntaxique.
- Chargement des modules backend principaux : contrôleurs, routes et middleware chargés sans erreur.
- Chargement du package partagé ESM : exports disponibles correctement.
- Recherche de clés privées et secrets embarqués : aucun secret de production détecté.

## Limite de validation

Le build complet ne peut pas être considéré comme une validation de l'environnement d'origine, car les `node_modules` contenus dans l'archive initiale étaient incomplets/corrompus et dépendants de leur plateforme. L'archive corrigée ne contient donc volontairement pas ces dépendances générées ; `npm install` doit être exécuté sur la machine cible avant le lancement.
