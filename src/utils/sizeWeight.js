import * as XLSX from 'xlsx';

// =============================================================================
// Master Tambahan — cadangan berat/box berdasarkan UKURAN
// =============================================================================
// Dipakai saat kode barang (Item No) dari nota TIDAK ditemukan di Master Item
// (katalog utama). Alih-alih berat = 0 (tidak diketahui sama sekali), kita
// coba tebak ukuran dari nama barang (mis. "...70X70CM..." -> "70X70") lalu
// cari berat per box-nya di tabel referensi ini.
//
// Catatan: tabel ini cuma punya kolom berat, tidak ada kubikasi/volume — jadi
// order yang keselamatan lewat jalur ini akan punya totalWeightKg terisi,
// tapi totalCubageM3 tetap 0 (belum ada cara menaksir volume dari ukuran
// permukaan saja tanpa tahu tebal box).

const HEADER_COLUMNS = ['UKURAN', 'KLASIFIKASI', 'BERAT (KG)'];

/** Normalisasi teks ukuran ("70 x 70 cm", "70X70CM") -> "70X70". */
export function normalizeSizeToken(text) {
  const m = (text || '').match(/(\d{1,4})\s*[xX]\s*(\d{1,4})/);
  if (!m) return null;
  return `${m[1]}X${m[2]}`;
}

/** Cari token ukuran di dalam nama barang bebas format, mis. dari Item Name nota. */
export function extractSizeFromItemName(itemName) {
  return normalizeSizeToken(itemName);
}

/** Ubah array baris {ukuran, klasifikasi, beratKg} jadi peta lookup cepat (key = ukuran ternormalisasi). */
export function buildSizeWeightMap(rows) {
  const map = {};
  (rows || []).forEach((row) => {
    const key = normalizeSizeToken(row.ukuran);
    if (key) map[key] = { klasifikasi: row.klasifikasi, beratKg: row.beratKg };
  });
  return map;
}

/**
 * Cari estimasi berat per box dari nama barang, lewat tabel Master Tambahan.
 * @returns {{ukuran:string, klasifikasi:string, beratKg:number}|null}
 */
export function lookupFallbackWeight(itemName, sizeWeightMap) {
  const size = extractSizeFromItemName(itemName);
  if (!size) return null;
  const entry = sizeWeightMap[size];
  if (!entry) return null;
  return { ukuran: size, klasifikasi: entry.klasifikasi, beratKg: entry.beratKg };
}

/** Parse file Excel upload untuk Master Tambahan (kolom: UKURAN, KLASIFIKASI, BERAT (KG)). */
export function parseSizeWeightExcel(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  const headerIdx = rows.findIndex((r) => String(r[0] || '').trim().toUpperCase() === 'UKURAN');
  if (headerIdx === -1) {
    throw new Error("Header 'UKURAN' tidak ditemukan di baris pertama.");
  }
  const headers = rows[headerIdx].map((h) => String(h || '').trim().toUpperCase());
  const idxUkuran = headers.indexOf('UKURAN');
  const idxKlasifikasi = headers.indexOf('KLASIFIKASI');
  const idxBerat = headers.findIndex((h) => h.includes('BERAT'));

  return rows
    .slice(headerIdx + 1)
    .filter((r) => r[idxUkuran])
    .map((r) => ({
      ukuran: normalizeSizeToken(String(r[idxUkuran])) || String(r[idxUkuran]).trim().toUpperCase(),
      klasifikasi: idxKlasifikasi > -1 ? String(r[idxKlasifikasi] || '').trim() : '',
      beratKg: parseFloat(r[idxBerat]) || 0,
    }));
}

/** Unduh tabel Master Tambahan saat ini sebagai file Excel (.xlsx). */
export function downloadSizeWeightExcel(rows) {
  const data = [HEADER_COLUMNS, ...rows.map((r) => [r.ukuran, r.klasifikasi, r.beratKg])];
  const sheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Master Tambahan');
  XLSX.writeFile(workbook, 'master-tambahan-berat-ukuran.xlsx');
}
