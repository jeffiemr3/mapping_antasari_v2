import { ref, set, get, serverTimestamp } from 'firebase/database';
import { getDb, isFirebaseConfigured } from '../lib/firebase';

// =============================================================================
// Sinkronisasi data upload (Penjualan & Lokasi Gudang) lewat Realtime Database
// =============================================================================
// Berbeda dari pickerSync.js (yang bikin snapshot BARU tiap "Kirim ke
// Operator", dengan kode acak, tidak pernah ditimpa) - data di sini cuma ada
// SATU versi "saat ini" per jenis data, disimpan di path tetap
// `sharedData/{key}`, dan SELALU BOLEH ditimpa oleh upload berikutnya. Jadi
// device mana pun yang buka aplikasi otomatis tarik versi terakhir yang
// pernah diupload dari device manapun - tidak perlu upload ulang tiap ganti
// device/browser, cukup kalau memang ada file baru yang mau menggantikan.

const WRITE_TOKEN = import.meta.env.VITE_APP_WRITE_TOKEN || '';

/** Simpan data (akan otomatis di-serialize) ke `sharedData/{key}`, menimpa versi sebelumnya. */
export async function saveSharedData(key, data) {
  if (!isFirebaseConfigured) return false;
  const db = getDb();
  await set(ref(db, `sharedData/${key}`), {
    data,
    appToken: WRITE_TOKEN,
    updatedAt: serverTimestamp(),
  });
  return true;
}

/** Ambil data terakhir dari `sharedData/{key}`. Null kalau belum pernah ada / Firebase belum di-setup. */
export async function loadSharedData(key) {
  if (!isFirebaseConfigured) return null;
  const db = getDb();
  const snap = await get(ref(db, `sharedData/${key}`));
  if (!snap.exists()) return null;
  return snap.val(); // { data, appToken, updatedAt }
}
