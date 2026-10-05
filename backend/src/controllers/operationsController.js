/**
 * Opérations Hajj : voyages, vols, hôtels, chambres, véhicules, transports,
 * programme, présence, QR Code et incidents.
 *
 * Isolation multi-tenant : l'agence (organisation) est TOUJOURS déduite de
 * l'utilisateur authentifié ; un `agence_id` reçu du client n'est jamais
 * une preuve d'appartenance, il est revérifié contre le périmètre autorisé.
 */
const crypto = require('crypto');
const { pool } = require('../config/database');
const { audit } = require('../services/audit');

// ───────────────────────── Périmètre (multi-tenant) ─────────────────────────

/** null = toutes les agences (admin) ; sinon la liste des agences accessibles. */
async function agencyScope(user) {
  if (user.role === 'admin') return null;
  if (user.role === 'agence') {
    const [rows] = await pool.execute('SELECT id FROM agences WHERE utilisateur_id=?', [user.id]);
    return rows.map((row) => row.id);
  }
  if (user.role === 'encadreur') {
    const [rows] = await pool.execute('SELECT agence_id FROM encadreurs WHERE utilisateur_id=?', [user.id]);
    return rows.map((row) => row.agence_id);
  }
  return [];
}

const canAgency = (ids, agencyId) => ids === null || ids.map(Number).includes(Number(agencyId));

function scopeSql(expr, ids) {
  if (ids === null) return { sql: '1=1', params: [] };
  if (!ids.length) return { sql: '1=0', params: [] };
  return { sql: `${expr} IN (${ids.map(() => '?').join(',')})`, params: ids };
}

function fail(res, status, code, message, extra = {}) {
  return res.status(status).json({ succes: false, code, message, ...extra });
}

// ───────────────────────── Validation des champs ─────────────────────────

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_RE = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::(\d{2}))?$/;

function coerceField(spec, raw) {
  if (spec.type === 'str' || spec.type === 'text') {
    const value = String(raw).trim();
    if (value.length > (spec.max ?? (spec.type === 'text' ? 4000 : 255))) return { error: 'too_long' };
    return { value };
  }
  if (spec.type === 'int') {
    const value = Number(raw);
    if (!Number.isInteger(value) || value < (spec.min ?? 0) || value > (spec.max ?? 2147483647)) return { error: 'invalid_number' };
    return { value };
  }
  if (spec.type === 'decimal') {
    const value = Number(raw);
    if (!Number.isFinite(value) || value < (spec.min ?? -1e9) || value > (spec.max ?? 1e9)) return { error: 'invalid_number' };
    return { value };
  }
  if (spec.type === 'date') {
    if (!DATE_RE.test(raw) || Number.isNaN(new Date(`${raw}T00:00:00Z`).getTime())) return { error: 'invalid_date' };
    return { value: raw };
  }
  if (spec.type === 'datetime') {
    const match = DATETIME_RE.exec(String(raw));
    if (!match || Number.isNaN(new Date(`${match[1]}T${match[2]}:00Z`).getTime())) return { error: 'invalid_datetime' };
    return { value: `${match[1]} ${match[2]}:${match[3] ?? '00'}` };
  }
  if (spec.type === 'enum') {
    if (!spec.values.includes(raw)) return { error: 'invalid_choice' };
    return { value: raw };
  }
  return { error: 'unsupported' };
}

function coerce(fields, body, partial) {
  const values = {};
  const errors = [];
  for (const [name, spec] of Object.entries(fields)) {
    const raw = body[name];
    if (raw === undefined) {
      if (!partial && spec.required) errors.push({ champ: name, code: 'required' });
      continue;
    }
    if (raw === null || raw === '') {
      if (spec.required) errors.push({ champ: name, code: 'required' });
      else values[name] = null;
      continue;
    }
    const result = coerceField(spec, raw);
    if (result.error) errors.push({ champ: name, code: result.error });
    else values[name] = result.value;
  }
  return { values, errors };
}

// ───────────────────────── Définition des ressources ─────────────────────────

const AGENCY_OF_VOYAGE = '(SELECT v.agence_id FROM voyages v WHERE v.id=t.voyage_id)';
const D = (column) => `DATE_FORMAT(t.${column},'%Y-%m-%d') AS ${column}`;
const DT = (column) => `DATE_FORMAT(t.${column},'%Y-%m-%dT%H:%i') AS ${column}`;

const RESOURCES = {
  trips: {
    table: 'voyages', agenceExpr: 't.agence_id', owner: true, order: 't.date_depart DESC, t.id DESC', filters: ['agence_id'],
    select: `t.id, t.agence_id, t.saison_id, t.nom, ${D('date_depart')}, ${D('date_retour')}, t.description, t.statut,
      (SELECT a.nom_agence FROM agences a WHERE a.id=t.agence_id) AS nom_agence`,
    fields: {
      nom: { type: 'str', max: 150, required: true }, saison_id: { type: 'int', min: 1 }, date_depart: { type: 'date' }, date_retour: { type: 'date' },
      description: { type: 'text' }, statut: { type: 'enum', values: ['PLANNED', 'ONGOING', 'COMPLETED', 'CANCELLED'] },
    },
    check: (v) => (v.date_depart && v.date_retour && v.date_retour < v.date_depart ? 'date_retour' : null),
  },
  flights: {
    table: 'vols', parent: 'voyage_id', parentSql: 'SELECT agence_id FROM voyages WHERE id=?', agenceExpr: AGENCY_OF_VOYAGE, order: 't.depart_le ASC', filters: ['voyage_id'],
    select: `t.id, t.voyage_id, t.numero_vol, t.compagnie, t.aeroport_depart, t.aeroport_arrivee, ${DT('depart_le')}, ${DT('arrivee_le')}, t.terminal, t.statut,
      (SELECT GROUP_CONCAT(g.nom SEPARATOR ', ') FROM vol_groupes vg JOIN groupes_pelerins g ON g.id=vg.groupe_id WHERE vg.vol_id=t.id) AS groupes,
      (SELECT GROUP_CONCAT(vg.groupe_id) FROM vol_groupes vg WHERE vg.vol_id=t.id) AS groupe_ids`,
    fields: {
      numero_vol: { type: 'str', max: 20, required: true }, compagnie: { type: 'str', max: 100 }, aeroport_depart: { type: 'str', max: 100, required: true },
      aeroport_arrivee: { type: 'str', max: 100, required: true }, depart_le: { type: 'datetime', required: true }, arrivee_le: { type: 'datetime', required: true },
      terminal: { type: 'str', max: 30 }, statut: { type: 'enum', values: ['SCHEDULED', 'DELAYED', 'DEPARTED', 'ARRIVED', 'CANCELLED'] },
    },
    check: (v) => (v.depart_le && v.arrivee_le && v.arrivee_le < v.depart_le ? 'arrivee_le' : null),
  },
  hotels: {
    table: 'hotels', parent: 'voyage_id', parentSql: 'SELECT agence_id FROM voyages WHERE id=?', agenceExpr: AGENCY_OF_VOYAGE, order: 't.check_in ASC, t.id ASC', filters: ['voyage_id'],
    select: `t.id, t.voyage_id, t.nom, t.ville, t.adresse, t.telephone, ${D('check_in')}, ${D('check_out')},
      (SELECT COUNT(*) FROM chambres c WHERE c.hotel_id=t.id) AS total_chambres,
      (SELECT COALESCE(SUM(c.capacite),0) FROM chambres c WHERE c.hotel_id=t.id) AS capacite_totale,
      (SELECT COUNT(*) FROM chambre_occupants o WHERE o.hotel_id=t.id) AS occupants`,
    fields: {
      nom: { type: 'str', max: 150, required: true }, ville: { type: 'str', max: 100, required: true }, adresse: { type: 'str', max: 255 },
      telephone: { type: 'str', max: 30 }, check_in: { type: 'date' }, check_out: { type: 'date' },
    },
    check: (v) => (v.check_in && v.check_out && v.check_out < v.check_in ? 'check_out' : null),
  },
  rooms: {
    table: 'chambres', parent: 'hotel_id', agenceExpr: '(SELECT v.agence_id FROM hotels h JOIN voyages v ON v.id=h.voyage_id WHERE h.id=t.hotel_id)',
    parentSql: 'SELECT v.agence_id FROM hotels h JOIN voyages v ON v.id=h.voyage_id WHERE h.id=?', order: 'CAST(t.numero AS UNSIGNED), t.numero', filters: ['hotel_id'],
    select: 't.id, t.hotel_id, t.numero, t.capacite',
    fields: { numero: { type: 'str', max: 20, required: true }, capacite: { type: 'int', min: 1, max: 20, required: true } },
  },
  vehicles: {
    table: 'vehicules', agenceExpr: 't.agence_id', owner: true, order: 't.nom ASC', filters: ['agence_id'],
    select: 't.id, t.agence_id, t.nom, t.immatriculation, t.capacite, t.chauffeur_nom, t.chauffeur_telephone',
    fields: {
      nom: { type: 'str', max: 100, required: true }, immatriculation: { type: 'str', max: 30 }, capacite: { type: 'int', min: 1, max: 1000, required: true },
      chauffeur_nom: { type: 'str', max: 120 }, chauffeur_telephone: { type: 'str', max: 30 },
    },
  },
  transports: {
    table: 'transports', parent: 'voyage_id', parentSql: 'SELECT agence_id FROM voyages WHERE id=?', agenceExpr: AGENCY_OF_VOYAGE, order: 't.depart_le ASC', filters: ['voyage_id'],
    select: `t.id, t.voyage_id, t.vehicule_id, t.groupe_id, t.lieu_depart, t.destination, ${DT('depart_le')},
      (SELECT ve.nom FROM vehicules ve WHERE ve.id=t.vehicule_id) AS vehicule_nom, (SELECT ve.capacite FROM vehicules ve WHERE ve.id=t.vehicule_id) AS vehicule_capacite,
      (SELECT g.nom FROM groupes_pelerins g WHERE g.id=t.groupe_id) AS groupe_nom`,
    fields: {
      vehicule_id: { type: 'int', min: 1 }, groupe_id: { type: 'int', min: 1 }, lieu_depart: { type: 'str', max: 150, required: true },
      destination: { type: 'str', max: 150, required: true }, depart_le: { type: 'datetime', required: true },
    },
  },
  places: {
    table: 'lieux', agenceExpr: 't.agence_id', owner: true, allowGlobal: true, includeGlobal: true, order: 't.type, t.nom', filters: ['agence_id'],
    select: 't.id, t.agence_id, t.nom, t.type, CAST(t.latitude AS DOUBLE) AS latitude, CAST(t.longitude AS DOUBLE) AS longitude, t.adresse, t.description',
    fields: {
      nom: { type: 'str', max: 150, required: true }, type: { type: 'enum', values: ['HOTEL', 'HOLY_SITE', 'MEETING', 'HOSPITAL', 'AIRPORT', 'OTHER'] },
      latitude: { type: 'decimal', min: -90, max: 90, required: true }, longitude: { type: 'decimal', min: -180, max: 180, required: true },
      adresse: { type: 'str', max: 255 }, description: { type: 'text' },
    },
  },
  program: {
    table: 'programme_evenements', parent: 'voyage_id', parentSql: 'SELECT agence_id FROM voyages WHERE id=?', agenceExpr: AGENCY_OF_VOYAGE, order: 't.debut_le ASC', filters: ['voyage_id'],
    select: `t.id, t.voyage_id, t.groupe_id, t.titre, t.type, t.lieu, ${DT('debut_le')}, t.description, (SELECT g.nom FROM groupes_pelerins g WHERE g.id=t.groupe_id) AS groupe_nom`,
    fields: {
      groupe_id: { type: 'int', min: 1 }, titre: { type: 'str', max: 200, required: true }, type: { type: 'enum', values: ['FLIGHT', 'HOTEL', 'TRANSPORT', 'RITUAL', 'VISIT', 'OTHER'] },
      lieu: { type: 'str', max: 150 }, debut_le: { type: 'datetime', required: true }, description: { type: 'text' },
    },
  },
};

/** Vérifie que les références (groupe, véhicule, saison) appartiennent bien à l'agence concernée. */
async function checkReferences(values, agencyId) {
  if (values.groupe_id != null) {
    const [rows] = await pool.execute('SELECT 1 FROM groupes_pelerins WHERE id=? AND agence_id=?', [values.groupe_id, agencyId]);
    if (!rows.length) return 'groupe_id';
  }
  if (values.vehicule_id != null) {
    const [rows] = await pool.execute('SELECT 1 FROM vehicules WHERE id=? AND agence_id=?', [values.vehicule_id, agencyId]);
    if (!rows.length) return 'vehicule_id';
  }
  if (values.saison_id != null) {
    const [rows] = await pool.execute('SELECT 1 FROM saisons_hajj WHERE id=?', [values.saison_id]);
    if (!rows.length) return 'saison_id';
  }
  return null;
}

async function resolveOwnerAgency(user, ids, requested) {
  if (user.role === 'admin') {
    const id = Number(requested);
    if (!Number.isInteger(id) || id < 1) return null;
    const [rows] = await pool.execute('SELECT id FROM agences WHERE id=?', [id]);
    return rows.length ? id : null;
  }
  if (requested != null && requested !== '' && !canAgency(ids, requested)) return null;
  return ids[0] ?? null;
}

async function fetchOne(resource, id) {
  const [rows] = await pool.execute(`SELECT ${resource.select} FROM ${resource.table} t WHERE t.id=?`, [id]);
  return rows[0] || null;
}

function listResource(name) {
  const resource = RESOURCES[name];
  return async (req, res, next) => {
    try {
      let ids = await agencyScope(req.utilisateur);
      if (req.utilisateur.role === 'pelerin') {
        // Le pèlerin ne lit que les lieux (communs à toutes les agences + ceux de son agence).
        if (name !== 'places') return fail(res, 403, 'FORBIDDEN', 'Accès refusé');
        const [own] = await pool.execute('SELECT DISTINCT agence_id FROM dossiers WHERE pelerin_id=? AND agence_id IS NOT NULL', [req.utilisateur.id]);
        ids = own.map((row) => row.agence_id);
      }
      const scope = scopeSql(resource.agenceExpr, ids);
      let where = resource.includeGlobal && ids !== null ? `(${scope.sql} OR t.agence_id IS NULL)` : scope.sql;
      const params = [...scope.params];
      for (const filter of resource.filters || []) {
        if (req.query[filter] !== undefined && req.query[filter] !== '') {
          where += ` AND t.${filter}=?`;
          params.push(Number(req.query[filter]));
        }
      }
      const [items] = await pool.execute(`SELECT ${resource.select} FROM ${resource.table} t WHERE ${where} ORDER BY ${resource.order} LIMIT 500`, params);
      res.json({ succes: true, items });
    } catch (error) { next(error); }
  };
}

function createResource(name) {
  const resource = RESOURCES[name];
  return async (req, res, next) => {
    try {
      const { values, errors } = coerce(resource.fields, req.body || {}, false);
      if (errors.length) return fail(res, 400, 'VALIDATION_ERROR', 'Données invalides', { erreurs: errors });
      const ids = await agencyScope(req.utilisateur);
      let agencyId;
      const columns = { ...values };
      if (resource.owner) {
        const globalPlace = resource.allowGlobal && req.utilisateur.role === 'admin' && (req.body.agence_id === undefined || req.body.agence_id === null || req.body.agence_id === '');
        agencyId = globalPlace ? null : await resolveOwnerAgency(req.utilisateur, ids, req.body.agence_id);
        if (!agencyId && !globalPlace) return fail(res, 403, 'AGENCY_FORBIDDEN', 'Agence non autorisée');
        columns.agence_id = agencyId;
      } else {
        const parentId = Number(req.body[resource.parent]);
        if (!Number.isInteger(parentId) || parentId < 1) return fail(res, 400, 'VALIDATION_ERROR', 'Données invalides', { erreurs: [{ champ: resource.parent, code: 'required' }] });
        const [parents] = await pool.execute(resource.parentSql, [parentId]);
        // 404 volontaire si hors périmètre : on ne révèle pas l'existence d'une ressource d'une autre agence.
        if (!parents.length || !canAgency(ids, parents[0].agence_id)) return fail(res, 404, 'NOT_FOUND', 'Ressource introuvable');
        agencyId = parents[0].agence_id;
        columns[resource.parent] = parentId;
      }
      const invalid = resource.check?.(values) || (await checkReferences(values, agencyId));
      if (invalid) return fail(res, 400, 'VALIDATION_ERROR', 'Données invalides', { erreurs: [{ champ: invalid, code: 'invalid_reference' }] });
      const names = Object.keys(columns);
      const [result] = await pool.execute(`INSERT INTO ${resource.table} (${names.join(',')}) VALUES (${names.map(() => '?').join(',')})`, names.map((n) => columns[n]));
      await audit(req, 'create', resource.table, result.insertId, values);
      res.status(201).json({ succes: true, item: await fetchOne(resource, result.insertId) });
    } catch (error) { next(error); }
  };
}

function updateResource(name) {
  const resource = RESOURCES[name];
  return async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const ids = await agencyScope(req.utilisateur);
      const [rows] = await pool.execute(`SELECT ${resource.agenceExpr} AS agence_id FROM ${resource.table} t WHERE t.id=?`, [id]);
      if (!rows.length || !canAgency(ids, rows[0].agence_id)) return fail(res, 404, 'NOT_FOUND', 'Ressource introuvable');
      const { values, errors } = coerce(resource.fields, req.body || {}, true);
      if (errors.length) return fail(res, 400, 'VALIDATION_ERROR', 'Données invalides', { erreurs: errors });
      if (!Object.keys(values).length) return fail(res, 400, 'VALIDATION_ERROR', 'Aucune modification fournie');
      const invalid = await checkReferences(values, rows[0].agence_id);
      if (invalid) return fail(res, 400, 'VALIDATION_ERROR', 'Données invalides', { erreurs: [{ champ: invalid, code: 'invalid_reference' }] });
      if (resource.check) {
        const merged = { ...(await fetchOne(resource, id)), ...values };
        const inconsistent = resource.check(merged);
        if (inconsistent) return fail(res, 400, 'VALIDATION_ERROR', 'Données invalides', { erreurs: [{ champ: inconsistent, code: 'inconsistent' }] });
      }
      const names = Object.keys(values);
      await pool.execute(`UPDATE ${resource.table} SET ${names.map((n) => `${n}=?`).join(',')} WHERE id=?`, [...names.map((n) => values[n]), id]);
      await audit(req, 'update', resource.table, id, values);
      res.json({ succes: true, item: await fetchOne(resource, id) });
    } catch (error) { next(error); }
  };
}

function deleteResource(name) {
  const resource = RESOURCES[name];
  return async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const ids = await agencyScope(req.utilisateur);
      const [rows] = await pool.execute(`SELECT ${resource.agenceExpr} AS agence_id FROM ${resource.table} t WHERE t.id=?`, [id]);
      if (!rows.length || !canAgency(ids, rows[0].agence_id)) return fail(res, 404, 'NOT_FOUND', 'Ressource introuvable');
      await pool.execute(`DELETE FROM ${resource.table} WHERE id=?`, [id]);
      await audit(req, 'delete', resource.table, id);
      res.json({ succes: true });
    } catch (error) { next(error); }
  };
}

// ───────────────────────── Vols ↔ groupes ─────────────────────────

const setFlightGroups = async (req, res, next) => {
  try {
    const flightId = Number(req.params.id);
    const groupIds = [...new Set((req.body.groupe_ids || []).map(Number))];
    if (!groupIds.every((value) => Number.isInteger(value) && value > 0)) return fail(res, 400, 'VALIDATION_ERROR', 'Données invalides');
    const ids = await agencyScope(req.utilisateur);
    const [flights] = await pool.execute(`SELECT ${AGENCY_OF_VOYAGE} AS agence_id FROM vols t WHERE t.id=?`, [flightId]);
    if (!flights.length || !canAgency(ids, flights[0].agence_id)) return fail(res, 404, 'NOT_FOUND', 'Ressource introuvable');
    if (groupIds.length) {
      const [valid] = await pool.execute(`SELECT id FROM groupes_pelerins WHERE agence_id=? AND id IN (${groupIds.map(() => '?').join(',')})`, [flights[0].agence_id, ...groupIds]);
      if (valid.length !== groupIds.length) return fail(res, 400, 'VALIDATION_ERROR', 'Données invalides', { erreurs: [{ champ: 'groupe_ids', code: 'invalid_reference' }] });
    }
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute('DELETE FROM vol_groupes WHERE vol_id=?', [flightId]);
      for (const groupId of groupIds) await connection.execute('INSERT INTO vol_groupes (vol_id, groupe_id) VALUES (?,?)', [flightId, groupId]);
      await connection.commit();
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
    await audit(req, 'update', 'vol_groupes', flightId, { groupe_ids: groupIds });
    res.json({ succes: true, item: await fetchOne(RESOURCES.flights, flightId) });
  } catch (error) { next(error); }
};

// ───────────────────────── Chambres ↔ pèlerins ─────────────────────────

async function loadRoom(req, roomId) {
  const ids = await agencyScope(req.utilisateur);
  const [rows] = await pool.execute(`SELECT t.id, t.hotel_id, t.capacite, ${RESOURCES.rooms.agenceExpr} AS agence_id FROM chambres t WHERE t.id=?`, [roomId]);
  if (!rows.length || !canAgency(ids, rows[0].agence_id)) return null;
  return rows[0];
}

const listRoomOccupants = async (req, res, next) => {
  try {
    const hotelId = Number(req.params.hotelId);
    const ids = await agencyScope(req.utilisateur);
    const [hotels] = await pool.execute(`SELECT ${AGENCY_OF_VOYAGE} AS agence_id FROM hotels t WHERE t.id=?`, [hotelId]);
    if (!hotels.length || !canAgency(ids, hotels[0].agence_id)) return fail(res, 404, 'NOT_FOUND', 'Ressource introuvable');
    const [rooms] = await pool.execute(`SELECT ${RESOURCES.rooms.select} FROM chambres t WHERE t.hotel_id=? ORDER BY ${RESOURCES.rooms.order}`, [hotelId]);
    const [occupants] = await pool.execute(
      `SELECT o.chambre_id, u.id, u.prenom, u.nom FROM chambre_occupants o JOIN utilisateurs u ON u.id=o.pelerin_id WHERE o.hotel_id=? ORDER BY u.nom, u.prenom`, [hotelId]);
    const [unassigned] = await pool.execute(
      `SELECT u.id, u.prenom, u.nom FROM dossiers d JOIN utilisateurs u ON u.id=d.pelerin_id
       WHERE d.agence_id=? AND d.statut<>'annule' AND u.id NOT IN (SELECT pelerin_id FROM chambre_occupants WHERE hotel_id=?)
       GROUP BY u.id, u.prenom, u.nom ORDER BY u.nom, u.prenom LIMIT 500`, [hotels[0].agence_id, hotelId]);
    res.json({ succes: true, items: rooms.map((room) => ({ ...room, occupants: occupants.filter((o) => o.chambre_id === room.id) })), non_affectes: unassigned });
  } catch (error) { next(error); }
};

const assignOccupant = async (req, res, next) => {
  try {
    const roomId = Number(req.params.id);
    const pilgrimId = Number(req.body.pelerin_id);
    if (!Number.isInteger(pilgrimId) || pilgrimId < 1) return fail(res, 400, 'VALIDATION_ERROR', 'Données invalides');
    const room = await loadRoom(req, roomId);
    if (!room) return fail(res, 404, 'NOT_FOUND', 'Ressource introuvable');
    const [pilgrim] = await pool.execute('SELECT 1 FROM dossiers WHERE pelerin_id=? AND agence_id=?', [pilgrimId, room.agence_id]);
    if (!pilgrim.length) return fail(res, 404, 'NOT_FOUND', 'Pèlerin introuvable');
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [full] = await connection.execute(
        'SELECT COUNT(*) AS total, SUM(pelerin_id=?) AS deja FROM chambre_occupants WHERE chambre_id=? FOR UPDATE', [pilgrimId, roomId]);
      if (Number(full[0].deja) > 0) { await connection.rollback(); return res.json({ succes: true }); }
      if (Number(full[0].total) >= room.capacite) { await connection.rollback(); return fail(res, 409, 'ROOM_FULL', 'Chambre complète'); }
      await connection.execute('DELETE FROM chambre_occupants WHERE hotel_id=? AND pelerin_id=?', [room.hotel_id, pilgrimId]); // un pèlerin = une chambre par hôtel
      await connection.execute('INSERT INTO chambre_occupants (chambre_id, pelerin_id, hotel_id) VALUES (?,?,?)', [roomId, pilgrimId, room.hotel_id]);
      await connection.commit();
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
    await audit(req, 'assign', 'chambre_occupants', roomId, { pelerin_id: pilgrimId });
    res.status(201).json({ succes: true });
  } catch (error) { next(error); }
};

const removeOccupant = async (req, res, next) => {
  try {
    const room = await loadRoom(req, Number(req.params.id));
    if (!room) return fail(res, 404, 'NOT_FOUND', 'Ressource introuvable');
    await pool.execute('DELETE FROM chambre_occupants WHERE chambre_id=? AND pelerin_id=?', [room.id, Number(req.params.pelerinId)]);
    await audit(req, 'unassign', 'chambre_occupants', room.id, { pelerin_id: Number(req.params.pelerinId) });
    res.json({ succes: true });
  } catch (error) { next(error); }
};

// ───────────────────────── Accès aux groupes (présence, incidents) ─────────────────────────

async function accessibleGroup(user, groupId) {
  const [rows] = await pool.execute(
    `SELECT g.id, g.nom, g.annee_hajj, g.agence_id, g.encadreur_id FROM groupes_pelerins g WHERE g.id=?`, [groupId]);
  const group = rows[0];
  if (!group) return null;
  if (user.role === 'admin') return group;
  if (user.role === 'encadreur') return Number(group.encadreur_id) === Number(user.id) ? group : null;
  if (user.role === 'agence') {
    const ids = await agencyScope(user);
    return canAgency(ids, group.agence_id) ? group : null;
  }
  return null;
}

const groupCode = (group) => `CAM-${group.annee_hajj}-${String(group.id).padStart(3, '0')}`;

// ───────────────────────── Présence ─────────────────────────

const PRESENCE_TYPES = ['PRESENT', 'ABSENT', 'TO_CHECK', 'BOARDING', 'TRANSPORT', 'ARRIVAL', 'ASSISTANCE'];

const getAttendance = async (req, res, next) => {
  try {
    const group = await accessibleGroup(req.utilisateur, Number(req.params.groupId));
    if (!group) return fail(res, 404, 'NOT_FOUND', 'Groupe introuvable ou accès refusé');
    // Dernier statut d'appel (PRESENT/ABSENT/TO_CHECK) du jour, par pèlerin.
    const [members] = await pool.execute(
      `SELECT u.id, u.prenom, u.nom, u.telephone,
        (SELECT p.type_evenement FROM presences p WHERE p.groupe_id=gm.groupe_id AND p.pelerin_id=u.id AND p.type_evenement IN ('PRESENT','ABSENT','TO_CHECK')
           AND DATE(p.cree_le)=UTC_DATE() ORDER BY p.id DESC LIMIT 1) AS statut,
        (SELECT DATE_FORMAT(p.cree_le,'%Y-%m-%dT%H:%i:%sZ') FROM presences p WHERE p.groupe_id=gm.groupe_id AND p.pelerin_id=u.id ORDER BY p.id DESC LIMIT 1) AS dernier_evenement
       FROM groupe_membres gm JOIN utilisateurs u ON u.id=gm.pelerin_id WHERE gm.groupe_id=? ORDER BY u.nom, u.prenom`, [group.id]);
    const counts = { PRESENT: 0, ABSENT: 0, TO_CHECK: 0, PENDING: 0 };
    for (const member of members) counts[member.statut || 'PENDING'] += 1;
    res.json({ succes: true, groupe: { id: group.id, nom: group.nom, code: groupCode(group) }, membres: members, compteurs: counts });
  } catch (error) { next(error); }
};

const recordAttendance = async (req, res, next) => {
  try {
    const { groupe_id: groupId, pelerin_id: pilgrimId, type_evenement: type, lieu } = req.body || {};
    if (!PRESENCE_TYPES.includes(type) || !Number.isInteger(Number(groupId)) || !Number.isInteger(Number(pilgrimId))) return fail(res, 400, 'VALIDATION_ERROR', 'Données invalides');
    const group = await accessibleGroup(req.utilisateur, Number(groupId));
    if (!group) return fail(res, 404, 'NOT_FOUND', 'Groupe introuvable ou accès refusé');
    const [member] = await pool.execute('SELECT 1 FROM groupe_membres WHERE groupe_id=? AND pelerin_id=?', [group.id, Number(pilgrimId)]);
    if (!member.length) return fail(res, 404, 'NOT_FOUND', 'Pèlerin absent du groupe');
    const [result] = await pool.execute('INSERT INTO presences (groupe_id, pelerin_id, guide_id, type_evenement, lieu) VALUES (?,?,?,?,?)',
      [group.id, Number(pilgrimId), req.utilisateur.id, type, lieu ? String(lieu).slice(0, 150) : null]);
    await audit(req, 'attendance', 'presences', result.insertId, { groupe_id: group.id, pelerin_id: Number(pilgrimId), type });
    res.status(201).json({ succes: true, id: result.insertId });
  } catch (error) { next(error); }
};

// ───────────────────────── QR Code ─────────────────────────

const publicPilgrimCode = (dossier) => `HAJJ-CM-${dossier.annee_hajj}-${String(dossier.id).padStart(6, '0')}`;

async function ensureQrToken(dossier) {
  if (dossier.qr_token) return dossier.qr_token;
  const token = crypto.randomBytes(24).toString('hex');
  await pool.execute('UPDATE dossiers SET qr_token=? WHERE id=? AND qr_token IS NULL', [token, dossier.id]);
  const [rows] = await pool.execute('SELECT qr_token FROM dossiers WHERE id=?', [dossier.id]);
  return rows[0].qr_token;
}

async function latestDossier(pilgrimId) {
  const [rows] = await pool.execute('SELECT id, pelerin_id, agence_id, annee_hajj, statut, qr_token FROM dossiers WHERE pelerin_id=? ORDER BY annee_hajj DESC, id DESC LIMIT 1', [pilgrimId]);
  return rows[0] || null;
}

const getMyQr = async (req, res, next) => {
  try {
    const dossier = await latestDossier(req.utilisateur.id);
    if (!dossier) return fail(res, 404, 'NOT_FOUND', 'Aucun dossier');
    res.json({ succes: true, code: publicPilgrimCode(dossier), token: await ensureQrToken(dossier) });
  } catch (error) { next(error); }
};

const getPilgrimQr = async (req, res, next) => {
  try {
    const dossier = await latestDossier(Number(req.params.pelerinId));
    const ids = await agencyScope(req.utilisateur);
    if (!dossier || !canAgency(ids, dossier.agence_id)) return fail(res, 404, 'NOT_FOUND', 'Pèlerin introuvable');
    res.json({ succes: true, code: publicPilgrimCode(dossier), token: await ensureQrToken(dossier) });
  } catch (error) { next(error); }
};

const SCAN_PURPOSES = ['CONTROL', 'PRESENCE', 'BOARDING', 'TRANSPORT', 'ARRIVAL', 'ASSISTANCE'];

const scanQr = async (req, res, next) => {
  try {
    const token = String(req.body?.token || '').trim();
    const purpose = SCAN_PURPOSES.includes(req.body?.motif) ? req.body.motif : 'CONTROL';
    if (!/^[a-f0-9]{48}$/.test(token)) return fail(res, 400, 'INVALID_QR', 'QR Code invalide');
    const [rows] = await pool.execute(
      `SELECT d.id, d.pelerin_id, d.agence_id, d.annee_hajj, d.statut, u.prenom, u.nom, u.telephone FROM dossiers d JOIN utilisateurs u ON u.id=d.pelerin_id WHERE d.qr_token=?`, [token]);
    const ids = await agencyScope(req.utilisateur);
    if (!rows.length || !canAgency(ids, rows[0].agence_id)) return fail(res, 404, 'QR_NOT_FOUND', 'QR Code inconnu');
    const dossier = rows[0];
    const [groups] = await pool.execute(
      `SELECT g.id, g.nom, g.annee_hajj, g.encadreur_id, CONCAT(e.prenom,' ',e.nom) AS guide_nom, e.telephone AS guide_telephone
       FROM groupe_membres gm JOIN groupes_pelerins g ON g.id=gm.groupe_id LEFT JOIN utilisateurs e ON e.id=g.encadreur_id
       WHERE gm.pelerin_id=? AND g.annee_hajj=? LIMIT 1`, [dossier.pelerin_id, dossier.annee_hajj]);
    const group = groups[0] || null;
    const lieu = req.body?.lieu ? String(req.body.lieu).slice(0, 150) : null;
    await pool.execute('INSERT INTO scans_qr (pelerin_id, scanne_par, motif, lieu) VALUES (?,?,?,?)', [dossier.pelerin_id, req.utilisateur.id, purpose, lieu]);
    await audit(req, 'qr_scan', 'dossiers', dossier.id, { motif: purpose });
    let attendanceRecorded = false;
    const allowedGroup = group && (await accessibleGroup(req.utilisateur, group.id));
    if (purpose !== 'CONTROL' && allowedGroup) {
      await pool.execute('INSERT INTO presences (groupe_id, pelerin_id, guide_id, type_evenement, lieu) VALUES (?,?,?,?,?)',
        [group.id, dossier.pelerin_id, req.utilisateur.id, purpose === 'PRESENCE' ? 'PRESENT' : purpose, lieu]);
      attendanceRecorded = true;
    }
    res.json({
      succes: true,
      pelerin: { id: dossier.pelerin_id, prenom: dossier.prenom, nom: dossier.nom, code: publicPilgrimCode(dossier), statut: dossier.statut },
      groupe: group ? { id: group.id, nom: group.nom, code: groupCode(group), guide: group.guide_nom || null } : null,
      motif: purpose,
      presence_enregistree: attendanceRecorded,
    });
  } catch (error) { next(error); }
};

// ───────────────────────── Incidents ─────────────────────────

const INCIDENT_SELECT = `i.id, i.agence_id, i.groupe_id, i.pelerin_id, i.categorie, i.description, i.priorite, i.statut,
  DATE_FORMAT(i.cree_le,'%Y-%m-%dT%H:%i:%sZ') AS cree_le, DATE_FORMAT(i.resolu_le,'%Y-%m-%dT%H:%i:%sZ') AS resolu_le,
  g.nom AS groupe_nom, CONCAT(p.prenom,' ',p.nom) AS pelerin_nom, CONCAT(r.prenom,' ',r.nom) AS signale_par_nom`;
const INCIDENT_FROM = `incidents i JOIN groupes_pelerins g ON g.id=i.groupe_id LEFT JOIN utilisateurs p ON p.id=i.pelerin_id JOIN utilisateurs r ON r.id=i.signale_par`;

const listIncidents = async (req, res, next) => {
  try {
    const ids = await agencyScope(req.utilisateur);
    const scope = scopeSql('i.agence_id', ids);
    let where = scope.sql;
    const params = [...scope.params];
    if (req.utilisateur.role === 'encadreur') { where += ' AND g.encadreur_id=?'; params.push(req.utilisateur.id); }
    if (['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(req.query.statut)) { where += ' AND i.statut=?'; params.push(req.query.statut); }
    const [items] = await pool.execute(`SELECT ${INCIDENT_SELECT} FROM ${INCIDENT_FROM} WHERE ${where} ORDER BY FIELD(i.statut,'OPEN','IN_PROGRESS','RESOLVED','CLOSED'), i.cree_le DESC LIMIT 300`, params);
    res.json({ succes: true, items });
  } catch (error) { next(error); }
};

const CATEGORIES = ['MEDICAL', 'LOST_PERSON', 'TRANSPORT', 'DOCUMENT', 'ACCOMMODATION', 'SECURITY', 'OTHER'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

const createIncident = async (req, res, next) => {
  try {
    const { groupe_id: groupId, pelerin_id: pilgrimId, categorie, description, priorite } = req.body || {};
    const text = String(description || '').trim();
    if (!CATEGORIES.includes(categorie) || !text || text.length > 4000 || (priorite && !PRIORITIES.includes(priorite)) || !Number.isInteger(Number(groupId))) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Données invalides');
    }
    const group = await accessibleGroup(req.utilisateur, Number(groupId));
    if (!group) return fail(res, 404, 'NOT_FOUND', 'Groupe introuvable ou accès refusé');
    let pilgrim = null;
    if (pilgrimId) {
      const [member] = await pool.execute('SELECT 1 FROM groupe_membres WHERE groupe_id=? AND pelerin_id=?', [group.id, Number(pilgrimId)]);
      if (!member.length) return fail(res, 400, 'VALIDATION_ERROR', 'Données invalides', { erreurs: [{ champ: 'pelerin_id', code: 'invalid_reference' }] });
      pilgrim = Number(pilgrimId);
    }
    const [result] = await pool.execute(
      'INSERT INTO incidents (agence_id, groupe_id, pelerin_id, signale_par, categorie, description, priorite) VALUES (?,?,?,?,?,?,?)',
      [group.agence_id, group.id, pilgrim, req.utilisateur.id, categorie, text, priorite || 'MEDIUM']);
    // Alerte l'agence (boîte de notifications interne).
    const [agency] = await pool.execute('SELECT utilisateur_id FROM agences WHERE id=?', [group.agence_id]);
    if (agency.length && Number(agency[0].utilisateur_id) !== Number(req.utilisateur.id)) {
      await pool.execute('INSERT INTO notifications (destinataire_id, titre, corps, type) VALUES (?,?,?,?)',
        [agency[0].utilisateur_id, `Incident ${categorie} — ${group.nom}`, text.slice(0, 500), 'info']);
    }
    await audit(req, 'create', 'incidents', result.insertId, { categorie, priorite: priorite || 'MEDIUM', groupe_id: group.id });
    const [created] = await pool.execute(`SELECT ${INCIDENT_SELECT} FROM ${INCIDENT_FROM} WHERE i.id=?`, [result.insertId]);
    res.status(201).json({ succes: true, item: created[0] });
  } catch (error) { next(error); }
};

const updateIncident = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const ids = await agencyScope(req.utilisateur);
    const [rows] = await pool.execute('SELECT agence_id FROM incidents WHERE id=?', [id]);
    if (!rows.length || !canAgency(ids, rows[0].agence_id)) return fail(res, 404, 'NOT_FOUND', 'Ressource introuvable');
    const { statut, priorite } = req.body || {};
    if ((statut && !['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(statut)) || (priorite && !PRIORITIES.includes(priorite)) || (!statut && !priorite)) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Données invalides');
    }
    const sets = [];
    const params = [];
    if (statut) { sets.push('statut=?'); params.push(statut); sets.push(['RESOLVED', 'CLOSED'].includes(statut) ? 'resolu_le=COALESCE(resolu_le, UTC_TIMESTAMP())' : 'resolu_le=NULL'); }
    if (priorite) { sets.push('priorite=?'); params.push(priorite); }
    await pool.execute(`UPDATE incidents SET ${sets.join(',')} WHERE id=?`, [...params, id]);
    await audit(req, 'update', 'incidents', id, { statut, priorite });
    const [updated] = await pool.execute(`SELECT ${INCIDENT_SELECT} FROM ${INCIDENT_FROM} WHERE i.id=?`, [id]);
    res.json({ succes: true, item: updated[0] });
  } catch (error) { next(error); }
};

// ───────────────────────── Espace pèlerin : « mon voyage » ─────────────────────────

const getMyTrip = async (req, res, next) => {
  try {
    const userId = req.utilisateur.id;
    const dossier = await latestDossier(userId);
    const [groups] = await pool.execute(
      `SELECT g.id, g.nom, g.annee_hajj, CONCAT(e.prenom,' ',e.nom) AS guide_nom, e.telephone AS guide_telephone
       FROM groupe_membres gm JOIN groupes_pelerins g ON g.id=gm.groupe_id LEFT JOIN utilisateurs e ON e.id=g.encadreur_id WHERE gm.pelerin_id=? ORDER BY g.annee_hajj DESC`, [userId]);
    const groupIds = groups.map((g) => g.id);
    const inGroups = groupIds.length ? groupIds.map(() => '?').join(',') : 'NULL';
    const [flights] = await pool.execute(
      `SELECT DISTINCT t.id, t.numero_vol, t.compagnie, t.aeroport_depart, t.aeroport_arrivee, ${DT('depart_le')}, ${DT('arrivee_le')}, t.terminal, t.statut
       FROM vols t JOIN vol_groupes vg ON vg.vol_id=t.id WHERE vg.groupe_id IN (${inGroups}) ORDER BY depart_le`, groupIds);
    const [hotels] = await pool.execute(
      `SELECT t.id, t.nom, t.ville, t.adresse, t.telephone, ${D('check_in')}, ${D('check_out')}, c.numero AS chambre
       FROM chambre_occupants o JOIN chambres c ON c.id=o.chambre_id JOIN hotels t ON t.id=o.hotel_id WHERE o.pelerin_id=? ORDER BY check_in`, [userId]);
    const [transports] = await pool.execute(
      `SELECT t.id, t.lieu_depart, t.destination, ${DT('depart_le')}, (SELECT ve.nom FROM vehicules ve WHERE ve.id=t.vehicule_id) AS vehicule_nom,
        (SELECT ve.chauffeur_nom FROM vehicules ve WHERE ve.id=t.vehicule_id) AS chauffeur_nom, (SELECT ve.chauffeur_telephone FROM vehicules ve WHERE ve.id=t.vehicule_id) AS chauffeur_telephone
       FROM transports t WHERE t.groupe_id IN (${inGroups}) ORDER BY depart_le`, groupIds);
    // Programme : événements de mon groupe + événements généraux des voyages auxquels je suis rattaché.
    const [program] = await pool.execute(
      `SELECT t.id, t.titre, t.type, t.lieu, ${DT('debut_le')}, t.description FROM programme_evenements t
       WHERE t.groupe_id IN (${inGroups})
          OR (t.groupe_id IS NULL AND t.voyage_id IN (
               SELECT v.voyage_id FROM vols v JOIN vol_groupes vg ON vg.vol_id=v.id WHERE vg.groupe_id IN (${inGroups})
               UNION SELECT h.voyage_id FROM hotels h JOIN chambre_occupants o ON o.hotel_id=h.id WHERE o.pelerin_id=?
               UNION SELECT tr.voyage_id FROM transports tr WHERE tr.groupe_id IN (${inGroups})))
       ORDER BY debut_le`, [...groupIds, ...groupIds, userId, ...groupIds]);
    res.json({
      succes: true,
      dossier: dossier ? { code: publicPilgrimCode(dossier), statut: dossier.statut, annee_hajj: dossier.annee_hajj } : null,
      groupe: groups[0] ? { id: groups[0].id, nom: groups[0].nom, code: groupCode(groups[0]), guide: groups[0].guide_nom || null, guide_telephone: groups[0].guide_telephone || null } : null,
      vols: flights, hotels, transports, programme: program,
    });
  } catch (error) { next(error); }
};

// ───────────────────────── Journal d'audit (lecture) ─────────────────────────

const listAudit = async (req, res, next) => {
  try {
    const [items] = await pool.execute(
      `SELECT a.id, a.action, a.entite, a.entite_id, a.details, a.ip, DATE_FORMAT(a.cree_le,'%Y-%m-%dT%H:%i:%sZ') AS cree_le, CONCAT(u.prenom,' ',u.nom) AS utilisateur
       FROM journal_audit a LEFT JOIN utilisateurs u ON u.id=a.utilisateur_id ORDER BY a.id DESC LIMIT 200`);
    res.json({ succes: true, items });
  } catch (error) { next(error); }
};

module.exports = {
  RESOURCE_NAMES: Object.keys(RESOURCES),
  listResource, createResource, updateResource, deleteResource,
  setFlightGroups, listRoomOccupants, assignOccupant, removeOccupant,
  getAttendance, recordAttendance, getMyQr, getPilgrimQr, scanQr,
  listIncidents, createIncident, updateIncident, getMyTrip, listAudit,
};
