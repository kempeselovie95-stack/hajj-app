/** Espace pèlerin : synthèse de son propre dossier (statut, pièces, paiements, solde). */
const { pool } = require('../config/database');

const REQUIRED_DOCUMENT_TYPES = ['passeport', 'photo_identite', 'certificat_medical', 'certificat_vaccination', 'preuve_paiement'];

const obtenirSynthese = async (req, res, next) => {
  try {
    const [dossiers] = await pool.execute(
      `SELECT d.id, d.numero_dossier, d.annee_hajj, d.statut, d.agence_id, d.forfait_id, d.nusuk_reference, d.nusuk_visa, d.nusuk_transmis_le, d.nusuk_confirme_le, d.nusuk_motif, a.nom_agence,
        f.nom AS forfait_nom, f.prix AS forfait_prix, f.devise
       FROM dossiers d LEFT JOIN agences a ON a.id=d.agence_id LEFT JOIN forfaits f ON f.id=d.forfait_id
       WHERE d.pelerin_id=? ORDER BY d.annee_hajj DESC, d.id DESC LIMIT 1`, [req.utilisateur.id]);
    const dossier = dossiers[0] || null;
    if (!dossier) return res.json({ succes: true, dossier: null, documents: [], paiements: [], solde: null, types_requis: REQUIRED_DOCUMENT_TYPES });

    const [documents] = await pool.execute(
      `SELECT id, type_document AS type, nom_fichier, statut, motif_rejet, DATE_FORMAT(expiration_date,'%Y-%m-%d') AS expiration_date,
        DATE_FORMAT(cree_le,'%Y-%m-%dT%H:%i:%sZ') AS cree_le FROM documents WHERE dossier_id=? ORDER BY cree_le DESC`, [dossier.id]);
    const [payments] = await pool.execute(
      `SELECT id, montant, devise, statut, moyen_paiement, reference, DATE_FORMAT(cree_le,'%Y-%m-%dT%H:%i:%sZ') AS cree_le,
        DATE_FORMAT(confirme_le,'%Y-%m-%dT%H:%i:%sZ') AS confirme_le FROM paiements WHERE dossier_id=? ORDER BY cree_le DESC`, [dossier.id]);
    const [history] = await pool.execute(
      `SELECT statut, commentaire, DATE_FORMAT(cree_le,'%Y-%m-%dT%H:%i:%sZ') AS cree_le FROM historique_statuts WHERE dossier_id=? ORDER BY id DESC`, [dossier.id]);

    // Montants calculés côté serveur uniquement (jamais déterminés par le client).
    const total = Number(dossier.forfait_prix || 0);
    const paid = payments.filter((p) => p.statut === 'valide').reduce((sum, p) => sum + Number(p.montant), 0);
    const pending = payments.filter((p) => p.statut === 'en_attente').reduce((sum, p) => sum + Number(p.montant), 0);
    res.json({
      succes: true,
      dossier: { id: dossier.id, numero_dossier: dossier.numero_dossier, annee_hajj: dossier.annee_hajj, statut: dossier.statut, agence: dossier.nom_agence, forfait: dossier.forfait_nom,
        nusuk: { reference: dossier.nusuk_reference, visa: dossier.nusuk_visa, transmis_le: dossier.nusuk_transmis_le, confirme_le: dossier.nusuk_confirme_le, motif: dossier.nusuk_motif } },
      documents, paiements: payments, historique: history, types_requis: REQUIRED_DOCUMENT_TYPES,
      solde: { total, paye: paid, en_attente: pending, restant: Math.max(0, total - paid), devise: dossier.devise || 'XAF' },
    });
  } catch (error) { next(error); }
};

const EDITABLE_STATUSES = ['brouillon', 'rejete'];

async function currentDossier(userId) {
  const [rows] = await pool.execute(
    `SELECT d.id, d.annee_hajj, d.statut, d.saison_id, d.forfait_id, d.agence_id, a.utilisateur_id AS agence_user_id
     FROM dossiers d LEFT JOIN agences a ON a.id=d.agence_id WHERE d.pelerin_id=? ORDER BY d.annee_hajj DESC, d.id DESC LIMIT 1`, [userId]);
  return rows[0] || null;
}

/** Forfaits proposés pour la saison de mon dossier. */
const listerForfaits = async (req, res, next) => {
  try {
    const dossier = await currentDossier(req.utilisateur.id);
    if (!dossier) return res.json({ succes: true, items: [], modifiable: false });
    const [items] = await pool.execute(
      `SELECT f.id, f.nom, f.description, f.inclus, CAST(f.prix AS DOUBLE) AS prix, f.devise FROM forfaits f JOIN saisons_hajj s ON s.id=f.saison_id
       WHERE f.est_actif=TRUE AND s.annee=? ORDER BY f.prix ASC`, [dossier.annee_hajj]);
    const [[paid]] = await pool.execute("SELECT COUNT(*) AS total FROM paiements WHERE dossier_id=? AND statut IN ('valide','en_attente')", [dossier.id]);
    res.json({ succes: true, items: items.map((item) => ({ ...item, choisi: Number(item.id) === Number(dossier.forfait_id) })), modifiable: EDITABLE_STATUSES.includes(dossier.statut) && Number(paid.total) === 0 });
  } catch (error) { next(error); }
};

/** Choisir (ou changer) mon forfait tant que le dossier est modifiable et sans paiement engagé. */
const choisirForfait = async (req, res, next) => {
  try {
    const dossier = await currentDossier(req.utilisateur.id);
    if (!dossier) return res.status(404).json({ succes: false, message: 'Aucun dossier.' });
    if (!EDITABLE_STATUSES.includes(dossier.statut)) return res.status(409).json({ succes: false, message: 'Le dossier n’est plus modifiable.' });
    const [[engaged]] = await pool.execute("SELECT COUNT(*) AS total FROM paiements WHERE dossier_id=? AND statut IN ('valide','en_attente')", [dossier.id]);
    if (Number(engaged.total) > 0) return res.status(409).json({ succes: false, message: 'Un paiement existe déjà : le forfait ne peut plus être changé.' });
    const [rows] = await pool.execute(
      'SELECT f.id, f.nom, f.saison_id FROM forfaits f JOIN saisons_hajj s ON s.id=f.saison_id WHERE f.id=? AND f.est_actif=TRUE AND s.annee=?', [Number(req.body.forfait_id), dossier.annee_hajj]);
    if (!rows.length) return res.status(400).json({ succes: false, message: 'Forfait invalide pour cette saison.' });
    await pool.execute('UPDATE dossiers SET forfait_id=?, saison_id=? WHERE id=?', [rows[0].id, rows[0].saison_id, dossier.id]);
    await pool.execute('INSERT INTO historique_statuts (dossier_id,statut,commentaire,modifie_par) VALUES (?,?,?,?)', [dossier.id, dossier.statut, `Forfait choisi : ${rows[0].nom}`, req.utilisateur.id]);
    res.json({ succes: true, forfait_id: rows[0].id });
  } catch (error) { next(error); }
};

/** Déclarer un paiement effectué (en attente de validation par l'agence). */
const declarerPaiement = async (req, res, next) => {
  try {
    const dossier = await currentDossier(req.utilisateur.id);
    if (!dossier) return res.status(404).json({ succes: false, message: 'Aucun dossier.' });
    if (!dossier.forfait_id) return res.status(409).json({ succes: false, code: 'NO_PACKAGE', message: 'Choisis d’abord un forfait.' });
    const montant = Number(req.body.montant);
    const moyen = String(req.body.moyen_paiement || '');
    if (!Number.isFinite(montant) || montant <= 0) return res.status(400).json({ succes: false, message: 'Montant invalide.' });
    if (!['especes', 'virement', 'mobile_money', 'cheque', 'autre'].includes(moyen)) return res.status(400).json({ succes: false, message: 'Moyen de paiement invalide.' });
    const [[forfait]] = await pool.execute('SELECT CAST(prix AS DOUBLE) AS prix, devise FROM forfaits WHERE id=?', [dossier.forfait_id]);
    const [[sums]] = await pool.execute("SELECT COALESCE(SUM(montant),0) AS engage FROM paiements WHERE dossier_id=? AND statut IN ('valide','en_attente')", [dossier.id]);
    const restant = forfait.prix - Number(sums.engage);
    if (montant > restant + 0.001) return res.status(409).json({ succes: false, code: 'OVERPAY', message: `Le montant dépasse le solde à régler (${restant}).` });
    const reference = String(req.body.reference || '').trim().slice(0, 120) || null;
    const [result] = await pool.execute(
      'INSERT INTO paiements (dossier_id, forfait_id, montant, devise, statut, moyen_paiement, reference, commentaire) VALUES (?,?,?,?,"en_attente",?,?,?)',
      [dossier.id, dossier.forfait_id, montant, forfait.devise || 'XAF', moyen, reference, 'Déclaré par le pèlerin']);
    if (dossier.agence_user_id) {
      await pool.execute("INSERT INTO notifications (destinataire_id,titre,corps,type) VALUES (?,?,?,'info')",
        [dossier.agence_user_id, 'Paiement à valider', `${req.utilisateur.prenom} ${req.utilisateur.nom} déclare un paiement de ${montant} ${forfait.devise || 'XAF'}.`]);
    }
    res.status(201).json({ succes: true, paiement_id: result.insertId });
  } catch (error) { next(error); }
};

module.exports = { obtenirSynthese, listerForfaits, choisirForfait, declarerPaiement };
