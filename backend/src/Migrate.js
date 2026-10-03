require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { pool } = require('./config/database');

const compatibility = [
  `ALTER TABLE utilisateurs MODIFY COLUMN role ENUM('admin','agence','encadreur','pelerin') NOT NULL DEFAULT 'pelerin'`,
  `ALTER TABLE groupes_pelerins MODIFY COLUMN encadreur_id INT NULL`,
  `ALTER TABLE dossiers MODIFY COLUMN statut ENUM('en_attente','en_cours','valide','rejete','annule','brouillon','soumis','en_verification','transmis_nusuk','confirme') NOT NULL DEFAULT 'brouillon'`,
  `UPDATE dossiers SET statut='soumis' WHERE statut='en_attente'`,
  `UPDATE dossiers SET statut='en_verification' WHERE statut='en_cours'`,
  `ALTER TABLE dossiers MODIFY COLUMN statut ENUM('brouillon','soumis','en_verification','valide','transmis_nusuk','confirme','rejete','annule') NOT NULL DEFAULT 'brouillon'`,
  `ALTER TABLE dossiers ADD COLUMN saison_id INT NULL`,
  `ALTER TABLE dossiers ADD COLUMN forfait_id INT NULL`,
  `ALTER TABLE agences ADD COLUMN legal_name VARCHAR(200) NULL`,
  `ALTER TABLE agences ADD COLUMN country VARCHAR(100) NOT NULL DEFAULT 'Cameroun'`,
  `ALTER TABLE agences ADD COLUMN city VARCHAR(100) NULL`,
  `ALTER TABLE agences ADD COLUMN phone VARCHAR(30) NULL`,
  `ALTER TABLE agences ADD COLUMN email VARCHAR(150) NULL`,
  `ALTER TABLE agences ADD COLUMN logo VARCHAR(500) NULL`,
  `ALTER TABLE agences ADD COLUMN status ENUM('ACTIVE','SUSPENDED','PENDING','ARCHIVED') NOT NULL DEFAULT 'ACTIVE'`,
  `ALTER TABLE agences ADD COLUMN subscription_plan VARCHAR(50) NOT NULL DEFAULT 'STARTER'`,
  `ALTER TABLE agences ADD COLUMN subscription_status ENUM('ACTIVE','TRIAL','PAST_DUE','CANCELLED') NOT NULL DEFAULT 'TRIAL'`,
  `ALTER TABLE agences ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`,
  `UPDATE agences a JOIN utilisateurs u ON u.id=a.utilisateur_id SET a.legal_name=COALESCE(a.legal_name,a.nom_agence),a.phone=COALESCE(a.phone,u.telephone),a.email=COALESCE(a.email,u.email)`,
  `ALTER TABLE documents MODIFY COLUMN type_document VARCHAR(60) NOT NULL`,
  `ALTER TABLE documents ADD COLUMN statut ENUM('PENDING','UNDER_REVIEW','APPROVED','REJECTED','EXPIRED') NOT NULL DEFAULT 'PENDING'`,
  `ALTER TABLE documents ADD COLUMN motif_rejet VARCHAR(1000) NULL`,
  `ALTER TABLE documents ADD COLUMN expiration_date DATE NULL`,
  `UPDATE documents SET statut=CASE WHEN est_valide=TRUE THEN 'APPROVED' WHEN est_valide=FALSE THEN 'REJECTED' ELSE 'PENDING' END WHERE statut='PENDING'`,
  `ALTER TABLE notifications MODIFY COLUMN type ENUM('succes','avertissement','erreur','statut_dossier','document_valide','document_rejete','info') DEFAULT 'info'`,
  `UPDATE notifications SET type='statut_dossier' WHERE type IN ('succes','avertissement','erreur')`,
  `ALTER TABLE notifications MODIFY COLUMN type ENUM('statut_dossier','document_valide','document_rejete','info') DEFAULT 'info'`,
];

const tables = [
`CREATE TABLE IF NOT EXISTS utilisateurs (
 id INT AUTO_INCREMENT PRIMARY KEY, nom VARCHAR(100) NOT NULL, prenom VARCHAR(100) NOT NULL,
 email VARCHAR(150) NOT NULL UNIQUE, telephone VARCHAR(20), mot_de_passe VARCHAR(255) NOT NULL,
 role ENUM('admin','agence','encadreur','pelerin') NOT NULL DEFAULT 'pelerin', est_actif BOOLEAN NOT NULL DEFAULT TRUE,
 fcm_token VARCHAR(255), cree_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP, mis_a_jour_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)`,
`CREATE TABLE IF NOT EXISTS agences (
 id INT AUTO_INCREMENT PRIMARY KEY, utilisateur_id INT NOT NULL, nom_agence VARCHAR(200) NOT NULL,
 numero_agrement VARCHAR(50), adresse TEXT, legal_name VARCHAR(200), country VARCHAR(100) NOT NULL DEFAULT 'Cameroun',
 city VARCHAR(100), phone VARCHAR(30), email VARCHAR(150), logo VARCHAR(500),
 status ENUM('ACTIVE','SUSPENDED','PENDING','ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
 subscription_plan VARCHAR(50) NOT NULL DEFAULT 'STARTER',
 subscription_status ENUM('ACTIVE','TRIAL','PAST_DUE','CANCELLED') NOT NULL DEFAULT 'TRIAL',
 cree_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
)`,
`CREATE TABLE IF NOT EXISTS encadreurs (
 id INT AUTO_INCREMENT PRIMARY KEY, utilisateur_id INT NOT NULL UNIQUE, agence_id INT NOT NULL,
 cree_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
 FOREIGN KEY (agence_id) REFERENCES agences(id) ON DELETE CASCADE
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
 chemin_fichier VARCHAR(500) NOT NULL, taille_octets INT, est_valide BOOLEAN DEFAULT NULL,
 statut ENUM('PENDING','UNDER_REVIEW','APPROVED','REJECTED','EXPIRED') NOT NULL DEFAULT 'PENDING',
 motif_rejet VARCHAR(1000), expiration_date DATE, valide_par INT, valide_le TIMESTAMP NULL,
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
)`,
`CREATE TABLE IF NOT EXISTS saisons_hajj (
 id INT AUTO_INCREMENT PRIMARY KEY, libelle VARCHAR(120) NOT NULL, annee YEAR NOT NULL,
 date_debut DATE, date_fin DATE, description TEXT, est_active BOOLEAN NOT NULL DEFAULT TRUE,
 cree_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY uq_saison_annee (annee)
)`,
`CREATE TABLE IF NOT EXISTS forfaits (
 id INT AUTO_INCREMENT PRIMARY KEY, saison_id INT NOT NULL, nom VARCHAR(120) NOT NULL,
 description TEXT, prix DECIMAL(12,2) NOT NULL, devise VARCHAR(10) NOT NULL DEFAULT 'XAF',
 inclus TEXT, est_actif BOOLEAN NOT NULL DEFAULT TRUE, cree_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (saison_id) REFERENCES saisons_hajj(id) ON DELETE CASCADE, UNIQUE KEY uq_forfait_saison_nom (saison_id, nom)
)`,
`CREATE TABLE IF NOT EXISTS paiements (
 id INT AUTO_INCREMENT PRIMARY KEY, dossier_id INT NOT NULL, forfait_id INT NULL,
 montant DECIMAL(12,2) NOT NULL, devise VARCHAR(10) NOT NULL DEFAULT 'XAF',
 statut ENUM('en_attente','valide','rejete','annule') NOT NULL DEFAULT 'en_attente',
 moyen_paiement VARCHAR(50), reference VARCHAR(120), commentaire TEXT,
 cree_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP, confirme_le TIMESTAMP NULL,
 FOREIGN KEY (dossier_id) REFERENCES dossiers(id) ON DELETE CASCADE,
 FOREIGN KEY (forfait_id) REFERENCES forfaits(id) ON DELETE SET NULL
)`,
`CREATE TABLE IF NOT EXISTS groupes_pelerins (
 id INT AUTO_INCREMENT PRIMARY KEY, nom VARCHAR(150) NOT NULL, annee_hajj YEAR NOT NULL,
 agence_id INT NOT NULL, encadreur_id INT NULL, cree_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (agence_id) REFERENCES agences(id) ON DELETE CASCADE,
 FOREIGN KEY (encadreur_id) REFERENCES encadreurs(utilisateur_id) ON DELETE SET NULL
)`,
`CREATE TABLE IF NOT EXISTS groupe_membres (
 groupe_id INT NOT NULL, pelerin_id INT NOT NULL, ajoute_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY (groupe_id, pelerin_id),
 FOREIGN KEY (groupe_id) REFERENCES groupes_pelerins(id) ON DELETE CASCADE,
 FOREIGN KEY (pelerin_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
)`,
`CREATE TABLE IF NOT EXISTS messages_groupes (
 id INT AUTO_INCREMENT PRIMARY KEY, groupe_id INT NOT NULL, expediteur_id INT NOT NULL,
 contenu TEXT, media_url VARCHAR(500), media_nom VARCHAR(255), media_type VARCHAR(100), media_taille INT,
 cree_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (groupe_id) REFERENCES groupes_pelerins(id) ON DELETE CASCADE,
 FOREIGN KEY (expediteur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
 CHECK (contenu IS NOT NULL OR media_url IS NOT NULL)
)`];
(async()=>{try{for(const sql of tables){await pool.execute(sql);console.log('✅',sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)[1]);} for(const sql of compatibility){try{await pool.execute(sql)}catch(e){if(!/Duplicate column|already exists|doesn't exist/.test(e.message)) throw e;}} console.log('🎉 Migration terminée');}catch(e){console.error('❌ Migration:',e.message);process.exitCode=1;}finally{await pool.end();}})();
