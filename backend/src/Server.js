/**
 * Point d'entrée du serveur Express
 * Hajj App — Backend API REST
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');

const { testConnection }  = require('./config/database');
const { gererErreur }     = require('./middleware/errorHandler');

// ── Routes ────────────────────────────────────────────────────────────────────
const authRoutes          = require('./routes/auth');
const dossiersRoutes      = require('./routes/dossiers');
const notificationsRoutes = require('./routes/notifications');
const documentsRoutes = require('./routes/documents');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Sécurité & headers HTTP ───────────────────────────────────────────────────
app.use(helmet());

// ── CORS — accepter les requêtes du web et du mobile (Expo) ──────────────────
app.use(cors({
  origin: [
    process.env.CORS_ORIGIN || 'http://localhost:3000',
    'http://localhost:3000',
    'http://localhost:8081',
    'http://localhost:19000',
    'exp://localhost:19000',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

// ── Limitation des requêtes (anti-bruteforce) ─────────────────────────────────
const limiterGlobal = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { succes: false, message: 'Trop de requêtes, réessayez dans 15 minutes' },
});

const limiterAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
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
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// ── Route de santé ────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    succes: true,
    message: 'API Hajj Cameroun opérationnelle 🕌',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ── Routes applicatives ───────────────────────────────────────────────────────
app.use('/api/auth',          limiterAuth, authRoutes);
app.use('/api/dossiers',      dossiersRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/documents', documentsRoutes);

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
    console.log(`\n🕌 Serveur Hajj App démarré`);
    console.log(`   → http://localhost:${PORT}/api/health\n`);
  });
};

demarrer();