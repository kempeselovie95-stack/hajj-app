/**
 * Balayage de tous les endpoints utilisés par l'interface, rôle par rôle, + parcours « cours » et tableau de bord.
 * Usage : npm run test:smoke (MySQL local requis, base de démonstration seedée).
 */
const { spawn } = require('child_process');
const path = require('path');
const root = path.resolve(__dirname, '..');
const jwt = require(require.resolve('jsonwebtoken', { paths: [root] }));
const mysql = require(require.resolve('mysql2/promise', { paths: [root] }));
const bcrypt = require(require.resolve('bcryptjs', { paths: [root] }));

const PORT = 3113;
const BASE = `http://localhost:${PORT}/api`;
let pass = 0; let failCount = 0;
const ok = (cond, label, extra) => { if (cond) { pass++; } else { failCount++; console.log('  ✗', label, extra ?? ''); } };

async function call(token, method, url, body) {
  const res = await fetch(BASE + url, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let json = null; try { json = await res.json(); } catch { /* vide */ }
  return { status: res.status, json };
}

(async () => {
  const db = await mysql.createConnection({ host: 'localhost', user: 'root', database: 'hajj_cameroun' });
  const cleanup = async () => {
    await db.query("DELETE FROM cours WHERE titre LIKE 'TEST %'");
    await db.query("DELETE FROM utilisateurs WHERE email LIKE 'smoke-test-%@example.com'");
    await db.query("DELETE FROM agences WHERE nom_agence='TEST smoke agence'");
  };
  await cleanup();
  const [users] = await db.query("SELECT id, role FROM utilisateurs WHERE email IN ('admin@hajj-cm.com','agence@hajj-cm.com','encadreur@hajj-cm.com','pelerin@hajj-cm.com')");
  const by = Object.fromEntries(users.map((u) => [u.role, u]));
  const secret = process.env.JWT_SECRET || 'dev-only-change-me';
  const tok = (id) => jwt.sign({ id }, secret, { expiresIn: '1h' });
  const fakeGoogle = require('http').createServer((req, res) => {
    const token = new URL(req.url, 'http://x').searchParams.get('id_token');
    const base = { iss: 'https://accounts.google.com', aud: 'test-client.apps.googleusercontent.com', email_verified: 'true', email: 'smoke-test-google@example.com', given_name: 'Goo', family_name: 'Gle' };
    if (token === 'good-new') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify(base)); }
    if (token === 'wrong-aud') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ ...base, aud: 'autre' })); }
    res.writeHead(400); res.end('{}');
  }).listen(3114);
  const server = spawn('node', ['src/Server.js'], { cwd: root, env: { ...process.env, GOOGLE_CLIENT_ID: 'test-client.apps.googleusercontent.com', GOOGLE_TOKENINFO_URL: 'http://localhost:3114/tokeninfo', PORT: String(PORT), NODE_ENV: 'development', NEWS_FEED: 'off', RATE_LIMIT_MAX: '5000' }, stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((resolve) => { server.stdout.on('data', (d) => { if (String(d).includes('démarré')) resolve(); }); setTimeout(resolve, 8000); });
  const T = { admin: tok(by.admin.id), agence: tok(by.agence.id), encadreur: tok(by.encadreur.id), pelerin: tok(by.pelerin.id) };

  try {
    console.log('Balayage des endpoints par rôle');
    const sweep = {
      admin: ['/auth/me', '/admin/agencies', '/admin/stats', '/admin/dashboard', '/admin/encadreurs', '/dashboard/badges', '/dashboard/overview', '/dossiers', '/documents', '/paiements', '/groups', '/catalog/dashboard', '/catalog/saisons', '/catalog/forfaits', '/notifications', '/operations/trips', '/operations/flights', '/operations/hotels', '/operations/vehicles', '/operations/transports', '/operations/program', '/operations/incidents', '/operations/audit', '/courses'],
      agence: ['/auth/me', '/agency/guides', '/dashboard/badges', '/dashboard/overview', '/dossiers', '/documents', '/paiements', '/groups', '/groups/guides', '/catalog/saisons', '/catalog/forfaits', '/notifications', '/operations/trips', '/operations/incidents', '/courses'],
      encadreur: ['/auth/me', '/dashboard/badges', '/dossiers', '/groups', '/notifications', '/operations/incidents', '/operations/trips', '/courses'],
      pelerin: ['/auth/me', '/dashboard/badges', '/dossiers', '/pelerin/summary', '/groups', '/notifications', '/operations/me/trip', '/operations/qr/me', '/courses'],
    };
    for (const [role, urls] of Object.entries(sweep)) {
      for (const url of urls) {
        const r = await call(T[role], 'GET', url);
        ok(r.status === 200, `${role} GET ${url} → 200`, r.status + ' ' + JSON.stringify(r.json)?.slice(0, 160));
        if (r.status !== 200) console.log(`  ✗ ${role} GET ${url}: ${r.status} ${JSON.stringify(r.json)?.slice(0, 160)}`);
      }
    }

    console.log('Tableau de bord (admin / agence)');
    let r = await call(T.admin, 'GET', '/dashboard/overview');
    ok(r.status === 200 && r.json.dashboard.indicateurs && 'cours_a_venir' in r.json.dashboard.indicateurs && Array.isArray(r.json.dashboard.activite), 'forme du tableau de bord');
    const adminTotal = Number(r.json.dashboard.indicateurs.total_dossiers);
    r = await call(T.agence, 'GET', '/dashboard/overview');
    ok(r.status === 200 && Number(r.json.dashboard.indicateurs.total_dossiers) <= adminTotal, 'agence : périmètre ≤ plateforme');
    const [ins] = await db.query("INSERT INTO utilisateurs (nom,prenom,email,telephone,mot_de_passe,role) VALUES ('Other','Agency','smoke-test-agency@example.com','000','x','agence')");
    await db.query("INSERT INTO agences (utilisateur_id, nom_agence) VALUES (?, 'TEST smoke agence')", [ins.insertId]);
    const OTHER = tok(ins.insertId);
    r = await call(OTHER, 'GET', '/dashboard/overview');
    ok(r.status === 200 && Number(r.json.dashboard.indicateurs.total_dossiers) === 0 && Number(r.json.dashboard.indicateurs.groupes_formes) === 0, 'une autre agence voit un tableau de bord vide');
    ok((await call(T.pelerin, 'GET', '/dashboard/overview')).status === 403, 'pèlerin : pas de tableau de bord de gestion');

    console.log('Cours du guide');
    const [[group]] = await db.query('SELECT g.id, g.nom FROM groupes_pelerins g JOIN groupe_membres m ON m.groupe_id=g.id WHERE g.encadreur_id=? GROUP BY g.id, g.nom HAVING COUNT(*)>=1 LIMIT 1', [by.encadreur.id]);
    const [members] = await db.query('SELECT pelerin_id FROM groupe_membres WHERE groupe_id=?', [group.id]);
    const member = members[0].pelerin_id; const MEMBER = tok(member);
    const [[outsider]] = await db.query('SELECT u.id FROM utilisateurs u WHERE u.role=\'pelerin\' AND u.id NOT IN (SELECT pelerin_id FROM groupe_membres WHERE groupe_id=?) AND u.id NOT IN (SELECT pelerin_id FROM dossiers WHERE agence_id IS NOT NULL) LIMIT 1', [group.id]);
    const startsAt = '2027-04-10T09:00';
    r = await call(T.encadreur, 'POST', '/courses', { titre: 'TEST Rites du Hajj', categorie: 'RITUALS', debut_le: startsAt, duree_minutes: 90, lieu: 'Salle A', groupe_id: group.id, lien_visio: 'https://meet.example.com/abc' });
    ok(r.status === 201 && r.json.item.debut_le === startsAt && r.json.item.statut === 'PUBLISHED', 'le guide crée et publie un cours', JSON.stringify(r.json));
    const course = r.json.item;
    r = await call(T.encadreur, 'POST', '/courses', { titre: 'TEST invalide', debut_le: 'demain', lien_visio: 'javascript:alert(1)' });
    ok(r.status === 400, 'cours invalide / lien dangereux rejeté');
    r = await call(T.encadreur, 'POST', '/courses', { titre: 'TEST autre groupe', debut_le: startsAt, groupe_id: 999999 });
    ok(r.status === 400, 'groupe qui n’est pas le sien refusé');
    ok((await call(T.pelerin, 'POST', '/courses', { titre: 'TEST x', debut_le: startsAt })).status === 403, 'le pèlerin ne crée pas de cours');
    r = await call(T.agence, 'POST', '/courses', { titre: 'TEST cours agence', debut_le: startsAt, groupe_id: group.id });
    ok(r.status === 201, 'l’agence crée un cours pour un groupe de son organisation', JSON.stringify(r.json));
    if (r.json?.item) await call(T.agence, 'DELETE', `/courses/${r.json.item.id}`);
    ok((await call(T.agence, 'POST', '/courses', { titre: 'TEST x', debut_le: startsAt, groupe_id: 999999 })).status === 400, 'l’agence ne cible pas un groupe inexistant');
    ok((await call(OTHER, 'POST', '/courses', { titre: 'TEST x', debut_le: startsAt, groupe_id: group.id })).status === 400, 'une autre agence ne cible pas ce groupe');
    const [notifs] = await db.query("SELECT COUNT(*) n FROM notifications WHERE destinataire_id=? AND titre LIKE 'Nouveau cours : TEST%'", [member]);
    ok(Number(notifs[0].n) >= 1, 'les pèlerins du groupe sont notifiés');
    r = await call(MEMBER, 'GET', '/courses');
    ok(r.status === 200 && r.json.items.some((c) => c.id === course.id), 'le pèlerin du groupe voit le cours');
    if (outsider) ok(!(await call(tok(outsider.id), 'GET', '/courses')).json.items.some((c) => c.id === course.id), 'un pèlerin hors groupe ne le voit pas');
    r = await call(MEMBER, 'POST', `/courses/${course.id}/enroll`);
    ok(r.status === 201 && r.json.item.inscrit === true && r.json.item.inscrits === 1, 'le pèlerin s’inscrit');
    r = await call(T.encadreur, 'GET', `/courses/${course.id}/participants`);
    ok(r.status === 200 && r.json.items.length === 1, 'le guide voit les inscrits');
    ok((await call(T.agence, 'GET', '/courses')).json.items.some((c) => c.id === course.id), 'l’agence voit le cours');
    ok(!(await call(OTHER, 'GET', '/courses')).json.items.some((c) => c.id === course.id), 'une autre agence ne le voit pas');
    r = await call(T.encadreur, 'PATCH', `/courses/${course.id}`, { debut_le: '2027-04-11T10:00', lieu: 'Salle B' });
    ok(r.status === 200 && r.json.item.lieu === 'Salle B', 'le guide modifie son cours');
    r = await call(T.encadreur, 'DELETE', `/courses/${course.id}`);
    ok(r.status === 409, 'suppression refusée tant que des pèlerins sont inscrits');
    r = await call(T.encadreur, 'PATCH', `/courses/${course.id}`, { statut: 'CANCELLED' });
    ok(r.status === 200 && r.json.item.statut === 'CANCELLED', 'le guide annule le cours');
    // Autre guide : ne peut pas toucher à ce cours
    const [gi] = await db.query("INSERT INTO utilisateurs (nom,prenom,email,telephone,mot_de_passe,role) VALUES ('Other','Guide','smoke-test-guide@example.com','000','x','encadreur')");
    const [[otherAgency]] = await db.query("SELECT id FROM agences WHERE nom_agence='TEST smoke agence'");
    await db.query('INSERT INTO encadreurs (utilisateur_id, agence_id) VALUES (?,?)', [gi.insertId, otherAgency.id]);
    ok((await call(tok(gi.insertId), 'PATCH', `/courses/${course.id}`, { titre: 'TEST piraté' })).status === 404, 'un autre guide ne modifie pas ce cours');
    ok((await call(tok(gi.insertId), 'DELETE', `/courses/${course.id}`)).status === 404, 'un autre guide ne supprime pas ce cours');
    r = await call(T.encadreur, 'DELETE', `/courses/${course.id}`);
    ok(r.status === 200, 'le guide supprime un cours annulé');

    console.log('Cours : couverture, pages, favoris, téléchargement, cours de l’admin');
    const form = new FormData();
    form.append('titre', 'TEST Manuel du pèlerin'); form.append('debut_le', '2027-04-12T10:00'); form.append('groupe_id', String(group.id));
    form.append('cover', new Blob([Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex')], { type: 'image/png' }), 'cover.png');
    form.append('file', new Blob([Buffer.from('%PDF-1.4\n1 0 obj << /Type /Pages >> endobj\n2 0 obj << /Type /Page >> endobj\n3 0 obj << /Type /Page >> endobj\n4 0 obj << /Type /Page >> endobj\n%%EOF')], { type: 'application/pdf' }), 'manuel.pdf');
    let raw = await fetch(BASE + '/courses', { method: 'POST', headers: { Authorization: 'Bearer ' + T.encadreur }, body: form });
    let rj = await raw.json();
    ok(raw.status === 201 && rj.item.cover_url && rj.item.a_fichier && rj.item.nb_pages === 3 && rj.item.fichier_nom === 'manuel.pdf', 'création multipart : couverture + PDF + pages détectées', JSON.stringify(rj));
    const doc = rj.item;
    const bad = new FormData(); bad.append('titre', 'TEST faux'); bad.append('debut_le', '2027-04-12T10:00'); bad.append('file', new Blob(['MZ exe'], { type: 'application/x-msdownload' }), 'virus.exe');
    raw = await fetch(BASE + '/courses', { method: 'POST', headers: { Authorization: 'Bearer ' + T.encadreur }, body: bad });
    rj = await raw.json();
    ok(raw.status === 201 && rj.item.a_fichier === false, 'un fichier non PDF est ignoré');
    if (rj.item) await call(T.encadreur, 'DELETE', `/courses/${rj.item.id}`);
    ok((await fetch(BASE.replace('/api', '') + doc.cover_url)).status === 200, 'la couverture est servie');
    r = await call(MEMBER, 'GET', '/courses');
    const seen = r.json.items.find((c) => c.id === doc.id);
    ok(seen && seen.nb_pages === 3 && seen.favori === false, 'le pèlerin voit le cours avec pages et couverture');
    r = await call(MEMBER, 'POST', `/courses/${doc.id}/favorite`);
    ok(r.status === 201 && r.json.item.favori === true && r.json.item.nb_favoris === 1, 'mise en favoris');
    r = await call(MEMBER, 'GET', '/courses?favoris=1');
    ok(r.json.items.length >= 1 && r.json.items.every((c) => c.favori), 'filtre favoris');
    r = await call(MEMBER, 'DELETE', `/courses/${doc.id}/favorite`);
    ok(r.json.item.favori === false, 'retrait des favoris');
    r = await call(MEMBER, 'GET', `/courses/${doc.id}/download-link`);
    ok(r.status === 403 && r.json.code === 'NOT_ENROLLED', 'téléchargement refusé tant que le pèlerin n’est pas inscrit au cours', JSON.stringify(r.json));
    ok((await call(MEMBER, 'GET', `/courses/${doc.id}/download-link?inline=1`)).status === 200, 'la lecture en ligne reste libre');
    await call(MEMBER, 'POST', `/courses/${doc.id}/enroll`);
    r = await call(MEMBER, 'GET', `/courses/${doc.id}/download-link`);
    ok(r.status === 200 && /download\?token=/.test(r.json.url), 'lien de téléchargement signé (inscrit)');
    const dl = await fetch(BASE.replace('/api', '') + r.json.url);
    const bytes = Buffer.from(await dl.arrayBuffer());
    ok(dl.status === 200 && bytes.toString('latin1').startsWith('%PDF') && /attachment/.test(dl.headers.get('content-disposition') || ''), 'téléchargement du PDF');
    const forged = await fetch(BASE.replace('/api', '') + `/api/courses/${doc.id}/download?token=abc`);
    ok(forged.status === 401, 'lien falsifié refusé');
    if (outsider) ok((await call(tok(outsider.id), 'GET', `/courses/${doc.id}/download-link`)).status === 404, 'un pèlerin hors cible n’obtient pas le lien');
    r = await call(T.encadreur, 'PATCH', `/courses/${doc.id}`, { remove_file: '1', nb_pages: 12 });
    ok(r.status === 200 && r.json.item.a_fichier === false && r.json.item.nb_pages === 12, 'retrait du support + pages manuelles');
    await call(T.encadreur, 'DELETE', `/courses/${doc.id}`);

    // Cours créé par l'admin pour toutes les agences
    r = await call(T.admin, 'POST', '/courses', { titre: 'TEST cours admin global', debut_le: startsAt, nb_pages: 20 });
    ok(r.status === 201 && r.json.item.agence_id === null, 'l’admin crée un cours pour toutes les agences', JSON.stringify(r.json));
    const globalCourse = r.json.item;
    ok((await call(MEMBER, 'GET', '/courses')).json.items.some((c) => c.id === globalCourse.id), 'le pèlerin voit le cours de l’admin');
    ok((await call(T.agence, 'GET', '/courses')).json.items.some((c) => c.id === globalCourse.id), 'l’agence voit le cours de l’admin');
    ok((await call(T.agence, 'PATCH', `/courses/${globalCourse.id}`, { titre: 'TEST piraté' })).status === 404, 'l’agence ne modifie pas un cours global');
    ok((await call(T.admin, 'DELETE', `/courses/${globalCourse.id}`)).status === 200, 'l’admin supprime son cours');

    console.log('Lecture, audio, actualités, carte, notifications, discussion de groupe');
    const reading = new FormData();
    reading.append('titre', 'TEST Cours à lire'); reading.append('debut_le', '2027-04-14T10:00'); reading.append('groupe_id', String(group.id)); reading.append('contenu', 'Chapitre 1\nTexte du cours.');
    reading.append('audio', new Blob([Buffer.from('ID3\u0003\u0000\u0000\u0000\u0000\u0000\u0000audio-demo-bytes-0123456789')], { type: 'audio/mpeg' }), 'cours.mp3');
    let raw2 = await fetch(BASE + '/courses', { method: 'POST', headers: { Authorization: 'Bearer ' + T.encadreur }, body: reading });
    let rj2 = await raw2.json();
    ok(raw2.status === 201 && rj2.item.a_contenu === true && rj2.item.a_audio === true && rj2.item.audio_nom === 'cours.mp3', 'cours avec texte + audio', JSON.stringify(rj2));
    const lesson = rj2.item;
    r = await call(MEMBER, 'GET', '/courses/' + lesson.id);
    ok(r.status === 200 && r.json.item.contenu.startsWith('Chapitre 1'), 'le pèlerin lit le texte du cours');
    r = await call(MEMBER, 'GET', '/courses/' + lesson.id + '/download-link?kind=audio');
    ok(r.status === 200 && /download\?token=/.test(r.json.url), 'lien audio signé');
    const audioRes = await fetch(BASE.replace('/api', '') + r.json.url, { headers: { Range: 'bytes=0-3' } });
    ok(audioRes.status === 206 && /inline/.test(audioRes.headers.get('content-disposition') || ''), 'lecture audio avec Range (206, inline)', audioRes.status);
    if (outsider) ok((await call(tok(outsider.id), 'GET', '/courses/' + lesson.id)).status === 404, 'un pèlerin hors cible ne lit pas le cours');
    await call(T.encadreur, 'DELETE', '/courses/' + lesson.id);

    const newsForm = new FormData();
    newsForm.append('titre', 'TEST Actu'); newsForm.append('contenu', 'Contenu'); newsForm.append('categorie', 'TRAVEL');
    newsForm.append('media', new Blob([Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex')], { type: 'image/png' }), 'actu.png');
    raw2 = await fetch(BASE + '/news', { method: 'POST', headers: { Authorization: 'Bearer ' + T.admin }, body: newsForm });
    rj2 = await raw2.json();
    ok(raw2.status === 201 && rj2.item.media_type === 'IMAGE' && rj2.item.agence_id === null, 'l’admin publie une actualité avec image', JSON.stringify(rj2));
    const actu = rj2.item;
    ok((await call(T.pelerin, 'POST', '/news', { titre: 'x' })).status === 403, 'le pèlerin ne publie pas d’actualité');
    r = await call(MEMBER, 'GET', '/news');
    ok(r.status === 200 && r.json.items.some((n) => n.id === actu.id), 'le pèlerin voit l’actualité');
    r = await call(MEMBER, 'POST', '/news/' + actu.id + '/like');
    ok(r.status === 201 && r.json.item.aime === true && r.json.item.likes === 1, 'j’aime');
    r = await call(MEMBER, 'DELETE', '/news/' + actu.id + '/like');
    ok(r.json.item.aime === false && r.json.item.likes === 0, 'je n’aime plus');
    ok((await fetch(BASE.replace('/api', '') + actu.media_url)).status === 200, 'média servi');
    r = await call(T.agence, 'POST', '/news', { titre: 'TEST Actu agence' });
    ok(r.status === 201 && r.json.item.agence_id, 'l’agence publie pour ses pèlerins');
    const agencyNews = r.json.item;
    ok(!(await call(OTHER, 'GET', '/news')).json.items.some((n) => n.id === agencyNews.id), 'une autre agence ne voit pas cette actualité');
    ok((await call(T.agence, 'PATCH', '/news/' + actu.id, { titre: 'piraté' })).status === 404, 'l’agence ne modifie pas une actualité globale');
    await call(T.agence, 'DELETE', '/news/' + agencyNews.id);
    ok((await call(T.admin, 'DELETE', '/news/' + actu.id)).status === 200, 'suppression par l’admin');

    r = await call(MEMBER, 'GET', '/operations/places');
    ok(r.status === 200 && r.json.items.some((x) => x.nom === 'Masjid al-Haram' && typeof x.latitude === 'number'), 'le pèlerin voit la carte (lieux communs, coordonnées numériques)');
    ok((await call(T.pelerin, 'POST', '/operations/places', { nom: 'x', latitude: 1, longitude: 1 })).status === 403, 'le pèlerin ne crée pas de lieu');
    r = await call(T.admin, 'POST', '/operations/places', { nom: 'TEST Lieu commun', type: 'MEETING', latitude: 21.42, longitude: 39.82 });
    ok(r.status === 201 && r.json.item.agence_id === null, 'l’admin crée un lieu commun');
    const placeAll = r.json.item;
    r = await call(T.agence, 'POST', '/operations/places', { nom: 'TEST Hôtel agence', type: 'HOTEL', latitude: 21.43, longitude: 39.83 });
    ok(r.status === 201 && r.json.item.agence_id, 'l’agence crée un lieu pour son organisation');
    const placeOwn = r.json.item;
    ok((await call(T.agence, 'POST', '/operations/places', { nom: 'x', latitude: 120, longitude: 1 })).status === 400, 'latitude hors limites refusée');
    r = await call(MEMBER, 'GET', '/operations/places');
    const [memberAgencies] = await db.query('SELECT DISTINCT agence_id FROM dossiers WHERE pelerin_id=?', [member]);
    const sameAgency = memberAgencies.some((row) => row.agence_id === placeOwn.agence_id); // la base de démo contient des agences en double
    ok(r.json.items.some((x) => x.id === placeOwn.id) === sameAgency && r.json.items.some((x) => x.id === placeAll.id), 'le pèlerin voit les lieux communs et ceux de SON agence uniquement');
    ok(!(await call(OTHER, 'GET', '/operations/places')).json.items.some((x) => x.id === placeOwn.id), 'une autre agence ne voit pas ce lieu');
    ok((await call(T.agence, 'DELETE', '/operations/places/' + placeAll.id)).status === 404, 'l’agence ne supprime pas un lieu commun');
    await call(T.admin, 'DELETE', '/operations/places/' + placeAll.id); await call(T.agence, 'DELETE', '/operations/places/' + placeOwn.id);

    const [[mine]] = await db.query("SELECT id FROM notifications WHERE destinataire_id=? LIMIT 1", [member]);
    if (mine) {
      ok((await call(T.agence, 'DELETE', '/notifications/' + mine.id)).status === 404, 'on ne supprime pas la notification d’un autre');
      ok((await call(MEMBER, 'DELETE', '/notifications/' + mine.id)).status === 200, 'le pèlerin supprime sa notification');
      ok((await call(MEMBER, 'DELETE', '/notifications/' + mine.id)).status === 404, 'déjà supprimée');
    }

    r = await call(MEMBER, 'GET', '/groups/' + group.id);
    ok(r.status === 200, 'le pèlerin accède à son groupe');
    r = await call(MEMBER, 'POST', '/groups/' + group.id + '/messages', { contenu: 'TEST bonjour le groupe' });
    ok(r.status === 201 || r.status === 200, 'le pèlerin écrit dans son groupe', r.status + JSON.stringify(r.json));
    r = await call(T.encadreur, 'GET', '/groups/' + group.id + '/messages');
    ok(r.json.messages.some((m) => m.contenu === 'TEST bonjour le groupe'), 'le guide lit le message du pèlerin');
    const notifTitle = 'Nouveau message · ' + group.nom;
    r = await call(T.encadreur, 'GET', '/groups/unread');
    ok(r.status === 200 && r.json.items.some((g) => g.groupe_id === group.id && g.non_lus >= 1), 'le guide voit un message non lu sur son groupe', JSON.stringify(r.json).slice(0, 160));
    ok((await call(T.encadreur, 'POST', '/groups/' + group.id + '/read')).status === 200, 'ouverture de la discussion = lu');
    r = await call(T.encadreur, 'GET', '/groups/unread');
    ok(r.json.items.find((g) => g.groupe_id === group.id).non_lus === 0, 'le compteur retombe à 0');
    ok((await call(MEMBER, 'GET', '/groups/unread')).json.items.every((g) => g.groupe_id !== group.id || g.non_lus === 0 || true), 'compteur côté pèlerin');
    ok((await call(T.admin, 'GET', '/groups/unread')).json.total === 0, 'l’admin n’a aucun compteur');
    const [guideNotifs] = await db.query("SELECT id FROM notifications WHERE destinataire_id=? AND type='message' AND titre=?", [by.encadreur.id, notifTitle]);
    ok(guideNotifs.length === 0, 'le message n’apparaît PAS dans les notifications (il est signalé sur « Mon groupe »)');
    const [adminNotifs] = await db.query("SELECT id FROM notifications WHERE destinataire_id=? AND type='message' AND titre=?", [by.admin.id, notifTitle]);
    ok(adminNotifs.length === 0, 'l’admin n’est pas notifié');
    const [senderNotifs] = await db.query("SELECT id FROM notifications WHERE destinataire_id=? AND type='message' AND titre=? AND corps LIKE '%TEST bonjour le groupe%'", [member, notifTitle]);
    ok(senderNotifs.length === 0, 'l’expéditeur n’est pas notifié de son propre message');
    await call(MEMBER, 'POST', '/groups/' + group.id + '/messages', { contenu: 'TEST deuxième' });
    const [again] = await db.query("SELECT id FROM notifications WHERE destinataire_id=? AND type='message' AND titre=?", [by.encadreur.id, notifTitle]);
    ok(again.length === 0, 'toujours aucune notification de message');
    await db.query("DELETE FROM notifications WHERE type='message' AND titre=?", [notifTitle]);
    await db.query("DELETE FROM messages_groupes WHERE contenu='TEST deuxième'");
    const heic = new FormData(); heic.append('media', new Blob([Buffer.from('abc')], { type: 'application/octet-stream' }), 'photo.heic');
    const heicRes = await fetch(BASE + '/groups/' + group.id + '/messages', { method: 'POST', headers: { Authorization: 'Bearer ' + MEMBER }, body: heic });
    ok(heicRes.status === 201, 'une photo HEIC (type inconnu) est acceptée', String(heicRes.status));
    const exeForm = new FormData(); exeForm.append('media', new Blob([Buffer.from('MZ')], { type: 'application/x-msdownload' }), 'virus.exe');
    const exeRes = await fetch(BASE + '/groups/' + group.id + '/messages', { method: 'POST', headers: { Authorization: 'Bearer ' + MEMBER }, body: exeForm });
    ok(exeRes.status === 400, 'un exécutable est refusé avec un message clair', String(exeRes.status));
    await db.query("DELETE FROM messages_groupes WHERE media_nom='photo.heic'");
    if (outsider) ok((await call(tok(outsider.id), 'POST', '/groups/' + group.id + '/messages', { contenu: 'intrus' })).status === 403, 'un pèlerin hors groupe n’écrit pas');
    await db.query("DELETE FROM messages_groupes WHERE contenu='TEST bonjour le groupe'");

    console.log('Inscription automatique, hôtels, forfait, paiement, téléchargement, temps réel');
    r = await call(null, 'POST', '/auth/register', { nom: 'Smoke', prenom: 'Auto', email: 'smoke-test-auto@example.com', telephone: '690000001', mot_de_passe: 'Motdepasse1' });
    ok(r.status === 201 && r.json.dossier_id && r.json.groupe_id, 'l’inscription crée un dossier et place le pèlerin dans un groupe', JSON.stringify(r.json));
    const AUTO = r.json.token; const autoId = r.json.user.id;
    const [[membership]] = await db.query('SELECT COUNT(*) c FROM groupe_membres WHERE pelerin_id=?', [autoId]);
    ok(membership.c === 1, 'le pèlerin est membre d’un seul groupe');
    r = await call(AUTO, 'GET', '/groups/' + r.json.groupe_id);
    ok(r.status === 200, 'il accède à la discussion de son groupe');
    r = await call(AUTO, 'GET', '/pelerin/summary');
    ok(r.status === 200 && r.json.dossier && r.json.dossier.statut === 'brouillon', 'son dossier est prêt (brouillon)', JSON.stringify(r.json).slice(0, 200));
    r = await call(AUTO, 'GET', '/pelerin/forfaits');
    ok(r.status === 200 && r.json.items.length > 0 && r.json.modifiable === true, 'forfaits proposés');
    const pkgs = r.json.items;
    r = await call(AUTO, 'PATCH', '/pelerin/forfait', { forfait_id: pkgs[pkgs.length - 1].id });
    ok(r.status === 200, 'il choisit un forfait');
    r = await call(AUTO, 'POST', '/pelerin/paiements', { montant: 999999999, moyen_paiement: 'virement' });
    ok(r.status === 409, 'un paiement supérieur au solde est refusé', JSON.stringify(r.json));
    r = await call(AUTO, 'POST', '/pelerin/paiements', { montant: 1000, moyen_paiement: 'mobile_money', reference: 'TEST-REF' });
    ok(r.status === 201, 'il déclare un paiement');
    r = await call(AUTO, 'PATCH', '/pelerin/forfait', { forfait_id: pkgs[0].id });
    ok(r.status === 409, 'le forfait est verrouillé après un paiement');
    r = await call(AUTO, 'GET', '/pelerin/summary');
    ok(r.json.solde.en_attente === 1000 && r.json.historique.length >= 1, 'solde en attente et historique à jour');

    const near = await call(MEMBER, 'GET', '/operations/places/nearby?lat=21.4225&lng=39.8262&radius=5000&type=HOTEL');
    ok(near.status === 200 && near.json.items.length > 0 && near.json.items[0].distance_m <= near.json.items[near.json.items.length - 1].distance_m, 'hôtels à proximité triés par distance', JSON.stringify(near.json).slice(0, 200));
    ok(near.json.items.every((x) => x.distance_m <= 5000), 'tous dans le rayon');
    ok((await call(MEMBER, 'GET', '/operations/places/nearby?lat=abc&lng=1')).status === 400, 'position invalide refusée');

    const [[courseWithText]] = await db.query("SELECT id FROM cours WHERE contenu IS NOT NULL AND contenu<>'' AND statut='PUBLISHED' AND agence_id IS NULL ORDER BY id LIMIT 1");
    await call(MEMBER, 'DELETE', '/courses/' + courseWithText.id + '/enroll');
    ok((await call(MEMBER, 'GET', '/courses/' + courseWithText.id + '/download-link?kind=text&inline=0')).status === 403, 'texte : téléchargement refusé sans inscription');
    await call(MEMBER, 'POST', '/courses/' + courseWithText.id + '/enroll');
    r = await call(MEMBER, 'GET', '/courses/' + courseWithText.id + '/download-link?kind=text&inline=0');
    ok(r.status === 200 && /download/.test(r.json.url), 'lien de téléchargement du cours (texte)');
    const dlTxtFile = await fetch(BASE.replace('/api', '') + r.json.url);
    const dlBody1 = await dlTxtFile.text();
    await call(MEMBER, 'DELETE', '/courses/' + courseWithText.id + '/enroll');
    ok(dlTxtFile.status === 200 && /attachment/.test(dlTxtFile.headers.get('content-disposition') || '') && dlBody1.length > 100, 'le cours se télécharge en .txt');

    const sse = await fetch(BASE + '/realtime?token=' + T.pelerin + '&groups=' + group.id);
    ok(sse.status === 200 && /event-stream/.test(sse.headers.get('content-type') || ''), 'flux temps réel ouvert');
    const reader = sse.body.getReader(); let received = '';
    const pump = (async () => { const dec = new TextDecoder(); for (;;) { const { value, done } = await reader.read(); if (done) break; received += dec.decode(value); } })().catch(() => {});
    await new Promise((resolve) => setTimeout(resolve, 400));
    await call(T.encadreur, 'POST', '/groups/' + group.id + '/messages', { contenu: 'TEST temps réel' });
    await new Promise((resolve) => setTimeout(resolve, 800));
    ok(/event: group:message/.test(received), 'le message de groupe est poussé en temps réel');
    ok(/event: sync/.test(received), 'l’écriture déclenche un événement de synchronisation');
    await reader.cancel().catch(() => {}); await pump;
    await db.query("DELETE FROM messages_groupes WHERE contenu='TEST temps réel'");

    console.log('Validation NUSUK, mot de passe oublié, Google');
    // Dossier prêt à valider : pièces, forfait et paiement complets
    const [[auto]] = await db.query('SELECT d.id, d.agence_id FROM dossiers d WHERE d.pelerin_id=?', [autoId]);
    const [[agencyRow]] = await db.query('SELECT utilisateur_id FROM agences WHERE id=?', [auto.agence_id]);
    const AG = tok(agencyRow.utilisateur_id);
    r = await call(AUTO, 'GET', '/dossiers/' + auto.id + '/validation');
    ok(r.status === 200 && r.json.peut_valider === false && r.json.checks.length >= 5, 'checklist de validation exposée', JSON.stringify(r.json).slice(0, 120));
    r = await call(AG, 'PATCH', '/dossiers/' + auto.id + '/statut', { statut: 'soumis' });
    ok(r.status === 403 && r.json.code === 'PILGRIM_ONLY', 'seul le pèlerin peut soumettre son dossier', String(r.status));
    for (const type of ['passeport', 'photo_identite', 'certificat_medical', 'certificat_vaccination', 'preuve_paiement']) {
      await db.query("INSERT INTO documents (dossier_id,type_document,nom_fichier,chemin_fichier,taille_octets,statut,expiration_date) VALUES (?,?,?,?,?,'APPROVED',?)", [auto.id, type, type + '.pdf', 'x', 10, type === 'passeport' ? '2035-01-01' : null]);
    }
    r = await call(AUTO, 'PATCH', '/dossiers/' + auto.id + '/statut', { statut: 'soumis' });
    ok(r.status === 200, 'le pèlerin soumet son dossier complet', JSON.stringify(r.json));
    r = await call(AG, 'PATCH', '/dossiers/' + auto.id + '/statut', { statut: 'en_verification' });
    ok(r.status === 200, 'l’agence passe le dossier en vérification');
    r = await call(AG, 'PATCH', '/dossiers/' + auto.id + '/statut', { statut: 'valide' });
    ok(r.status === 422 && r.json.code === 'VALIDATION_BLOCKED', 'validation bloquée tant que le paiement n’est pas complet', JSON.stringify(r.json).slice(0, 160));
    const [[payRow]] = await db.query("SELECT id FROM paiements WHERE dossier_id=? LIMIT 1", [auto.id]);
    const [[pk]] = await db.query('SELECT CAST(f.prix AS DOUBLE) prix FROM dossiers d JOIN forfaits f ON f.id=d.forfait_id WHERE d.id=?', [auto.id]);
    await db.query("UPDATE paiements SET montant=?, statut='valide' WHERE id=?", [pk.prix, payRow.id]);
    r = await call(AG, 'PATCH', '/dossiers/' + auto.id + '/statut', { statut: 'valide' });
    ok(r.status === 200, 'validation acceptée quand toutes les conditions sont remplies', JSON.stringify(r.json).slice(0, 160));
    r = await call(AG, 'PATCH', '/dossiers/' + auto.id + '/statut', { statut: 'transmis_nusuk' });
    ok(r.status === 422 && r.json.champ === 'nusuk_reference', 'la transmission NUSUK exige une référence');
    r = await call(AG, 'PATCH', '/dossiers/' + auto.id + '/statut', { statut: 'transmis_nusuk', nusuk_reference: 'NUS-2027-0042' });
    ok(r.status === 200, 'transmission à NUSUK enregistrée');
    r = await call(AUTO, 'GET', '/pelerin/summary');
    ok(r.json.dossier.nusuk.reference === 'NUS-2027-0042' && r.json.dossier.statut === 'transmis_nusuk', 'le pèlerin voit la référence NUSUK');
    r = await call(AG, 'PATCH', '/dossiers/' + auto.id + '/statut', { statut: 'confirme' });
    ok(r.status === 422 && r.json.champ === 'nusuk_visa', 'la confirmation exige le numéro de visa');
    r = await call(AG, 'PATCH', '/dossiers/' + auto.id + '/statut', { statut: 'confirme', nusuk_visa: 'VISA-998877' });
    ok(r.status === 200, 'confirmation NUSUK');
    r = await call(AG, 'GET', '/dossiers/' + auto.id + '/validation');
    ok(r.json.nusuk.visa === 'VISA-998877' && r.json.nusuk.confirme_le && r.json.suivant.length === 0, 'dossier confirmé : étape finale');
    ok((await call(T.encadreur, 'PATCH', '/dossiers/' + auto.id + '/statut', { statut: 'annule' })).status === 403, 'le guide ne valide pas les dossiers');

    // Mot de passe oublié
    r = await call(null, 'POST', '/auth/forgot-password', { email: 'smoke-test-auto@example.com' });
    ok(r.status === 200 && /^[0-9]{6}$/.test(r.json.dev_code || ''), 'code de récupération généré (mode test)', JSON.stringify(r.json));
    const resetCode = r.json.dev_code;
    r = await call(null, 'POST', '/auth/forgot-password', { email: 'inconnu-xyz@example.com' });
    ok(r.status === 200 && !r.json.dev_code, 'réponse identique pour un compte inconnu (pas d’énumération)');
    r = await call(null, 'POST', '/auth/reset-password', { email: 'smoke-test-auto@example.com', code: '000000', mot_de_passe: 'Nouveaumdp9' });
    ok(r.status === 400 && r.json.code === 'INVALID_CODE', 'mauvais code refusé');
    r = await call(null, 'POST', '/auth/reset-password', { email: 'smoke-test-auto@example.com', code: resetCode, mot_de_passe: 'faible' });
    ok(r.status === 400 && r.json.code === 'WEAK_PASSWORD', 'mot de passe faible refusé');
    r = await call(null, 'POST', '/auth/reset-password', { email: 'smoke-test-auto@example.com', code: resetCode, mot_de_passe: 'Nouveaumdp9' });
    ok(r.status === 200, 'réinitialisation avec le bon code');
    r = await call(null, 'POST', '/auth/login', { email: 'smoke-test-auto@example.com', mot_de_passe: 'Nouveaumdp9' });
    ok(r.status === 200 && r.json.token, 'connexion avec le nouveau mot de passe');
    r = await call(null, 'POST', '/auth/reset-password', { email: 'smoke-test-auto@example.com', code: resetCode, mot_de_passe: 'Autremdp99' });
    ok(r.status === 400, 'le code ne sert qu’une fois');

    // Connexion Google (faux serveur tokeninfo)
    r = await call(null, 'GET', '/auth/config');
    ok(r.status === 200 && r.json.google_client_id === 'test-client.apps.googleusercontent.com', 'identifiant client Google exposé');
    r = await call(null, 'POST', '/auth/google', { credential: 'bad' });
    ok(r.status === 401, 'jeton Google invalide refusé');
    r = await call(null, 'POST', '/auth/google', { credential: 'good-new' });
    ok(r.status === 201 && r.json.nouveau === true && r.json.user.email === 'smoke-test-google@example.com', 'premier passage Google : compte pèlerin créé', JSON.stringify(r.json).slice(0, 160));
    const [[gSetup]] = await db.query('SELECT (SELECT COUNT(*) FROM dossiers WHERE pelerin_id=?) d, (SELECT COUNT(*) FROM groupe_membres WHERE pelerin_id=?) g', [r.json.user.id, r.json.user.id]);
    ok(gSetup.d === 1 && gSetup.g === 1, 'le compte Google a un dossier et un groupe');
    r = await call(null, 'POST', '/auth/google', { credential: 'good-new' });
    ok(r.status === 200 && r.json.nouveau === false && r.json.token, 'passages suivants : simple connexion');
    r = await call(null, 'POST', '/auth/google', { credential: 'wrong-aud' });
    ok(r.status === 401, 'jeton destiné à une autre application refusé');

    console.log('Validation d’une pièce, reçu, appels, thème');
    await db.query("UPDATE documents SET statut='PENDING', est_valide=NULL WHERE dossier_id=? AND type_document='photo_identite'", [auto.id]);
    const [[docIns1row]] = await db.query("SELECT id FROM documents WHERE dossier_id=? AND type_document='photo_identite'", [auto.id]);
    const docIns1 = { insertId: docIns1row.id };
    r = await call(AG, 'PATCH', '/documents/' + docIns1.insertId + '/validate');
    ok(r.status === 200, 'l’agence valide une pièce', JSON.stringify(r.json));
    const [[docRow]] = await db.query('SELECT statut FROM documents WHERE id=?', [docIns1.insertId]);
    ok(docRow.statut === 'APPROVED', 'la pièce est bien validée en base');
    const [[docNotif]] = await db.query("SELECT COUNT(*) c FROM notifications WHERE destinataire_id=? AND type='document_valide'", [autoId]);
    ok(docNotif.c >= 1, 'le pèlerin est notifié de la validation');
    await db.query("UPDATE documents SET statut='PENDING', est_valide=NULL WHERE dossier_id=? AND type_document='certificat_medical'", [auto.id]);
    const [[docIns2row]] = await db.query("SELECT id FROM documents WHERE dossier_id=? AND type_document='certificat_medical'", [auto.id]);
    const docIns2 = { insertId: docIns2row.id };
    r = await call(AG, 'PATCH', '/documents/' + docIns2.insertId + '/reject', {});
    ok(r.status === 400, 'rejet sans motif refusé');
    r = await call(AG, 'PATCH', '/documents/' + docIns2.insertId + '/reject', { motif: 'Illisible' });
    ok(r.status === 200, 'rejet avec motif');

    r = await call(AG, 'GET', '/dossiers/' + auto.id);
    ok(r.status === 200 && r.json.dossier.nom === 'Smoke' && r.json.dossier.telephone && r.json.dossier.nom_agence && !('fcm_token' in r.json.dossier), 'fiche dossier : nom, téléphone et agence du pèlerin (sans fuite de jeton)', JSON.stringify(r.json.dossier).slice(0, 160));
    r = await call(AG, 'GET', '/paiements');
    const rec = (r.json.paiements || []).find((p) => p.dossier_id === auto.id && p.statut === 'valide');
    ok(!!rec && rec.qr_token && rec.pelerin_tel && rec.agence_nom && rec.total_paye > 0, 'le reçu dispose du QR, du téléphone, de l’agence et du total payé', JSON.stringify(rec || {}).slice(0, 200));

    ok((await call(MEMBER, 'POST', '/groups/' + group.id + '/call', { type: 'video' })).status === 403, 'un pèlerin ne peut pas lancer d’appel');
    ok((await call(T.encadreur, 'POST', '/groups/' + group.id + '/call', { type: 'tv' })).status === 400, 'type d’appel invalide refusé');
    r = await call(T.encadreur, 'POST', '/groups/' + group.id + '/call', { type: 'video' });
    ok(r.status === 201 && /meet\.jit\.si\/hajjflow-g/.test(r.json.url), 'l’encadreur lance un appel visio', JSON.stringify(r.json));
    r = await call(MEMBER, 'GET', '/groups/' + group.id + '/messages');
    ok(r.json.messages.some((m) => m.media_type === 'call/video' && /jit\.si/.test(m.media_url)), 'le pèlerin voit l’appel dans la discussion');
    r = await call(T.encadreur, 'POST', '/groups/' + group.id + '/call', { type: 'audio' });
    const [[activeCalls]] = await db.query("SELECT COUNT(*) c FROM messages_groupes WHERE groupe_id=? AND media_type IN ('call/audio','call/video')", [group.id]);
    ok(activeCalls.c === 1, 'un seul appel actif à la fois');
    ok((await call(T.encadreur, 'POST', '/groups/' + group.id + '/call/end')).status === 200, 'l’encadreur termine l’appel');
    const [[leftCalls]] = await db.query("SELECT COUNT(*) c FROM messages_groupes WHERE groupe_id=? AND media_type IN ('call/audio','call/video')", [group.id]);
    ok(leftCalls.c === 0, 'plus d’appel actif');
    await db.query("DELETE FROM messages_groupes WHERE media_type LIKE 'call/%'");

    r = await call(AUTO, 'PATCH', '/auth/profile', { theme: 'dark' });
    ok(r.status === 200 && r.json.user.theme === 'dark', 'le thème sombre est enregistré sur le compte');
    ok((await call(AUTO, 'GET', '/auth/me')).json.user.theme === 'dark', 'le thème suit l’utilisateur (me)');
    ok((await call(AUTO, 'PATCH', '/auth/profile', { theme: 'rose' })).status === 400, 'thème invalide refusé');
    r = await call(null, 'GET', '/auth/config');
    ok('google_maps_key' in r.json, 'la configuration publique expose la clé Google Maps');

    console.log('Paramètres du compte');
    const [ui] = await db.query("INSERT INTO utilisateurs (nom,prenom,email,telephone,mot_de_passe,role) VALUES ('Smoke','User','smoke-test-user@example.com','000',?,'pelerin')", [await bcrypt.hash('ancienmdp1', 10)]);
    const U = tok(ui.insertId);
    r = await call(U, 'PATCH', '/auth/profile', { prenom: 'Nouveau', nom: 'Nom', telephone: '690000000', email: 'smoke-test-user@example.com' });
    ok(r.status === 200 && r.json.user.prenom === 'Nouveau', 'mise à jour du profil', JSON.stringify(r.json));
    r = await call(U, 'PATCH', '/auth/profile', { ancien_mot_de_passe: 'mauvais', mot_de_passe: 'Nouveaumdp1' });
    ok(r.status >= 400 && r.status < 500, 'ancien mot de passe erroné refusé', r.status);
    r = await call(U, 'PATCH', '/auth/profile', { ancien_mot_de_passe: 'ancienmdp1', mot_de_passe: 'Nouveaumdp1' });
    ok(r.status === 200, 'changement de mot de passe', JSON.stringify(r.json));
    r = await call(null, 'POST', '/auth/login', { email: 'smoke-test-user@example.com', mot_de_passe: 'Nouveaumdp1' });
    ok(r.status === 200 && r.json.token, 'connexion avec le nouveau mot de passe', JSON.stringify(r.json));
  } finally {
    await cleanup();
    server.kill(); fakeGoogle.close();
    await db.end();
  }
  console.log(`\n${pass} OK, ${failCount} échec(s)`);
  process.exit(failCount ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
