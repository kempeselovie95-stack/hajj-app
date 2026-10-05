const { spawn } = require('child_process');
const path = require('path');
const root = path.resolve(__dirname, '..');
const jwt = require(require.resolve('jsonwebtoken', { paths: [root] }));
const mysql = require(require.resolve('mysql2/promise', { paths: [root] }));

const PORT = 3111;
const BASE = `http://localhost:${PORT}/api/operations`;
let pass = 0; let failCount = 0;
const ok = (cond, label, extra) => { if (cond) { pass++; console.log('  ✓', label); } else { failCount++; console.log('  ✗', label, extra ?? ''); } };

async function call(token, method, url, body) {
  const res = await fetch(BASE + url, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: body ? JSON.stringify(body) : undefined });
  let json = null; try { json = await res.json(); } catch { /* vide */ }
  return { status: res.status, json };
}

(async () => {
  const db = await mysql.createConnection({ host: 'localhost', user: 'root', database: 'hajj_cameroun' });
  await db.query("DELETE FROM voyages WHERE nom LIKE 'TEST%'"); await db.query("DELETE FROM vehicules WHERE nom='Bus 03'"); await db.query("DELETE FROM utilisateurs WHERE email='tenant-test@example.com'");
  const [users] = await db.query("SELECT id, role, email FROM utilisateurs WHERE email IN ('admin@hajj-cm.com','agence@hajj-cm.com','encadreur@hajj-cm.com')");
  const by = Object.fromEntries(users.map((u) => [u.role, u]));
  const secret = process.env.JWT_SECRET || 'dev-only-change-me';
  const tok = (u) => jwt.sign({ id: u.id }, secret, { expiresIn: '1h' });
  const [agencies] = await db.query('SELECT id, utilisateur_id FROM agences ORDER BY id');
  const myAgency = agencies.find((a) => a.utilisateur_id === by.agence.id);
  const [gm] = await db.query(`SELECT g.id AS gid FROM groupes_pelerins g JOIN groupe_membres m ON m.groupe_id=g.id JOIN dossiers d ON d.pelerin_id=m.pelerin_id AND d.agence_id=g.agence_id
    WHERE g.agence_id=? AND g.encadreur_id=? GROUP BY g.id HAVING COUNT(*)>=2 ORDER BY g.id LIMIT 1`, [myAgency.id, by.encadreur.id]);
  const grp = [{ id: gm[0].gid }];
  const [pil] = await db.query('SELECT u.id, u.role FROM groupe_membres m JOIN utilisateurs u ON u.id=m.pelerin_id WHERE m.groupe_id=? ORDER BY u.id LIMIT 3', [grp[0].id]);
  console.log({ agence: myAgency.id, pelerins: pil.length, groupe: grp[0]?.id });

  const server = spawn('node', ['src/Server.js'], { cwd: root, env: { ...process.env, PORT: String(PORT), NODE_ENV: 'development' }, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve) => { server.stdout.on('data', (d) => { if (String(d).includes('démarré')) resolve(); }); setTimeout(resolve, 8000); });

  const A = tok(by.agence); const E = tok(by.encadreur); const ADM = tok(by.admin); const P = tok({ id: pil[0].id });
  try {
    console.log('Voyages');
    let r = await call(A, 'POST', '/trips', { nom: 'TEST Hajj 2027 - Vague 1', date_depart: '2027-05-20', date_retour: '2027-06-25' });
    ok(r.status === 201 && r.json.item.agence_id === myAgency.id, 'création voyage (agence déduite du compte)', JSON.stringify(r.json));
    const trip = r.json.item;
    r = await call(A, 'POST', '/trips', { nom: 'X', date_depart: '2027-05-20', date_retour: '2027-05-01' });
    ok(r.status === 400, 'dates incohérentes rejetées');
    r = await call(A, 'POST', '/trips', { nom: 'Hack', agence_id: 99999 });
    ok(r.status === 403, 'agence_id étranger refusé');
    r = await call(E, 'POST', '/trips', { nom: 'Encadreur' });
    ok(r.status === 403, 'encadreur ne peut pas créer');
    r = await call(P, 'GET', '/trips');
    ok(r.status === 403, 'pèlerin sans accès à la gestion');

    console.log('Vols');
    r = await call(A, 'POST', '/flights', { voyage_id: trip.id, numero_vol: 'SV 1234', compagnie: 'Saudia', aeroport_depart: 'DLA', aeroport_arrivee: 'JED', depart_le: '2027-05-20T22:30', arrivee_le: '2027-05-21T06:10' });
    ok(r.status === 201 && r.json.item.depart_le === '2027-05-20T22:30', 'création vol + date sans décalage', JSON.stringify(r.json));
    const flight = r.json.item;
    r = await call(A, 'PUT', `/flights/${flight.id}/groups`, { groupe_ids: [grp[0].id] });
    ok(r.status === 200 && r.json.item.groupe_ids === String(grp[0].id), 'vol associé au groupe', JSON.stringify(r.json));
    r = await call(A, 'PUT', `/flights/${flight.id}/groups`, { groupe_ids: [999999] });
    ok(r.status === 400, 'groupe inexistant refusé');
    r = await call(E, 'GET', `/flights?voyage_id=${trip.id}`);
    ok(r.status === 200 && r.json.items.length === 1, 'encadreur lit les vols de son agence');

    console.log('Hôtels / chambres');
    r = await call(A, 'POST', '/hotels', { voyage_id: trip.id, nom: 'Hôtel Haram', ville: 'Makkah', check_in: '2027-05-21', check_out: '2027-06-10' });
    ok(r.status === 201, 'création hôtel'); const hotel = r.json.item;
    r = await call(A, 'POST', '/rooms', { hotel_id: hotel.id, numero: '205', capacite: 2 });
    ok(r.status === 201, 'création chambre'); const room = r.json.item;
    r = await call(A, 'POST', '/rooms', { hotel_id: hotel.id, numero: '206', capacite: 1 });
    const room2 = r.json.item;
    r = await call(A, 'POST', '/rooms', { hotel_id: hotel.id, numero: '205', capacite: 2 });
    ok(r.status === 409 || r.status === 500, 'numéro de chambre dupliqué rejeté', r.status);
    r = await call(A, 'POST', `/rooms/${room.id}/occupants`, { pelerin_id: pil[0].id });
    ok(r.status === 201, 'affectation pèlerin → chambre');
    r = await call(A, 'POST', `/rooms/${room2.id}/occupants`, { pelerin_id: pil[0].id });
    ok(r.status === 201, 'déplacement vers autre chambre du même hôtel');
    r = await call(A, 'POST', `/rooms/${room2.id}/occupants`, { pelerin_id: pil[1].id });
    ok(r.status === 409, 'chambre complète refusée', JSON.stringify(r.json));
    r = await call(A, 'GET', `/hotels/${hotel.id}/rooms`);
    ok(r.status === 200 && r.json.items.find((x) => x.id === room2.id).occupants.length === 1 && r.json.items.find((x) => x.id === room.id).occupants.length === 0, 'occupation cohérente (un pèlerin = une chambre)', JSON.stringify(r.json.items));

    console.log('Transport / programme');
    r = await call(A, 'POST', '/vehicles', { nom: 'Bus 03', capacite: 50, chauffeur_nom: 'Moussa', chauffeur_telephone: '+966500000000' });
    ok(r.status === 201, 'création véhicule'); const bus = r.json.item;
    r = await call(A, 'POST', '/transports', { voyage_id: trip.id, vehicule_id: bus.id, groupe_id: grp[0].id, lieu_depart: 'Makkah', destination: 'Mina', depart_le: '2027-06-01 08:30' });
    ok(r.status === 201 && r.json.item.vehicule_nom === 'Bus 03', 'création transport');
    r = await call(A, 'POST', '/program', { voyage_id: trip.id, titre: 'Départ vers Mina', type: 'RITUAL', debut_le: '2027-06-01T08:30' });
    ok(r.status === 201, 'événement de programme');

    console.log('Pèlerin : mon voyage');
    r = await call(P, 'GET', '/me/trip');
    ok(r.status === 200 && r.json.vols.some((v) => v.numero_vol === 'SV 1234') && r.json.hotels.some((h) => h.nom === 'Hôtel Haram') && r.json.transports.some((x) => x.destination === 'Mina') && r.json.programme.some((e) => e.titre === 'Départ vers Mina'), 'le pèlerin voit vol, hôtel, transport, programme', JSON.stringify(r.json).slice(0, 400));
    r = await call(P, 'GET', '/qr/me');
    ok(r.status === 200 && /^HAJJ-CM-\d{4}-\d{6}$/.test(r.json.code) && /^[a-f0-9]{48}$/.test(r.json.token), 'QR du pèlerin : code public + token opaque');
    const qr = r.json;

    console.log('QR / présence / incidents');
    r = await call(E, 'POST', '/qr/scan', { token: qr.token, motif: 'PRESENCE' });
    ok(r.status === 200 && r.json.pelerin.code === qr.code && r.json.presence_enregistree === true, 'scan QR enregistre la présence', JSON.stringify(r.json));
    r = await call(E, 'POST', '/qr/scan', { token: 'a'.repeat(48) });
    ok(r.status === 404, 'QR inconnu refusé');
    r = await call(E, 'POST', '/qr/scan', { token: 'nimporte quoi' });
    ok(r.status === 400, 'QR mal formé refusé');
    r = await call(E, 'GET', `/attendance/groups/${grp[0].id}`);
    ok(r.status === 200 && r.json.compteurs.PRESENT >= 1, 'appel : compteur présents', JSON.stringify(r.json.compteurs));
    r = await call(E, 'POST', '/attendance', { groupe_id: grp[0].id, pelerin_id: pil[1].id, type_evenement: 'ABSENT' });
    ok(r.status === 201, 'appel : absent');
    r = await call(E, 'POST', '/incidents', { groupe_id: grp[0].id, pelerin_id: pil[1].id, categorie: 'MEDICAL', description: 'Malaise léger', priorite: 'HIGH' });
    ok(r.status === 201, 'incident signalé par le guide'); const inc = r.json.item;
    r = await call(E, 'PATCH', `/incidents/${inc.id}`, { statut: 'RESOLVED' });
    ok(r.status === 403, 'le guide ne clôt pas un incident');
    r = await call(A, 'PATCH', `/incidents/${inc.id}`, { statut: 'RESOLVED' });
    ok(r.status === 200 && r.json.item.resolu_le, 'agence résout l’incident');
    r = await call(ADM, 'GET', '/audit');
    ok(r.status === 200 && r.json.items.length > 5, 'journal d’audit lisible par l’admin');
    r = await call(A, 'GET', '/audit');
    ok(r.status === 403, 'journal d’audit interdit à l’agence');

    console.log('Isolation multi-tenant');
    const [ins] = await db.query("INSERT INTO utilisateurs (nom,prenom,email,telephone,mot_de_passe,role) VALUES ('Other','Tenant','tenant-test@example.com','000','x','agence')");
    await db.query("INSERT INTO agences (utilisateur_id, nom_agence) VALUES (?, 'TEST Autre agence')", [ins.insertId]);
    {
      const O = tok({ id: ins.insertId });
      r = await call(O, 'GET', `/flights?voyage_id=${trip.id}`);
      ok(r.status === 200 && r.json.items.length === 0, 'autre agence ne voit pas les vols');
      r = await call(O, 'PATCH', `/flights/${flight.id}`, { terminal: 'T9' });
      ok(r.status === 404, 'autre agence ne modifie pas un vol');
      r = await call(O, 'DELETE', `/trips/${trip.id}`);
      ok(r.status === 404, 'autre agence ne supprime pas un voyage');
      r = await call(O, 'POST', '/qr/scan', { token: qr.token });
      ok(r.status === 404, 'autre agence ne scanne pas le QR');
      r = await call(O, 'POST', '/hotels', { voyage_id: trip.id, nom: 'Intrus', ville: 'X' });
      ok(r.status === 404, 'autre agence ne crée pas d’hôtel dans ce voyage');
      await db.query('DELETE FROM utilisateurs WHERE id=?', [ins.insertId]);
    }

    // nettoyage des données de test
    await call(A, 'DELETE', `/trips/${trip.id}`);
    await call(A, 'DELETE', `/vehicles/${bus.id}`);
    await db.query('DELETE FROM incidents WHERE id=?', [inc.id]);
    await db.query("DELETE FROM presences WHERE guide_id=? AND cree_le > NOW() - INTERVAL 1 HOUR", [by.encadreur.id]);
    await db.query("DELETE FROM scans_qr WHERE scanne_par=? AND cree_le > NOW() - INTERVAL 1 HOUR", [by.encadreur.id]);
  } finally {
    server.kill();
    await db.end();
  }
  console.log(`\n${pass} OK, ${failCount} échec(s)`);
  process.exit(failCount ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
