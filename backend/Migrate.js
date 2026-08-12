/**
 * Script de migration — crée toutes les tables MySQL
 * Exécuter : npm run db:migrate
 */

require('dotenv').config();
const { pool } = require('../config/database');

const tables = [
  // ── Utilisateurs ────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS utilisateurs (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    nom           VARCHAR(100)  NOT NULL,
    prenom        VARCHAR(100)  NOT NULL,
    email         VARCHAR(150)  NOT NULL UNIQUE,
    telephone     VARCHAR(20),
    mot_de_passe  VARCHAR(255)  NOT NULL,
    role          ENUM('admin','agence','pelerin') NOT NULL DEFAULT 'pelerin',
    est_actif     BOOLEAN NOT NULL DEFAULT TRUE,
    fcm_token     VARCHAR(255),
    cree_le       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    mis_a_jour_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,

  // ── Agences de voyage ────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS agences (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    utilisateur_id INT NOT NULL,
    nom_agence    VARCHAR(200) NOT NULL,
    numero_agrement VARCHAR(50),
    adresse       TEXT,
    cree_le       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
  )`,

  // ── Dossiers pèlerins ────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS dossiers (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    pelerin_id      INT NOT NULL,
    agence_id       INT,
    numero_dossier  VARCHAR(50) UNIQUE NOT NULL,
    annee_hajj      YEAR NOT NULL,
    statut          ENUM('en_attente','en_cours','valide','rejete','annule') NOT NULL DEFAULT 'en_attente',
    type_package    ENUM('economique','standard','premium') DEFAULT 'standard',
    date_depart     DATE,
    date_retour     DATE,
    notes           TEXT,
    cree_le         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    mis_a_jour_le   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (pelerin_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
    FOREIGN KEY (agence_id)  REFERENCES agences(id) ON DELETE SET NULL
  )`,

  // ── Documents ────────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS documents (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    dossier_id    INT NOT NULL,
    type_document ENUM('passeport','photo','certificat_medical','acte_naissance','autre') NOT NULL,
    nom_fichier   VARCHAR(255) NOT NULL,
    chemin_fichier VARCHAR(500) NOT NULL,
    taille_octets  INT,
    est_valide    BOOLEAN DEFAULT NULL,
    valide_par    INT,
    valide_le     TIMESTAMP NULL,
    cree_le       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dossier_id) REFERENCES dossiers(id) ON DELETE CASCADE,
    FOREIGN KEY (valide_par) REFERENCES utilisateurs(id) ON DELETE SET NULL
  )`,

  // ── Notifications ────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS notifications (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    destinataire_id INT NOT NULL,
    titre           VARCHAR(200) NOT NULL,
    corps           TEXT NOT NULL,
    type            ENUM('info','succes','avertissement','erreur') DEFAULT 'info',
    est_lue         BOOLEAN NOT NULL DEFAULT FALSE,
    lue_le          TIMESTAMP NULL,
    cree_le         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (destinataire_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
  )`,

  // ── Historique statuts dossier ───────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS historique_statuts (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    dossier_id  INT NOT NULL,
    statut      VARCHAR(50) NOT NULL,
    commentaire TEXT,
    modifie_par INT,
    cree_le     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dossier_id)  REFERENCES dossiers(id) ON DELETE CASCADE,
    FOREIGN KEY (modifie_par) REFERENCES utilisateurs(id) ON DELETE SET NULL
  )`,
];

const migrate = async () => {
  console.log('🔄 Migration en cours...\n');
  try {
    for (const sql of tables) {
      // Extraire le nom de la table pour l'affichage
      const match = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/);
      const tableName = match ? match[1] : 'inconnue';
      await pool.execute(sql);
      console.log(`  ✅ Table "${tableName}" prête`);
    }
    console.log('\n🎉 Migration terminée avec succès');
  } catch (error) {
    console.error('❌ Erreur migration :', error.message);
  } finally {
    await pool.end();
  }
};

migrate();