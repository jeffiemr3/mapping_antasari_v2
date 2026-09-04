// =============================================================================
// Deteksi prioritas "Rit 1" dari komentar nota
// =============================================================================
// Beberapa nota punya batas waktu pengiriman (mis. pelanggan minta sebelum
// jam tertentu). Ini biasanya ditulis admin di kolom komentar nota dengan
// kata kunci seperti di bawah. Kalau ketemu, nota tsb harus:
//   1. diprioritaskan masuk ke armada yang jalan RIT 1 (bukan rit 2/3/dst), dan
//   2. jadi salah satu stop PALING AWAL dalam rute rit 1 tersebut.
// Lihat pemakaiannya di utils/allocation.js (autoAllocate).

const PRIORITY_KEYWORDS = ['rit 1', 'sebelum jam', 'maximal jam', 'max jam', 'maks'];

/** Cek apakah sebuah teks komentar mengandung salah satu kata kunci prioritas rit 1. */
export function hasRitPriorityKeyword(text) {
  const lower = (text || '').toLowerCase();
  return PRIORITY_KEYWORDS.some((kw) => lower.includes(kw));
}

/** Cek apakah nama armada/rit termasuk "Rit 1" (mis. "NKEL RIT 1", tidak match "RIT 10"). */
export function isRit1Vehicle(vehicleName) {
  return /\brit\s*1\b/i.test(vehicleName || '');
}

/** Cek apakah sebuah cluster stop mengandung minimal satu nota berprioritas rit 1. */
export function isPriorityCluster(cluster, ordersMap) {
  return cluster.members.some((id) => ordersMap[id]?.priorityRit1);
}
