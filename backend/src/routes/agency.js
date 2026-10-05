/**
 * Actions de l'administrateur d'agence sur SA propre organisation :
 * gestion des guides et création de pèlerins. L'agence est déduite du compte
 * connecté — un `agence_id` envoyé par le client est ignoré.
 */
const express = require('express');
const { body } = require('express-validator');
const { pool } = require('../config/database');
const { authentifier, autoriser } = require('../middleware/Auth');
const { creerEncadreur, creerPelerinAvecDossier, supprimerEncadreur } = require('../controllers/adminController');

const router = express.Router();
router.use(authentifier, autoriser('agence'));

async function ownAgencyIds(userId) {
  const [rows] = await pool.execute('SELECT id FROM agences WHERE utilisateur_id=? ORDER BY id', [userId]);
  return rows.map((row) => row.id);
}

const forceOwnAgency = async (req, res, next) => {
  try {
    const ids = await ownAgencyIds(req.utilisateur.id);
    if (!ids.length) return res.status(403).json({ succes: false, code: 'NO_AGENCY', message: 'Aucune agence associée à ce compte' });
    req.body.agence_id = ids[0];
    next();
  } catch (error) { next(error); }
};

const accountRules = [
  body('nom').trim().notEmpty().isLength({ max: 100 }),
  body('prenom').trim().notEmpty().isLength({ max: 100 }),
  body('email').isEmail().normalizeEmail(),
  body('telephone').optional({ values: 'null' }).trim().isLength({ max: 20 }),
  body('mot_de_passe').isLength({ min: 8 }).withMessage('Mot de passe : 8 caractères minimum.'),
];

router.get('/guides', async (req, res, next) => {
  try {
    const ids = await ownAgencyIds(req.utilisateur.id);
    if (!ids.length) return res.json({ succes: true, encadreurs: [] });
    const [encadreurs] = await pool.execute(
      `SELECT e.utilisateur_id AS id, u.nom, u.prenom, u.email, u.telephone, u.est_actif, a.id AS agence_id, a.nom_agence,
        (SELECT COUNT(*) FROM groupes_pelerins g WHERE g.encadreur_id=e.utilisateur_id) AS total_groupes,
        (SELECT COUNT(*) FROM groupe_membres gm JOIN groupes_pelerins g ON g.id=gm.groupe_id WHERE g.encadreur_id=e.utilisateur_id) AS total_pelerins
       FROM encadreurs e JOIN utilisateurs u ON u.id=e.utilisateur_id JOIN agences a ON a.id=e.agence_id
       WHERE e.agence_id IN (${ids.map(() => '?').join(',')}) ORDER BY u.nom, u.prenom`, ids);
    res.json({ succes: true, encadreurs });
  } catch (error) { next(error); }
});

router.post('/guides', accountRules, forceOwnAgency, creerEncadreur);

router.delete('/guides/:id', async (req, res, next) => {
  try {
    const ids = await ownAgencyIds(req.utilisateur.id);
    const [rows] = ids.length
      ? await pool.execute(`SELECT 1 FROM encadreurs WHERE utilisateur_id=? AND agence_id IN (${ids.map(() => '?').join(',')})`, [req.params.id, ...ids])
      : [[]];
    // 404 (et non 403) hors périmètre : on ne révèle pas l'existence d'un guide d'une autre agence.
    if (!rows.length) return res.status(404).json({ succes: false, message: 'Encadreur introuvable' });
    return supprimerEncadreur(req, res, next);
  } catch (error) { next(error); }
});

router.post('/pelerins', [
  ...accountRules,
  body('saison_id').isInt({ min: 1 }),
  body('forfait_id').isInt({ min: 1 }),
], forceOwnAgency, creerPelerinAvecDossier);

module.exports = router;
