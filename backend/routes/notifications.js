const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    succes: true,
    notifications: [
      {
        id: 1,
        titre: 'Bienvenue',
        corps: 'Votre application Hajj est prête.',
        lu: false,
      },
    ],
  });
});

module.exports = router;
