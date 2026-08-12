const admin = require('firebase-admin');

const initFirebase = () => {
  if (admin.apps.length > 0) return admin;

  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    console.warn('⚠️ Firebase non configuré, initialisation ignorée');
    return admin;
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });

  console.log('✅ Firebase Admin initialisé');
  return admin;
};

module.exports = { initFirebase, admin };
