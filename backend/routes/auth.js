const express = require('express');
const router = express.Router();

router.post('/login', (req, res) => {
  res.json({
    succes: true,
    message: 'Connexion simulée réussie',
    token: 'demo-token',
    utilisateur: {
      id: 1,
      nom: 'Demo',
      prenom: 'Pelerin',
      email: req.body.email || 'demo@example.com',
      role: 'pelerin',
    },
  });
});

router.post('/register', (req, res) => {
  res.status(201).json({
    succes: true,
    message: 'Compte créé en mode démo',
    utilisateur: {
      id: 1,
      nom: req.body.nom || 'Demo',
      prenom: req.body.prenom || 'Pelerin',
      email: req.body.email || 'demo@example.com',
      role: 'pelerin',
    },
  });
});

module.exports = router;
