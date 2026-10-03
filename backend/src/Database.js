/**
 * Configuration de la connexion MySQL (Laragon)
 * Utilise un pool de connexions pour de meilleures performances
 */

const mysql = require('mysql2/promise');

// ── Pool de connexions ────────────────────────────────────────────────────────
const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               process.env.DB_PORT     || 3306,
  database:           process.env.DB_NAME     || 'hajj_cameroun',
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone:           '+00:00',
});

const initializeSchema = async () => {
  const statements = [
    `CREATE TABLE IF NOT EXISTS saisons_hajj (
      id INT AUTO_INCREMENT PRIMARY KEY,
      libelle VARCHAR(120) NOT NULL,
      annee YEAR NOT NULL,
      date_debut DATE,
      date_fin DATE,
      description TEXT,
      est_active BOOLEAN NOT NULL DEFAULT TRUE,
      cree_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_saison_annee (annee)
    )`,
    `CREATE TABLE IF NOT EXISTS forfaits (
      id INT AUTO_INCREMENT PRIMARY KEY,
      saison_id INT NOT NULL,
      nom VARCHAR(120) NOT NULL,
      description TEXT,
      prix DECIMAL(12,2) NOT NULL,
      devise VARCHAR(10) NOT NULL DEFAULT 'XAF',
      inclus TEXT,
      est_actif BOOLEAN NOT NULL DEFAULT TRUE,
      cree_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (saison_id) REFERENCES saisons_hajj(id) ON DELETE CASCADE,
      UNIQUE KEY uq_forfait_saison_nom (saison_id, nom)
    )`,
    `CREATE TABLE IF NOT EXISTS paiements (
      id INT AUTO_INCREMENT PRIMARY KEY,
      dossier_id INT NOT NULL,
      forfait_id INT NULL,
      montant DECIMAL(12,2) NOT NULL,
      devise VARCHAR(10) NOT NULL DEFAULT 'XAF',
      statut ENUM('en_attente','valide','rejete','annule') NOT NULL DEFAULT 'en_attente',
      moyen_paiement VARCHAR(50),
      reference VARCHAR(120),
      commentaire TEXT,
      cree_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      confirme_le TIMESTAMP NULL,
      FOREIGN KEY (dossier_id) REFERENCES dossiers(id) ON DELETE CASCADE,
      FOREIGN KEY (forfait_id) REFERENCES forfaits(id) ON DELETE SET NULL
    )`,
  ];

  for (const statement of statements) {
    await pool.execute(statement);
  }
};

// ── Test de connexion au démarrage ────────────────────────────────────────────
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL connecté — base :', process.env.DB_NAME);
    connection.release();
    await initializeSchema();
  } catch (error) {
    console.error('❌ Échec connexion MySQL :', error.message);
    process.exit(1);
  }
};

module.exports = { pool, testConnection };