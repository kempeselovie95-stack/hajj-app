/**
 * Matrice des rôles : chaque utilisateur peut faire ce qui lui est dédié, et rien de plus.
 * Usage : npm run test:roles (MySQL local requis, base de démonstration seedée).
 */
const { spawn } = require('child_process');
const path = require('path');
const root = path.resolve(__dirname, '..');
const jwt = require(require.resolve('jsonwebtoken', { paths: [root] }));
const mysql = require(require.resolve('mysql2/promise', { paths: [root] }));

const PORT = 3112;
const BASE = `http://localhost:${PORT}/api`;
let pass = 0; let failCount = 0;
const ok = (cond, label, extra) => { if (cond) { pass++; console.log('  ✓', label); } else { failCount++; console.log('  ✗', label, extra ?? ''); } };

async function call(token, method, url, body) {
  const res = await fetch(BASE + url, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let json = null; try { json = await res.json(); } catch { /* vide */ }
  return { status: res.status, json };
}

(async () => {
  const db = await mysql.createConnection({ host: 'localhost', user: 'root', database: 'hajj_cameroun' });
  const cleanup = async () => {
    await db.query("DELETE FROM utilisateurs WHERE email LIKE 'roles-test-%@example.com'");
  };
  await cleanup();
  const [users] = await db.query("SELECT id, role FROM utilisateurs WHERE email IN ('admin@hajj-cm.com','agence@hajj-cm.com','encadreur@hajj-cm.com','pelerin@hajj-cm.com')");
  const by = Object.fromEntries(users.map((u) => [u.role, u]));
  const secret = process.env.JWT_SECRET || 'dev-only-change-me';
  const tok = (id) => jwt.sign({ id }, secret, { expiresIn: '1h' });
  const [[season]] = await db.query('SELECT s.id FROM saisons_hajj s JOIN forfaits f ON f.saison_id=s.id AND f.est_actif ORDER BY s.annee DESC LIMIT 1');
  const [[pack]] = await db.query('SELECT id FROM forfaits WHERE saison_id=? AND est_actif LIMIT 1', [season.id]);

  const server = spawn('node', ['src/Server.js'], { cwd: root, env: { ...process.env, PORT: String(PORT), NODE_ENV: 'development' }, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve) => { server.stdout.on('data', (d) => { if (String(d).includes('démarré')) resolve(); }); setTimeout(resolve, 8000); });
  const ADM = tok(by.admin.id); const AG = tok(by.agence.id); const GU = tok(by.encadreur.id); const PE = tok(by.pelerin.id);

  try {
    console.log('Sans authentification');
    for (const url of ['/operations/trips', '/agency/guides', '/pelerin/summary', '/paiements', '/admin/stats']) {
      ok((await call(null, 'GET', url)).status === 401, `${url} refusé sans jeton`);
    }

    console.log('Administrateur plateforme');
    ok((await call(ADM, 'GET', '/admin/stats')).status === 200, 'voit les statistiques globales');
    ok((await call(ADM, 'GET', '/admin/agencies')).status === 200, 'liste les organisations');
    ok((await call(ADM, 'GET', '/agency/guides')).status === 403, 'n’utilise pas l’espace agence');

    console.log('Agence : guides et pèlerins de SON organisation');
    let r = await call(AG, 'POST', '/agency/guides', { nom: 'Test', prenom: 'Guide', email: 'roles-test-guide@example.com', mot_de_passe: 'motdepasse1', agence_id: 99999 });
    ok(r.status === 201, 'crée un guide (agence_id client ignoré)', JSON.stringify(r.json));
    const guideId = r.json?.encadreur_id;
    const [[guideRow]] = await db.query('SELECT agence_id FROM encadreurs WHERE utilisateur_id=?', [guideId]);
    const [agencyRows] = await db.query('SELECT id FROM agences WHERE utilisateur_id=?', [by.agence.id]);
    ok(guideRow && agencyRows.some((a) => a.id === guideRow.agence_id), 'le guide est rattaché à l’agence du compte, pas à celle du client');
    r = await call(AG, 'GET', '/agency/guides');
    ok(r.status === 200 && r.json.encadreurs.some((g) => g.id === guideId), 'liste ses guides');
    r = await call(AG, 'POST', '/agency/pelerins', { nom: 'Test', prenom: 'Pelerin', email: 'roles-test-pelerin@example.com', mot_de_passe: 'motdepasse1', saison_id: season.id, forfait_id: pack.id });
    ok(r.status === 201, 'crée un pèlerin et son dossier', JSON.stringify(r.json));
    ok((await call(AG, 'POST', '/agency/pelerins', { nom: 'X', prenom: 'Y', email: 'invalide', mot_de_passe: 'court', saison_id: season.id, forfait_id: pack.id })).status === 400, 'rejette un pèlerin invalide');
    ok((await call(GU, 'POST', '/agency/guides', { nom: 'a', prenom: 'b', email: 'roles-test-x@example.com', mot_de_passe: 'motdepasse1' })).status === 403, 'le guide ne crée pas de guide');
    ok((await call(PE, 'POST', '/agency/pelerins', {})).status === 403, 'le pèlerin ne crée pas de pèlerin');

    // Autre agence : ne peut pas supprimer le guide créé
    const [ins] = await db.query("INSERT INTO utilisateurs (nom,prenom,email,telephone,mot_de_passe,role) VALUES ('Other','Agency','roles-test-agency@example.com','000','x','agence')");
    await db.query("INSERT INTO agences (utilisateur_id, nom_agence) VALUES (?, 'TEST roles agence')", [ins.insertId]);
    const OTHER = tok(ins.insertId);
    ok((await call(OTHER, 'DELETE', `/agency/guides/${guideId}`)).status === 404, 'une autre agence ne supprime pas ce guide');
    ok((await call(OTHER, 'GET', '/agency/guides')).json.encadreurs.length === 0, 'une autre agence ne voit pas ce guide');

    console.log('Pèlerin : son dossier uniquement');
    const [[newPilgrim]] = await db.query("SELECT id FROM utilisateurs WHERE email='roles-test-pelerin@example.com'");
    const NP = tok(newPilgrim.id);
    r = await call(NP, 'GET', '/pelerin/summary');
    ok(r.status === 200 && r.json.dossier?.statut === 'brouillon' && r.json.solde.total >= 0, 'consulte son dossier et son solde', JSON.stringify(r.json).slice(0, 200));
    const dossierId = r.json.dossier.id;
    r = await call(NP, 'PATCH', `/dossiers/${dossierId}/statut`, { statut: 'soumis' });
    ok(r.status === 422 && r.json.code === 'DOCUMENTS_MISSING', 'ne peut pas soumettre sans les pièces obligatoires', JSON.stringify(r.json));
    ok((await call(NP, 'PATCH', `/dossiers/${dossierId}/statut`, { statut: 'valide' })).status === 403, 'ne peut pas se valider lui-même');
    ok((await call(PE, 'PATCH', `/dossiers/${dossierId}/statut`, { statut: 'soumis' })).status === 403, 'ne touche pas au dossier d’un autre pèlerin');
    for (const type of ['passeport', 'photo_identite', 'certificat_medical', 'certificat_vaccination', 'preuve_paiement']) {
      await db.query("INSERT INTO documents (dossier_id,type_document,nom_fichier,chemin_fichier,statut) VALUES (?,?,?,?,'PENDING')", [dossierId, type, `${type}.pdf`, `/x/${type}.pdf`]);
    }
    ok((await call(NP, 'PATCH', `/dossiers/${dossierId}/statut`, { statut: 'soumis' })).status === 200, 'soumet son dossier une fois complet');
    ok((await call(NP, 'GET', '/paiements')).status === 403, 'n’accède pas aux paiements de l’agence');
    ok((await call(NP, 'GET', '/operations/trips')).status === 403, 'n’accède pas à la gestion des voyages');
    ok((await call(NP, 'GET', '/documents')).status === 403, 'ne revoit pas les documents');
    ok((await call(NP, 'GET', '/operations/me/trip')).status === 200, 'consulte son voyage');

    console.log('Guide : ses groupes uniquement');
    ok((await call(GU, 'GET', '/groups')).status === 200, 'liste ses groupes');
    ok((await call(GU, 'GET', '/paiements')).status === 403, 'pas d’accès aux paiements');
    ok((await call(GU, 'GET', '/documents')).status === 403, 'pas de revue de documents');
    ok((await call(GU, 'POST', '/groups', { nom: 'X', annee_hajj: 2027 })).status === 403, 'ne crée pas de groupe');
    ok((await call(GU, 'GET', '/admin/stats')).status === 403, 'pas d’accès admin');
    ok((await call(GU, 'GET', '/operations/qr/me')).status === 403, 'pas de QR pèlerin');

    console.log('Agence : valide, encaisse, organise');
    ok((await call(AG, 'GET', '/paiements')).status === 200, 'consulte les paiements');
    ok((await call(AG, 'GET', '/documents')).status === 200, 'revoit les documents');
    ok((await call(AG, 'GET', '/admin/agencies')).status === 403, 'ne gère pas les organisations de la plateforme');
    ok((await call(OTHER, 'PATCH', `/dossiers/${dossierId}/statut`, { statut: 'en_verification' })).status === 403, 'une autre agence ne traite pas ce dossier');
    ok((await call(AG, 'PATCH', `/dossiers/${dossierId}/statut`, { statut: 'en_verification' })).status === 200, 'traite le dossier de son pèlerin', 'vérifie que le pèlerin appartient à l’agence du compte');
  } finally {
    await cleanup();
    await db.query("DELETE FROM agences WHERE nom_agence='TEST roles agence'");
    server.kill();
    await db.end();
  }
  console.log(`\n${pass} OK, ${failCount} échec(s)`);
  process.exit(failCount ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
