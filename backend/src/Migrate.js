require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { pool } = require('./config/database');

const compatibility = [
  `ALTER TABLE dossiers MODIFY COLUMN statut ENUM('en_attente','en_cours','valide','rejete','annule','brouillon','soumis','en_verification','transmis_nusuk','confirme') NOT NULL DEFAULT 'brouillon'`,
  `UPDATE dossiers SET statut='soumis' WHERE statut='en_attente'`,
  `UPDATE dossiers SET statut='en_verification' WHERE statut='en_cours'`,
  `ALTER TABLE dossiers MODIFY COLUMN statut ENUM('brouillon','soumis','en_verification','valide','transmis_nusuk','confirme','rejete','annule') NOT NULL DEFAULT 'brouillon'`,
  `ALTER TABLE documents MODIFY COLUMN type_document VARCHAR(60) NOT NULL`,
  `ALTER TABLE notifications MODIFY COLUMN type ENUM('succes','avertissement','erreur','statut_dossier','document_valide','document_rejete','info') DEFAULT 'info'`,
  `UPDATE notifications SET type='statut_dossier' WHERE type IN ('succes','avertissement','erreur')`,
  `ALTER TABLE notifications MODIFY COLUMN type ENUM('statut_dossier','document_valide','document_rejete','info') DEFAULT 'info'`,
];

const tables = [
`CREATE TABLE IF NOT EXISTS utilisateurs (
 id INT AUTO_INCREMENT PRIMARY KEY, nom VARCHAR(100) NOT NULL, prenom VARCHAR(100) NOT NULL,
 email VARCHAR(150) NOT NULL UNIQUE, telephone VARCHAR(20), mot_de_passe VARCHAR(255) NOT NULL,
 role ENUM('admin','agence','pelerin') NOT NULL DEFAULT 'pelerin', est_actif BOOLEAN NOT NULL DEFAULT TRUE,
 fcm_token VARCHAR(255), cree_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP, mis_a_jour_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)`,
`CREATE TABLE IF NOT EXISTS agences (
 id INT AUTO_INCREMENT PRIMARY KEY, utilisateur_id INT NOT NULL, nom_agence VARCHAR(200) NOT NULL,
 numero_agrement VARCHAR(50), adresse TEXT, cree_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
)`,
`CREATE TABLE IF NOT EXISTS dossiers (
 id INT AUTO_INCREMENT PRIMARY KEY, pelerin_id INT NOT NULL, agence_id INT, numero_dossier VARCHAR(50) UNIQUE NOT NULL,
 annee_hajj YEAR NOT NULL, statut ENUM('brouillon','soumis','en_verification','valide','transmis_nusuk','confirme','rejete','annule') NOT NULL DEFAULT 'brouillon',
 type_package ENUM('economique','standard','premium') DEFAULT 'standard', date_depart DATE, date_retour DATE, notes TEXT,
 cree_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP, mis_a_jour_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY (pelerin_id) REFERENCES utilisateurs(id) ON DELETE CASCADE, FOREIGN KEY (agence_id) REFERENCES agences(id) ON DELETE SET NULL
)`,
`CREATE TABLE IF NOT EXISTS documents (
 id INT AUTO_INCREMENT PRIMARY KEY, dossier_id INT NOT NULL, type_document VARCHAR(60) NOT NULL, nom_fichier VARCHAR(255) NOT NULL,
 chemin_fichier VARCHAR(500) NOT NULL, taille_octets INT, est_valide BOOLEAN DEFAULT NULL, valide_par INT, valide_le TIMESTAMP NULL,
 cree_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY uq_document_type (dossier_id,type_document),
 FOREIGN KEY (dossier_id) REFERENCES dossiers(id) ON DELETE CASCADE, FOREIGN KEY (valide_par) REFERENCES utilisateurs(id) ON DELETE SET NULL
)`,
`CREATE TABLE IF NOT EXISTS notifications (
 id INT AUTO_INCREMENT PRIMARY KEY, destinataire_id INT NOT NULL, titre VARCHAR(200) NOT NULL, corps TEXT NOT NULL,
 type ENUM('statut_dossier','document_valide','document_rejete','info') DEFAULT 'info', est_lue BOOLEAN NOT NULL DEFAULT FALSE,
 lue_le TIMESTAMP NULL, cree_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (destinataire_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
)`,
`CREATE TABLE IF NOT EXISTS historique_statuts (
 id INT AUTO_INCREMENT PRIMARY KEY, dossier_id INT NOT NULL, statut VARCHAR(50) NOT NULL, commentaire TEXT, modifie_par INT,
 cree_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (dossier_id) REFERENCES dossiers(id) ON DELETE CASCADE, FOREIGN KEY (modifie_par) REFERENCES utilisateurs(id) ON DELETE SET NULL
)`];
(async()=>{try{for(const sql of tables){await pool.execute(sql);console.log('✅',sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)[1]);} for(const sql of compatibility){try{await pool.execute(sql)}catch(e){if(!/Duplicate column|already exists|doesn't exist/.test(e.message)) throw e;}} console.log('🎉 Migration terminée');}catch(e){console.error('❌ Migration:',e.message);process.exitCode=1;}finally{await pool.end();}})();
