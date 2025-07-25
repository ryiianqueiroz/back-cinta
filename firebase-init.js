// firebase-admin-init.js
import admin from 'firebase-admin';

const initializeFirebaseAdmin = () => {
  if (admin.apps.length === 0) {
    const firebase_private_key_b64 = process.env.FIREBASE_API_KEY;

    if (!firebase_private_key_b64) {
      throw new Error('FIREBASE_KEYS not found in environment variables');
    }

    const firebase_private_key = Buffer.from(firebase_private_key_b64, 'base64').toString('utf8');

    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(firebase_private_key)),
    });
  }
};

export { initializeFirebaseAdmin, admin };
