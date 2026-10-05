/**
 * Contenus de démonstration : lieux (carte), actualités (réels) et un cours à lire.
 * Idempotent. Usage : npm run db:seed:content
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const { pool } = require('./config/database');

const PLACES = [
  ['Masjid al-Haram', 'HOLY_SITE', 21.4225, 39.8262, 'Makkah', 'La Mosquée sacrée et la Kaaba.'],
  ['Masjid an-Nabawi', 'HOLY_SITE', 24.4672, 39.6111, 'Médine', 'La Mosquée du Prophète ﷺ.'],
  ['Mina', 'HOLY_SITE', 21.4133, 39.8933, 'Mina', 'Campement des pèlerins pendant les jours du Hajj.'],
  ['Mont Arafat', 'HOLY_SITE', 21.3549, 39.9842, 'Arafat', 'Lieu de la station d’Arafat (9 Dhul Hijja).'],
  ['Muzdalifah', 'HOLY_SITE', 21.3833, 39.9333, 'Muzdalifah', 'Nuit de halte après Arafat.'],
  ['Aéroport international de Douala', 'AIRPORT', 4.0061, 9.7195, 'Douala, Cameroun', 'Départ de la plupart des groupes camerounais.'],
  ['Aéroport Roi Abdulaziz (Djeddah)', 'AIRPORT', 21.6796, 39.1565, 'Djeddah', 'Terminal Hajj.'],
  ['Aéroport Prince Mohammad (Médine)', 'AIRPORT', 24.5534, 39.7051, 'Médine', ''],
];

const NEWS = [
  ['Bienvenue dans la saison Hajj 2027', 'GUIDANCE', 'Les inscriptions sont ouvertes. Prépare tes documents : passeport, photo d’identité, certificats médical et de vaccination, preuve de paiement.'],
  ['Santé : les vaccins obligatoires', 'HEALTH', 'Le vaccin contre la méningite ACWY est exigé. Pense à demander ton certificat au moins 10 jours avant le départ.'],
  ['Voyage : arrivée à Djeddah', 'TRAVEL', 'À l’arrivée, reste avec ton groupe et garde ton QR Code à portée de main : ton guide le scannera pour le pointage.'],
  ['Rappel : bien s’hydrater', 'HEALTH', 'Sous la chaleur, bois régulièrement, protège-toi du soleil et repose-toi aux heures les plus chaudes.'],
  ['Les étapes du Hajj en bref', 'GUIDANCE', 'Ihram, Tawaf, Sa’i, Mina, Arafat, Muzdalifah, lapidation, sacrifice, Tawaf al-Ifada, Tawaf al-Wada’. Suis les cours de ton guide pour chaque étape.'],
];

const COURSE_CONTENT = `Introduction
Le Hajj est le cinquième pilier de l'Islam. Il s'accomplit une fois dans la vie par celui qui en a la capacité. Ce cours résume les grandes étapes pour t'aider à t'y préparer.

1. L'Ihram
L'Ihram est l'état de sacralisation dans lequel entre le pèlerin au Miqat. Il s'accompagne de l'intention (niyya) et de la talbiya : « Labbayka Allahumma labbayk ».

2. Le Tawaf et le Sa'i
À La Mecque, le pèlerin effectue sept tours autour de la Kaaba (Tawaf), puis sept parcours entre Safa et Marwa (Sa'i).

3. Mina, Arafat et Muzdalifah
Le 8 Dhul Hijja, les pèlerins se rendent à Mina. Le 9, c'est la station à Arafat, moment central du Hajj. La nuit se passe à Muzdalifah.

4. La lapidation, le sacrifice et la fin des rites
Le 10 Dhul Hijja, le pèlerin lapide la grande stèle, accomplit le sacrifice, se rase ou se coupe les cheveux, puis effectue le Tawaf al-Ifada.

Conclusion
Prépare-toi spirituellement et physiquement, reste avec ton groupe et suis les consignes de ton guide.`;

(async () => {
  try {
    for (const [nom, type, latitude, longitude, adresse, description] of PLACES) {
      const [exists] = await pool.execute('SELECT id FROM lieux WHERE agence_id IS NULL AND nom=?', [nom]);
      if (!exists.length) await pool.execute('INSERT INTO lieux (agence_id, nom, type, latitude, longitude, adresse, description) VALUES (NULL,?,?,?,?,?,?)', [nom, type, latitude, longitude, adresse, description]);
    }
    const [[admin]] = await pool.execute("SELECT id FROM utilisateurs WHERE role='admin' ORDER BY id LIMIT 1");
    if (!admin) { console.log('Aucun administrateur : lance d’abord npm run db:seed'); return; }

    const icon = path.resolve(__dirname, '../../mobile/assets/icon.png');
    const newsDir = path.resolve(__dirname, 'uploads/news');
    const courseDir = path.resolve(__dirname, 'uploads/courses');
    fs.mkdirSync(newsDir, { recursive: true }); fs.mkdirSync(courseDir, { recursive: true });

    let index = 0;
    for (const [titre, categorie, contenu] of NEWS) {
      const [exists] = await pool.execute('SELECT id FROM actualites WHERE titre=?', [titre]);
      index += 1;
      if (exists.length) continue;
      let mediaPath = null; let mediaType = 'NONE';
      if (index === 1 && fs.existsSync(icon)) { mediaPath = `demo-${index}.png`; mediaType = 'IMAGE'; fs.copyFileSync(icon, path.join(newsDir, mediaPath)); }
      await pool.execute('INSERT INTO actualites (auteur_id, agence_id, titre, contenu, categorie, media_type, media_path) VALUES (?,NULL,?,?,?,?,?)', [admin.id, titre, contenu, categorie, mediaType, mediaPath]);
    }

    const title = 'Les étapes du Hajj (cours à lire)';
    const [course] = await pool.execute('SELECT id FROM cours WHERE titre=?', [title]);
    if (!course.length) {
      let cover = null;
      if (fs.existsSync(icon)) { cover = 'demo-cours.png'; fs.copyFileSync(icon, path.join(courseDir, cover)); }
      await pool.execute(
        `INSERT INTO cours (agence_id, encadreur_id, groupe_id, titre, description, categorie, debut_le, duree_minutes, statut, nb_pages, contenu, cover_path)
         VALUES (NULL,?,NULL,?,?,?,DATE_ADD(UTC_TIMESTAMP(), INTERVAL 7 DAY),45,'PUBLISHED',4,?,?)`,
        [admin.id, title, 'Un résumé illustré des grandes étapes du Hajj, à lire ou à écouter.', 'RITUALS', COURSE_CONTENT, cover]);
    }
    for (const [nom, latitude, longitude, adresse] of require('./seedData/hotels')) {
      const [exists] = await pool.execute('SELECT id FROM lieux WHERE agence_id IS NULL AND nom=?', [nom]);
      if (!exists.length) await pool.execute("INSERT INTO lieux (agence_id, nom, type, latitude, longitude, adresse) VALUES (NULL,?,'HOTEL',?,?,?)", [nom, latitude, longitude, adresse]);
    }
    for (const [titre, categorie, contenu, mediaType, url] of require('./seedData/news')) {
      const [exists] = await pool.execute('SELECT id FROM actualites WHERE titre=?', [titre]);
      if (!exists.length) await pool.execute('INSERT INTO actualites (auteur_id, agence_id, titre, contenu, categorie, media_type, image_url) VALUES (?,NULL,?,?,?,?,?)', [admin.id, titre, contenu, categorie, mediaType, url]);
    }
    for (const [titre, categorie, description, duree, contenu] of require('./seedData/courses')) {
      const [exists] = await pool.execute('SELECT id FROM cours WHERE titre=?', [titre]);
      if (exists.length) continue;
      const cover = fs.existsSync(icon) ? 'demo-cours.png' : null;
      const pages = Math.max(1, contenu.split(/\n\s*\n/).length);
      await pool.execute(
        `INSERT INTO cours (agence_id, encadreur_id, groupe_id, titre, description, categorie, debut_le, duree_minutes, statut, nb_pages, contenu, cover_path)
         VALUES (NULL,?,NULL,?,?,?,DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? DAY),?,'PUBLISHED',?,?,?)`,
        [admin.id, titre, description, categorie, 3 + Math.floor(Math.random() * 20), duree, pages, contenu, cover]);
    }
    console.log('✅ Contenus de démonstration prêts (lieux, actualités, cours à lire).');
  } catch (error) {
    console.error('❌ Seed contenus :', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
