/**
 * Initialisation Firebase Admin SDK
 * Utilisé pour envoyer des notifications push (FCM) aux pèlerins
 */

const admin = require('firebase-admin');

const initFirebase = () => {
  // Évite la double initialisation lors des rechargements nodemon
  if (admin.apps.length > 0) return admin;

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:    process.env.FIREBASE_PROJECT_ID,
      privateKey:   process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail:  process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });

  console.log('✅ Firebase Admin initialisé');
  return admin;
};

module.exports = { initFirebase, admin };