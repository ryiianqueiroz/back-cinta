import admin from "firebase-admin";

let appInitialized = false;

function initializeFirebaseAdmin() {
  if (!appInitialized) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
    });
    appInitialized = true;
    console.log("✅ Firebase Admin inicializado");
  }
}

function getFirestore() {
  if (!appInitialized) {
    throw new Error("Firebase Admin não inicializado. Chame initializeFirebaseAdmin() antes.");
  }
  return admin.firestore();
}

export { initializeFirebaseAdmin, getFirestore, admin };
