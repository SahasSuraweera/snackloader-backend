const admin = require("firebase-admin");
require("dotenv").config();

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
  // storageBucket: process.env.FIREBASE_STORAGE_BUCKET  <-- add later when using Storage
});

const db = admin.firestore();

module.exports = { admin, db };
