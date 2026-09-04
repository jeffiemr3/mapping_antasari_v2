import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Konfigurasi Firebase Web App diambil dari environment variable (diisi lewat
// file .env.local saat development, atau Environment Variables di dashboard
// Vercel saat production). Nilai-nilai ini BUKAN rahasia (config Firebase Web
// SDK memang publik & aman ter-embed di bundle browser) -- keamanan akses data
// diatur lewat Firestore Security Rules, bukan dengan menyembunyikan config
// ini. Lihat PANDUAN_OPERATOR_GUDANG.md untuk cara membuat project Firebase-nya.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/** True kalau env variable Firebase sudah diisi (setup sinkronisasi selesai). */
export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let dbInstance = null;

/** Ambil instance Firestore (lazy-init, null kalau belum dikonfigurasi). */
export function getDb() {
  if (!isFirebaseConfigured) return null;
  if (!dbInstance) {
    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    dbInstance = getFirestore(app);
  }
  return dbInstance;
}
