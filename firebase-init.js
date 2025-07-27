// firebase-admin-init.js
import admin from "firebase-admin";

let initialized = false;

const initializeFirebaseAdmin = () => {
  if (!initialized) {
    const firebase_private_key_b64 = process.env.FIREBASE_API_KEY;

    if (!firebase_private_key_b64) {
      throw new Error("❌ FIREBASE_API_KEY não encontrado nas variáveis de ambiente.");
    }

    // Converte Base64 para JSON
    const firebase_private_key = Buffer.from(firebase_private_key_b64, "base64").toString("utf8");
    const serviceAccount = JSON.parse(firebase_private_key);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    initialized = true;
    console.log("✅ Firebase Admin inicializado");
  }
};

export { initializeFirebaseAdmin, admin };
