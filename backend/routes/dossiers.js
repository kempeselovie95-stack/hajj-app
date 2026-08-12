const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    succes: true,
    dossiers: [
      {
        id: 1,
        numero_dossier: 'DOS-2026-0001',
        statut: 'en_attente',
        type_package: 'standard',
        pelerin_nom: 'Demo Pelerin',
      },
    ],
  });
});

router.get('/:id', (req, res) => {
  res.json({
    succes: true,
    dossier: {
      id: req.params.id,
      numero_dossier: `DOS-2026-${req.params.id}`,
      statut: 'en_cours',
      type_package: 'standard',
      pelerin_nom: 'Demo Pelerin',
    },
  });
});

module.exports = router;
