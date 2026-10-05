/**
 * Point d'entrée du serveur Express
 * MyHajj237 — Backend API REST
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');

const { testConnection }  = require('./config/database');
const { gererErreur }     = require('./middleware/Errorhandler');

// ── Routes ────────────────────────────────────────────────────────────────────
const authRoutes          = require('./routes/auth');
const dossiersRoutes      = require('./routes/dossiers');
const notificationsRoutes = require('./routes/notifications');
const documentsRoutes = require('./routes/documents');
const adminRoutes = require('./routes/admin');
const groupsRoutes = require('./routes/groups');
const catalogRoutes = require('./routes/catalog');
const paymentsRoutes = require('./routes/payments');
const dashboardRoutes = require('./routes/dashboard');
const operationsRoutes = require('./routes/operations');
const agencyRoutes = require('./routes/agency');
const pelerinRoutes = require('./routes/pelerin');
const coursesRoutes = require('./routes/courses');
const newsRoutes = require('./routes/news');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Sécurité & headers HTTP ───────────────────────────────────────────────────
app.use(helmet());

// ── CORS — accepter les requêtes du web et du mobile (Expo) ──────────────────
const allowedOrigins = (process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// En développement, les appareils du réseau local (Expo web, Vite, téléphone en Wi-Fi) sont acceptés :
// localhost, 127.x, 10.x, 192.168.x et 172.16-31.x. En production, seule la liste CORS_ORIGINS est autorisée.
const PRIVATE_NETWORK_ORIGIN = /^https?:\/\/(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/;

app.use(cors({
  origin(origin, callback) {
    // Les applications natives Expo n'envoient généralement pas d'Origin.
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    if (process.env.NODE_ENV !== 'production' && PRIVATE_NETWORK_ORIGIN.test(origin)) return callback(null, true);
    return callback(new Error(`Origin non autorisée par CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

// ── Limitation des requêtes (anti-bruteforce) ─────────────────────────────────
const limiterGlobal = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: Number(process.env.RATE_LIMIT_MAX) || 600,
  message: { succes: false, message: 'Trop de requêtes, réessayez dans 15 minutes' },
});

const limiterAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 20,
  skipSuccessfulRequests: true, // seules les tentatives échouées comptent (anti-bruteforce)
  message: { succes: false, message: 'Trop de tentatives de connexion' },
});

app.use(limiterGlobal);

// ── Parsing JSON ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Logs de développement ─────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// ── Fichiers statiques (documents uploadés) ───────────────────────────────────
const path = require('path');
app.use('/uploads', express.static(path.resolve(__dirname, 'uploads'), {
  setHeaders(response, filePath) {
    // Helmet impose « same-origin » par défaut : sans cette ligne, les images (couvertures, pièces jointes)
    // ne s'affichent pas dans l'application mobile / web servie depuis une autre origine.
    response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    if (path.extname(filePath).toLowerCase() === '.jfif') response.setHeader('Content-Type', 'image/jpeg');
  },
}));

// ── Route de santé ────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    succes: true,
    message: 'API MyHajj237 Cameroun opérationnelle 🕌',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ── Routes applicatives ───────────────────────────────────────────────────────
// Le limiteur strict ne vise que la connexion et l'inscription : /auth/me est appelé à chaque chargement de page.
app.post('/api/auth/login',    limiterAuth);
app.post('/api/auth/register', limiterAuth);
app.post('/api/auth/forgot-password', limiterAuth);
app.post('/api/auth/reset-password', limiterAuth);
app.post('/api/auth/google', limiterAuth);
// Temps réel : toute écriture réussie prévient les autres clients connectés (ils relisent leurs écrans).
const realtimeHub = require('./services/realtime');
let syncTimer = null;
app.use('/api', (req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'OPTIONS' && !req.path.startsWith('/realtime') && !req.path.startsWith('/auth/login') && !req.path.startsWith('/notifications') && !req.path.endsWith('/read')) {
    res.on('finish', () => {
      if (res.statusCode >= 400) return;
      clearTimeout(syncTimer);
      syncTimer = setTimeout(() => realtimeHub.broadcast('sync', { by: req.utilisateur?.id ?? null }), 250);
    });
  }
  next();
});
app.use('/api/auth',          authRoutes);
app.use('/api/dossiers',      dossiersRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/paiements', paymentsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/operations', operationsRoutes);
app.use('/api/agency', agencyRoutes);
app.use('/api/pelerin', pelerinRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/realtime', require('./routes/realtime'));
require('./services/newsFeed').start();
require('./services/onboarding').backfillPilgrims().then((n) => { if (n) console.log(`[onboarding] ${n} pèlerin(s) rattaché(s) à un dossier et un groupe`); }).catch(() => {});

// ── Route 404 ─────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ succes: false, message: `Route introuvable : ${req.method} ${req.path}` });
});

// ── Gestionnaire d'erreurs global ─────────────────────────────────────────────
app.use(gererErreur);

// ── Démarrage ─────────────────────────────────────────────────────────────────
const demarrer = async () => {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`\n🕌 Serveur MyHajj237 démarré`);
    console.log(`   → http://localhost:${PORT}/api/health\n`);
  });
};

demarrer();