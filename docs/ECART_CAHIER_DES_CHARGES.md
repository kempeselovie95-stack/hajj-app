# Écart avec le cahier des charges HajjFlow — état au 04/10/2026

Stack conservée (Express + MySQL + React/Vite + Expo), conformément à la consigne « ne pas migrer inutilement ».
Légende : ✅ fait · 🟡 partiel · ❌ absent.

## Fait dans cette itération — Opérations Hajj (P1, §21-26, 18-20, 34)

| Section | Statut | Détail |
|---|---|---|
| §21 Voyages | ✅ | CRUD, statuts, dates cohérentes, périmètre par agence |
| §22 Vols | ✅ | CRUD + association vol ↔ groupes |
| §23 Hôtels | ✅ | CRUD, check-in/out, occupation |
| §24 Chambres | ✅ | Capacité, affectation/déplacement/retrait (1 pèlerin = 1 chambre par hôtel, transaction + verrou) |
| §25 Transport | ✅ | Véhicules, chauffeurs, transferts liés à un groupe |
| §26 Programme | ✅ | Événements datés (général ou par groupe), vue pèlerin « Mon voyage » groupée par jour |
| §18 QR Code | ✅ | Jeton opaque 192 bits (aucune donnée personnelle), code public `HAJJ-CM-2027-000184`, impression |
| §19 Scan QR | ✅ | Scan caméra (BarcodeDetector) ou collage, motifs contrôle/présence/embarquement/transport/arrivée/assistance, journalisé |
| §20 Présence | ✅ | Appel par groupe (présent / à vérifier / absent), compteurs du jour |
| §34 Incidents | ✅ | 7 catégories, priorités, statuts, notification de l'agence |
| §39 Audit log | 🟡 | Table `journal_audit` + écritures sur toutes les opérations ci-dessus ; lecture API admin (`GET /api/operations/audit`), pas encore d'écran ni de couverture des modules existants |
| §41 Multi-tenant | 🟡 | Appliqué sur les modules ci-dessus (404 hors périmètre, `agence_id` client jamais cru) ; modules historiques à auditer |
| §46 i18n fr/en/ar | ✅ | Toute l'interface web, y compris RTL, dates, montants |
| §56-57 Tests | 🟡 | 36 tests d'intégration (`npm run test:operations`) dont l'isolation inter-agences ; rien sur les modules historiques |

## À faire — priorisé

### P0 (bloquant pour un produit commercial)
- ❌ **Refresh tokens / révocation de sessions / OTP** (§8) — le JWT est unique (7 j).
- ❌ **RBAC fin** (§4.3) : un seul rôle `agence` ; pas de rôles « agent » à permissions configurables ni de super-admin plateforme distinct.
- 🟡 **Multi-tenant historique** (§41) : l'organisation = ligne `agences` liée à *un* utilisateur. Il faut une vraie table `organizations` + `organization_id` sur les utilisateurs/ressources.
  **Bug de données repéré :** `Seed.js` insère une nouvelle ligne `agences` à chaque exécution (7 doublons pour `agence@hajj-cm.com`) — à corriger avant tout travail multi-tenant.
- ❌ **Format d'erreur unifié** (§45) : les anciens contrôleurs renvoient `{succes, message}` sans `code` stable (les nouveaux renvoient un `code`).
- ❌ **Pèlerin complet** (§10) : sexe, naissance, nationalité, passeport (n°, émission, expiration), région… absents du modèle.
- ❌ **Machine d'états du dossier** (§11) : 8 statuts actuels vs. 15 attendus (visa, voyage, retour…).
- 🟡 **Paiements** (§14-15, 70.4) : pas d'échéances, remboursements, abstraction `PaymentProvider`, webhooks ; montants en `DECIMAL` (OK) mais calculs encore en `Number` côté JS.
- ❌ **Stockage objet + URLs signées** (§12, 40) : fichiers sur disque local, servis publiquement sous `/uploads`.
- ❌ **Documentation** (§72) : pas de `ARCHITECTURE.md`, `API.md` (Swagger), `SECURITY.md`, `DEPLOYMENT.md`.

### P1
- ❌ Notifications multicanal Push/Email/SMS + centre « Importantes » (§27-29) — seul l'in-app et Expo push partiel.
- ❌ Import Excel/CSV, export Excel/PDF, pagination/tri serveur (§37-38) ; le bouton « Importer/Exporter » de la page Pèlerins est décoratif.
- ❌ Mode hors ligne mobile + file de synchronisation (§30).
- ❌ **Application mobile** : écrans Voyage/QR/Groupe/Guide/Incidents (§31-33) — le mobile n'a pas été touché ; il n'est pas internationalisé.
- ❌ Contacts d'urgence (§35), scoring de complétude (§66), onboarding agence/pèlerin (§64-65).

### P2/P3
- ❌ Plans SaaS, abonnements, limites, feature flags, tickets de support, API publique, webhooks, IA, analytics avancés (§49-51, 62-63, 67-69).
- ❌ Docker, CI/CD, observabilité, sauvegardes (§59-60, 74), RGPD (§61), monorepo TypeScript (§6-7 — non recommandé tant que le produit n'est pas stabilisé).

## Prochaine étape recommandée
1. Corriger le seed (doublons d'agences) puis introduire la table `organizations` (P0 multi-tenant).
2. Enrichir le pèlerin + machine d'états du dossier (P0).
3. Mobile : écran « Mon voyage » + QR (le backend `/api/operations/me/trip` et `/qr/me` est prêt).
