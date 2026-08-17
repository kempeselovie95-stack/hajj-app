/**
 * Middleware de gestion centralisée des erreurs
 * Toutes les erreurs non catchées arrivent ici
 */

const gererErreur = (error, req, res, next) => {
  console.error(`[ERREUR] ${req.method} ${req.path} →`, error.message);

  // Erreur de validation MySQL (champ dupliqué, etc.)
  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      succes: false,
      message: 'Cette valeur existe déjà (email ou identifiant en double)',
    });
  }

  // Erreur de validation express-validator
  if (error.type === 'validation') {
    return res.status(400).json({
      succes: false,
      message: 'Données invalides',
      erreurs: error.errors,
    });
  }

  // Erreur générique — ne pas exposer les détails techniques en production
  const statusCode = error.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Une erreur interne est survenue'
    : error.message;

  res.status(statusCode).json({ succes: false, message });
};

module.exports = { gererErreur };