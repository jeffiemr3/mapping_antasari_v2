import { initializeApp, getApps } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Konfigurasi Firebase Web App diambil dari environment variable (diisi lewat
// file .env.local saat development, atau Environment Variables di dashboard
// Vercel saat production). Nilai-nilai ini BUKAN rahasia (config Firebase Web
// SDK memang publik & aman ter-embed di bundle browser) -- keamanan akses data
// diatur lewat Realtime Database Security Rules, bukan dengan menyembunyikan
// nilai-nilai berikut. Lihat PANDUAN_OPERATOR_GUDANG.md untuk detailnya.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/** True kalau env variable Firebase sudah diisi (setup sinkronisasi selesai). */
export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.databaseURL);

let dbInstance = null;

/** Ambil instance Realtime Database (lazy-init, null kalau belum dikonfigurasi). */
export function getDb() {
  if (!isFirebaseConfigured) return null;
  if (!dbInstance) {
    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    dbInstance = getDatabase(app);
  }
  return dbInstance;
}
