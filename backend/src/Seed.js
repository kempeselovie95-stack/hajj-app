/**
 * Script de seed — insère des données de test
 * Exécuter : npm run db:seed
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
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

    const [season] = await pool.execute(
      `INSERT IGNORE INTO saisons_hajj (libelle, annee, date_debut, date_fin, description, est_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['Hajj 2027', 2027, '2027-04-01', '2027-08-31', 'Saison Hajj Cameroun 2027', true]
    );
    const [saisonRow] = await pool.execute(`SELECT id FROM saisons_hajj WHERE annee = 2027 LIMIT 1`);
    if (saisonRow.length) {
      await pool.execute(
        `INSERT IGNORE INTO forfaits (saison_id, nom, description, prix, devise, inclus, est_actif)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [saisonRow[0].id, 'Standard', 'Forfait standard Hajj 2027', 2500000, 'XAF', 'Transport, hébergement, accompagnement', true]
      );
      await pool.execute(
        `INSERT IGNORE INTO forfaits (saison_id, nom, description, prix, devise, inclus, est_actif)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [saisonRow[0].id, 'Premium', 'Forfait premium Hajj 2027', 4200000, 'XAF', 'Transport, hébergement, accompagnement premium', true]
      );
      console.log('  ✅ Saison Hajj 2027 et forfaits insérés');
    }

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
      await pool.execute(
        `UPDATE agences SET legal_name=COALESCE(legal_name,nom_agence),country=COALESCE(country,'Cameroun'),
         city=COALESCE(city,'Yaoundé'),phone=COALESCE(phone,'+237699000000'),email=COALESCE(email,'agence@hajj-cm.com'),
         status=COALESCE(status,'ACTIVE'),subscription_plan=COALESCE(subscription_plan,'PRO'),
         subscription_status=COALESCE(subscription_status,'ACTIVE') WHERE id=?`,
        [seedAgency[0]?.id]
      );
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

    const demoPilgrimNames = [
      ['Abena', 'Mireille'], ['Adamou', 'Salif'], ['Biloa', 'Carine'], ['Djoumessi', 'Patrick'], ['Ewane', 'Nadine'],
      ['Fofana', 'Mamadou'], ['Garga', 'Aïssatou'], ['Hamadou', 'Youssouf'], ['Issa', 'Clarisse'], ['Kamga', 'Serge'],
      ['Kouam', 'Nadia'], ['Mahamat', 'Ousmane'], ['Nana', 'Alice'], ['Oumarou', 'Fatima'], ['Tchoumi', 'Boris'],
    ];
    const demoPassword = await hash('HajjDemo123!');
    const demoEmails = [];
    for (const [index, [nom, prenom]] of demoPilgrimNames.entries()) {
      const suffix = String(index + 1).padStart(2, '0');
      const email = `demo.pelerin.${suffix}@hajj-cm.com`;
      demoEmails.push(email);
      await pool.execute(
        `INSERT IGNORE INTO utilisateurs (nom,prenom,email,telephone,mot_de_passe,role)
         VALUES (?,?,?,?,?,'pelerin')`,
        [nom, prenom, email, `+237670000${String(index + 1).padStart(3, '0')}`, demoPassword]
      );
    }

    const [demoPilgrims] = await pool.execute(
      `SELECT id,email FROM utilisateurs WHERE email IN (${demoEmails.map(() => '?').join(',')}) ORDER BY email`,
      demoEmails
    );
    const [demoGuides] = await pool.execute(
      `SELECT e.utilisateur_id,e.agence_id FROM encadreurs e JOIN utilisateurs u ON u.id=e.utilisateur_id
       WHERE u.est_actif=TRUE ORDER BY e.utilisateur_id`
    );
    const [demoPackages] = await pool.execute(
      `SELECT f.id,f.saison_id,s.annee FROM forfaits f JOIN saisons_hajj s ON s.id=f.saison_id
       WHERE s.annee=2027 AND f.est_actif=TRUE ORDER BY f.id`
    );
    if (demoGuides.length) {
      const demoGroups = [];
      for (const guide of demoGuides) {
        const [existingGroup] = await pool.execute(
          `SELECT id FROM groupes_pelerins WHERE encadreur_id=? AND agence_id=? AND annee_hajj=2027 LIMIT 1`,
          [guide.utilisateur_id, guide.agence_id]
        );
        const groupId = existingGroup[0]?.id || (await pool.execute(
          `INSERT INTO groupes_pelerins (nom,annee_hajj,agence_id,encadreur_id) VALUES (?,?,?,?)`,
          [`Groupe Hajj 2027 · Guide ${guide.utilisateur_id}`, 2027, guide.agence_id, guide.utilisateur_id]
        ))[0].insertId;
        demoGroups.push({ id: groupId, agence_id: guide.agence_id });
      }

      for (const [index, pilgrim] of demoPilgrims.entries()) {
        const group = index < demoGroups.length ? demoGroups[index] : demoGroups[Math.floor(Math.random() * demoGroups.length)];
        const matchingPackage = demoPackages[Math.floor(Math.random() * demoPackages.length)];
        const [existingDossier] = await pool.execute('SELECT id FROM dossiers WHERE pelerin_id=? AND annee_hajj=2027 LIMIT 1', [pilgrim.id]);
        if (!existingDossier.length) {
          await pool.execute(
            `INSERT INTO dossiers (pelerin_id,agence_id,numero_dossier,annee_hajj,statut,type_package,saison_id,forfait_id)
             VALUES (?,?,?,?,?,?,?,?)`,
            [pilgrim.id, group.agence_id, `DOS-2027-DEMO-${pilgrim.id}`, 2027, 'soumis', 'standard', matchingPackage?.saison_id || null, matchingPackage?.id || null]
          );
        }
        const [membership] = await pool.execute(
          `SELECT gm.groupe_id FROM groupe_membres gm JOIN groupes_pelerins g ON g.id=gm.groupe_id
           WHERE gm.pelerin_id=? AND g.annee_hajj=2027 LIMIT 1`,
          [pilgrim.id]
        );
        if (!membership.length) {
          await pool.execute('INSERT IGNORE INTO groupe_membres (groupe_id,pelerin_id) VALUES (?,?)', [group.id, pilgrim.id]);
        }
      }
      console.log(`  ✅ ${demoPilgrims.length} pèlerins de démonstration répartis entre ${demoGroups.length} guide(s)`);
    }

    const [adminRows] = await pool.execute(`SELECT id FROM utilisateurs WHERE email='admin@hajj-cm.com' LIMIT 1`);
    const [demoDossiers] = await pool.execute(
      `SELECT d.id,d.numero_dossier,d.pelerin_id,d.forfait_id,d.saison_id,d.agence_id,
        p.prenom,p.nom,p.email AS pelerin_email,f.prix,f.devise
       FROM dossiers d JOIN utilisateurs p ON p.id=d.pelerin_id
       LEFT JOIN forfaits f ON f.id=d.forfait_id
       WHERE p.email IN (${demoEmails.map(() => '?').join(',')}) AND d.annee_hajj=2027
       ORDER BY p.email`,
      demoEmails
    );

    const demoUploadDirectory = path.resolve(__dirname, '../uploads');
    fs.mkdirSync(demoUploadDirectory, { recursive: true });
    const documentTypes = ['passeport', 'photo_identite', 'certificat_medical', 'visa'];
    for (const [index, dossier] of demoDossiers.entries()) {
      for (const type of documentTypes) {
        const filename = `DEMO-${dossier.id}-${type}.txt`;
        const filePath = path.join(demoUploadDirectory, filename);
        if (!fs.existsSync(filePath)) {
          fs.writeFileSync(filePath, `MYHAJJ237 - DOCUMENT DE DEMONSTRATION\nDossier: ${dossier.numero_dossier}\nType: ${type}\nSans valeur administrative. Ne pas utiliser pour un vrai pèlerinage.\n`, 'utf8');
        }
        const expired = type === 'passeport' && index === 1;
        const status = expired
          ? 'APPROVED'
          : type === 'passeport' && index % 5 === 0
            ? 'REJECTED'
            : type === 'photo_identite' && index % 2 === 0
              ? 'APPROVED'
              : type === 'certificat_medical' && index % 3 === 0
                ? 'UNDER_REVIEW'
                : 'PENDING';
        const valid = status === 'APPROVED' ? 1 : status === 'REJECTED' ? 0 : null;
        await pool.execute(
          `INSERT IGNORE INTO documents
           (dossier_id,type_document,nom_fichier,chemin_fichier,taille_octets,est_valide,statut,motif_rejet,expiration_date,valide_par,valide_le)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
          [dossier.id, type, filename, filePath, fs.statSync(filePath).size, valid, status,
            status === 'REJECTED' ? 'DEMO: fichier de démonstration à remplacer.' : null,
            expired ? '2026-06-30' : type === 'passeport' ? '2027-12-31' : null,
            valid !== null ? adminRows[0]?.id || null : null,
            valid !== null ? new Date() : null]
        );
        if (expired) {
          await pool.execute(
            `UPDATE documents SET est_valide=TRUE,statut='APPROVED',expiration_date='2026-06-30',
             valide_par=?,valide_le=COALESCE(valide_le,CURRENT_TIMESTAMP)
             WHERE dossier_id=? AND type_document=? AND nom_fichier=?`,
            [adminRows[0]?.id || null, dossier.id, type, filename]
          );
        }
      }

      if (dossier.forfait_id) {
        const paymentReference = `DEMO-PAY-${dossier.id}`;
        const [existingPayment] = await pool.execute('SELECT id FROM paiements WHERE reference=? LIMIT 1', [paymentReference]);
        if (!existingPayment.length) {
          const amount = index % 3 === 0 ? 250000 : index % 3 === 1 ? 500000 : 175000;
          const status = index % 3 === 1 ? 'valide' : index % 3 === 2 ? 'en_attente' : 'rejete';
          await pool.execute(
            `INSERT INTO paiements (dossier_id,forfait_id,montant,devise,statut,moyen_paiement,reference,commentaire,confirme_le)
             VALUES (?,?,?,?,?,?,?,?,?)`,
            [dossier.id, dossier.forfait_id, amount, dossier.devise || 'XAF', status,
              index % 2 ? 'mobile_money' : 'virement', paymentReference,
              'DEMO: transaction fictive, sans valeur comptable.', status === 'valide' ? new Date() : null]
          );
        }
      }
    }

    const [demoChatGroups] = await pool.execute(
      `SELECT g.id,g.encadreur_id FROM groupes_pelerins g
       WHERE g.annee_hajj=2027 AND g.nom LIKE 'Groupe Hajj 2027 · Guide %' ORDER BY g.id`
    );
    const demoChatDirectory = path.resolve(__dirname, 'uploads/chat');
    fs.mkdirSync(demoChatDirectory, { recursive: true });
    for (const group of demoChatGroups) {
      const [sampleMembers] = await pool.execute(
        `SELECT gm.pelerin_id FROM groupe_membres gm JOIN utilisateurs u ON u.id=gm.pelerin_id
         WHERE gm.groupe_id=? AND u.email LIKE 'demo.pelerin.%@hajj-cm.com' ORDER BY gm.pelerin_id LIMIT 1`,
        [group.id]
      );
      if (!sampleMembers.length) continue;
      const [existingMessages] = await pool.execute("SELECT id FROM messages_groupes WHERE groupe_id=? AND contenu LIKE 'DEMO:%' LIMIT 1", [group.id]);
      if (existingMessages.length) continue;
      const mediaName = `DEMO-chat-groupe-${group.id}.txt`;
      const mediaPath = path.join(demoChatDirectory, mediaName);
      if (!fs.existsSync(mediaPath)) fs.writeFileSync(mediaPath, 'MYHAJJ237 - PIECE JOINTE DE DEMONSTRATION\nFichier fictif pour tester le chat.\n', 'utf8');
      await pool.execute('INSERT INTO messages_groupes (groupe_id,expediteur_id,contenu) VALUES (?,?,?)', [group.id, group.encadreur_id, 'DEMO: Bienvenue dans le groupe Hajj 2027. Les informations importantes seront partagées ici.']);
      await pool.execute('INSERT INTO messages_groupes (groupe_id,expediteur_id,contenu) VALUES (?,?,?)', [group.id, sampleMembers[0].pelerin_id, 'DEMO: Bonjour guide, nous avons bien reçu les premières informations.']);
      await pool.execute(
        'INSERT INTO messages_groupes (groupe_id,expediteur_id,contenu,media_url,media_nom,media_type,media_taille) VALUES (?,?,?,?,?,?,?)',
        [group.id, group.encadreur_id, 'DEMO: Voici le document d’information du groupe.', `/uploads/chat/${mediaName}`, mediaName, 'text/plain', fs.statSync(mediaPath).size]
      );
    }

    const demoRecipients = [adminRows[0]?.id, agenceRow[0]?.id, ...demoGuides.map((guide) => guide.utilisateur_id), ...demoPilgrims.map((pilgrim) => pilgrim.id)].filter(Boolean);
    for (const recipientId of demoRecipients) {
      const [existingNotice] = await pool.execute("SELECT id FROM notifications WHERE destinataire_id=? AND corps LIKE 'DEMO:%' LIMIT 1", [recipientId]);
      if (!existingNotice.length) {
        await pool.execute(
          `INSERT INTO notifications (destinataire_id,titre,corps,type)
           VALUES (?,?,?,'info')`,
          [recipientId, 'Données de démonstration', 'DEMO: notification fictive pour tester la cloche et la boîte de réception.']
        );
      }
    }
    console.log(`  ✅ ${demoDossiers.length} dossiers enrichis avec documents et paiements de démonstration`);
    console.log(`  ✅ ${demoChatGroups.length} groupe(s) doté(s) d’un échange texte et d’une pièce jointe`);

    console.log('\n🎉 Seed terminé');
    console.log('\n📋 Comptes de test :');
    console.log('   Admin   → admin@hajj-cm.com   / Admin123!');
    console.log('   Agence  → agence@hajj-cm.com  / Agence123!');
    console.log('   Encadreur → encadreur@hajj-cm.com / Encadreur123!');
    console.log('   Pèlerins démo → demo.pelerin.01@hajj-cm.com à demo.pelerin.15@hajj-cm.com / HajjDemo123!');
    console.log('   Pèlerin → pelerin@hajj-cm.com / Pelerin123!');
  } catch (error) {
    console.error('❌ Erreur seed :', error.message);
  } finally {
    await pool.end();
  }
};

seed();