/**
 * Script de seed — insère des données de test
 * Exécuter : npm run db:seed
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

const seed = async () => {
  console.log('🌱 Insertion des données de test...\n');
  try {
    const hash = (password) => bcrypt.hash(password, 12);

    // ── Comptes utilisateurs ──────────────────────────────────────────────────
    const [admin] = await pool.execute(
      `INSERT IGNORE INTO utilisateurs (nom, prenom, email, mot_de_passe, role)
       VALUES (?, ?, ?, ?, ?)`,
      ['Administrateur', 'Système', 'admin@hajj-cm.com', await hash('Admin123!'), 'admin']
    );

    const [agenceUser] = await pool.execute(
      `INSERT IGNORE INTO utilisateurs (nom, prenom, email, telephone, mot_de_passe, role)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['Moussa', 'Bello', 'agence@hajj-cm.com', '+237699000000', await hash('Agence123!'), 'agence']
    );

    const [pelerin] = await pool.execute(
      `INSERT IGNORE INTO utilisateurs (nom, prenom, email, telephone, mot_de_passe, role)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['Ibrahim', 'Aliou', 'pelerin@hajj-cm.com', '+237677000000', await hash('Pelerin123!'), 'pelerin']
    );

    console.log('  ✅ Utilisateurs insérés');

    // ── Agence ───────────────────────────────────────────────────────────────
    const [agenceRow] = await pool.execute(
      `SELECT id FROM utilisateurs WHERE email = 'agence@hajj-cm.com' LIMIT 1`
    );
    if (agenceRow.length) {
      await pool.execute(
        `INSERT IGNORE INTO agences (utilisateur_id, nom_agence, numero_agrement, adresse)
         VALUES (?, ?, ?, ?)`,
        [agenceRow[0].id, 'Agence Al-Barakah Voyages', 'AGR-2024-001', 'Yaoundé, Bastos']
      );
      console.log('  ✅ Agence insérée');
    }

    // ── Dossier pèlerin test ──────────────────────────────────────────────────
    const [pelerinRow] = await pool.execute(
      `SELECT id FROM utilisateurs WHERE email = 'pelerin@hajj-cm.com' LIMIT 1`
    );
    if (pelerinRow.length) {
      await pool.execute(
        `INSERT IGNORE INTO dossiers (pelerin_id, numero_dossier, annee_hajj, statut, type_package)
         VALUES (?, ?, ?, ?, ?)`,
        [pelerinRow[0].id, 'DOS-2024-0001', 2024, 'en_cours', 'standard']
      );
      console.log('  ✅ Dossier test inséré');
    }

    console.log('\n🎉 Seed terminé');
    console.log('\n📋 Comptes de test :');
    console.log('   Admin   → admin@hajj-cm.com   / Admin123!');
    console.log('   Agence  → agence@hajj-cm.com  / Agence123!');
    console.log('   Pèlerin → pelerin@hajj-cm.com / Pelerin123!');
  } catch (error) {
    console.error('❌ Erreur seed :', error.message);
  } finally {
    await pool.end();
  }
};

seed();