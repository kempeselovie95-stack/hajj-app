/**
 * Intégration automatique d'un pèlerin : dossier brouillon + groupe de son agence pour la saison.
 * Utilisé à l'inscription, à la création d'un dossier et à la connexion (comptes existants sans groupe).
 */
const { pool } = require('../config/database');

const GROUP_CAPACITY = Number(process.env.GROUP_CAPACITY || 40);

/** Agence par défaut : celle demandée si elle existe, sinon l'agence active qui a le plus de groupes ouverts. */
async function chooseAgency(connection, requestedId) {
  if (requestedId) {
    const [rows] = await connection.execute('SELECT id FROM agences WHERE id=?', [requestedId]);
    if (rows.length) return rows[0].id;
  }
  const [rows] = await connection.execute(
    `SELECT a.id FROM agences a LEFT JOIN groupes_pelerins g ON g.agence_id=a.id
     WHERE a.status='ACTIVE' GROUP BY a.id ORDER BY COUNT(g.id) DESC, a.id ASC LIMIT 1`
  );
  return rows[0]?.id ?? null;
}

/** Saison à venir (ou la plus récente) et son forfait le moins cher. */
async function chooseSeason(connection) {
  const [seasons] = await connection.execute('SELECT id, annee FROM saisons_hajj WHERE est_active=TRUE ORDER BY annee DESC LIMIT 1');
  if (!seasons.length) return { id: null, annee: new Date().getFullYear(), forfaitId: null };
  const [packages] = await connection.execute('SELECT id FROM forfaits WHERE saison_id=? AND est_actif=TRUE ORDER BY prix ASC LIMIT 1', [seasons[0].id]);
  return { id: seasons[0].id, annee: Number(seasons[0].annee), forfaitId: packages[0]?.id ?? null };
}

/** Place le pèlerin dans un groupe de l'agence pour l'année (en crée un si tous sont pleins). Retourne l'id du groupe. */
async function assignGroup(connection, pelerinId, agenceId, annee) {
  if (!agenceId) return null;
  const [existing] = await connection.execute(
    `SELECT g.id FROM groupe_membres m JOIN groupes_pelerins g ON g.id=m.groupe_id
     WHERE m.pelerin_id=? AND g.agence_id=? AND g.annee_hajj=? LIMIT 1`, [pelerinId, agenceId, annee]);
  if (existing.length) return existing[0].id;

  const [groups] = await connection.execute(
    `SELECT g.id, COUNT(m.pelerin_id) AS membres FROM groupes_pelerins g LEFT JOIN groupe_membres m ON m.groupe_id=g.id
     WHERE g.agence_id=? AND g.annee_hajj=? GROUP BY g.id HAVING membres < ? ORDER BY membres DESC, g.id ASC LIMIT 1 FOR UPDATE`,
    [agenceId, annee, GROUP_CAPACITY]);
  let groupId = groups[0]?.id;
  if (!groupId) {
    const [[count]] = await connection.execute('SELECT COUNT(*) AS total FROM groupes_pelerins WHERE agence_id=? AND annee_hajj=?', [agenceId, annee]);
    const [created] = await connection.execute('INSERT INTO groupes_pelerins (nom, annee_hajj, agence_id) VALUES (?,?,?)', [`Groupe ${Number(count.total) + 1} · Hajj ${annee}`, annee, agenceId]);
    groupId = created.insertId;
  }
  await connection.execute('INSERT IGNORE INTO groupe_membres (groupe_id, pelerin_id) VALUES (?,?)', [groupId, pelerinId]);
  return groupId;
}

/** Garantit qu'un pèlerin a un dossier et un groupe. Idempotent ; ne lève jamais d'erreur bloquante pour l'appelant. */
async function ensurePilgrimSetup(pelerinId, { agenceId = null } = {}) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    let [dossiers] = await connection.execute('SELECT id, agence_id, annee_hajj FROM dossiers WHERE pelerin_id=? ORDER BY id DESC LIMIT 1', [pelerinId]);
    let dossier = dossiers[0];
    if (!dossier) {
      const season = await chooseSeason(connection);
      const agency = await chooseAgency(connection, agenceId);
      const numero = `DOS-${season.annee}-${String(pelerinId).padStart(6, '0')}`;
      const [created] = await connection.execute(
        `INSERT INTO dossiers (pelerin_id,agence_id,numero_dossier,annee_hajj,statut,type_package,saison_id,forfait_id) VALUES (?,?,?,?,'brouillon','standard',?,?)`,
        [pelerinId, agency, numero, season.annee, season.id, season.forfaitId]);
      await connection.execute(`INSERT INTO historique_statuts (dossier_id,statut,commentaire,modifie_par) VALUES (?,'brouillon','Dossier créé automatiquement à l’inscription',?)`, [created.insertId, pelerinId]);
      dossier = { id: created.insertId, agence_id: agency, annee_hajj: season.annee };
    } else if (!dossier.agence_id) {
      const agency = await chooseAgency(connection, agenceId);
      if (agency) { await connection.execute('UPDATE dossiers SET agence_id=? WHERE id=?', [agency, dossier.id]); dossier.agence_id = agency; }
    }
    const groupId = await assignGroup(connection, pelerinId, dossier.agence_id, Number(dossier.annee_hajj));
    await connection.commit();
    return { dossierId: dossier.id, groupId };
  } catch (error) {
    await connection.rollback();
    console.error('[onboarding]', error.message);
    return { dossierId: null, groupId: null };
  } finally { connection.release(); }
}

/** Rattrape les pèlerins inscrits avant l'intégration automatique (sans dossier ni groupe) : ils deviennent visibles côté web. */
async function backfillPilgrims() {
  const [rows] = await pool.execute(
    `SELECT u.id FROM utilisateurs u WHERE u.role='pelerin' AND u.est_actif=TRUE
     AND (NOT EXISTS (SELECT 1 FROM dossiers d WHERE d.pelerin_id=u.id) OR NOT EXISTS (SELECT 1 FROM groupe_membres m WHERE m.pelerin_id=u.id)) LIMIT 500`);
  for (const row of rows) await ensurePilgrimSetup(row.id);
  return rows.length;
}

module.exports = { ensurePilgrimSetup, assignGroup, backfillPilgrims };
