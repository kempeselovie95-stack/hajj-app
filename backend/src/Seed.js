/**
 * Script de seed — insère des données de test
 * Exécuter : npm run db:seed
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { pool } = require('./config/database');

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

    const [encadreurUser] = await pool.execute(
      `INSERT IGNORE INTO utilisateurs (nom, prenom, email, telephone, mot_de_passe, role)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['Nana', 'Aïcha', 'encadreur@hajj-cm.com', '+237677111111', await hash('Encadreur123!'), 'encadreur']
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
      const [seedAgency] = await pool.execute(`SELECT id FROM agences WHERE utilisateur_id = ? LIMIT 1`, [agenceRow[0].id]);
      const [seedEncadreurUser] = await pool.execute(`SELECT id FROM utilisateurs WHERE email = 'encadreur@hajj-cm.com' LIMIT 1`);
      if (seedEncadreurUser.length && seedAgency.length) {
        await pool.execute(
          `INSERT IGNORE INTO encadreurs (utilisateur_id, agence_id) VALUES (?, ?)`,
          [seedEncadreurUser[0].id, seedAgency[0].id]
        );
      }
    }

    // ── Dossier pèlerin test ──────────────────────────────────────────────────
    const [pelerinRow] = await pool.execute(
      `SELECT id FROM utilisateurs WHERE email = 'pelerin@hajj-cm.com' LIMIT 1`
    );
    if (pelerinRow.length) {
      await pool.execute(
        `INSERT IGNORE INTO dossiers (pelerin_id, numero_dossier, annee_hajj, statut, type_package)
         VALUES (?, ?, ?, ?, ?)`,
        [pelerinRow[0].id, 'DOS-2026-0001', 2026, 'en_verification', 'standard']
      );
      console.log('  ✅ Dossier test inséré');
      const [seedAgencyUser] = await pool.execute(`SELECT id FROM utilisateurs WHERE email = 'agence@hajj-cm.com' LIMIT 1`);
      const [seedAgency] = await pool.execute(`SELECT id FROM agences WHERE utilisateur_id = ? LIMIT 1`, [seedAgencyUser[0]?.id]);
      const [encadreurRow] = await pool.execute(`SELECT utilisateur_id FROM encadreurs WHERE agence_id = ? LIMIT 1`, [seedAgency[0]?.id]);
      if (encadreurRow.length) {
        const [groupResult] = await pool.execute(
          `INSERT IGNORE INTO groupes_pelerins (nom, annee_hajj, agence_id, encadreur_id) VALUES (?, ?, ?, ?)`,
          ['Groupe Yaoundé Centre', 2026, seedAgency[0].id, encadreurRow[0].utilisateur_id]
        );
        if (groupResult.insertId) await pool.execute(`INSERT IGNORE INTO groupe_membres (groupe_id, pelerin_id) VALUES (?, ?)`, [groupResult.insertId, pelerinRow[0].id]);
      }
    }

    console.log('\n🎉 Seed terminé');
    console.log('\n📋 Comptes de test :');
    console.log('   Admin   → admin@hajj-cm.com   / Admin123!');
    console.log('   Agence  → agence@hajj-cm.com  / Agence123!');
    console.log('   Encadreur → encadreur@hajj-cm.com / Encadreur123!');
    console.log('   Pèlerin → pelerin@hajj-cm.com / Pelerin123!');
  } catch (error) {
    console.error('❌ Erreur seed :', error.message);
  } finally {
    await pool.end();
  }
};

seed();