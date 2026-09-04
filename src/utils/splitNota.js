// =============================================================================
// Pecah Nota — untuk nota tunggal yang qty-nya kebesaran (melebihi kapasitas
// mobil manapun) dan tidak bisa dibagi otomatis oleh algoritma alokasi biasa
// (yang cuma bisa membagi ANTAR nota, bukan memotong isi 1 nota).
// =============================================================================

/** Bagi rata sebuah qty ke N bagian (sisa pembagian ditumpuk ke bagian awal). */
export function computeEvenSplit(qty, parts) {
  const base = Math.floor(qty / parts);
  const remainder = qty - base * parts;
  return Array.from({ length: parts }, (_, i) => base + (i < remainder ? 1 : 0));
}

/**
 * Ganti baris-baris mentah milik satu NPno dengan beberapa NPno baru
 * (mis. "MS123" -> "MS123-A", "MS123-B") sesuai qty per bagian yang diberikan.
 *
 * @param {Array} rawLines - seluruh baris nota mentah (state utama aplikasi)
 * @param {string} npno - NPno yang mau dipecah
 * @param {number[][]} quantities - quantities[lineIdx][partIdx] = qty untuk baris & bagian tsb
 *   (lineIdx mengacu ke urutan baris rawLines yang NPno-nya cocok, urutan asli)
 * @returns {Array} rawLines baru (baris NPno lama sudah diganti baris-baris hasil pecahan)
 */
export function splitOrderInRawLines(rawLines, npno, quantities) {
  const npnoLines = rawLines.filter((l) => l.NPno === npno);
  const otherLines = rawLines.filter((l) => l.NPno !== npno);
  const numParts = quantities[0]?.length || 0;
  const newLines = [];

  for (let partIdx = 0; partIdx < numParts; partIdx++) {
    const suffix = String.fromCharCode(65 + partIdx); // A, B, C, ...
    npnoLines.forEach((line, lineIdx) => {
      const qty = quantities[lineIdx]?.[partIdx] || 0;
      if (qty > 0) {
        newLines.push({ ...line, NPno: `${npno}-${suffix}`, QtyOutstanding: qty });
      }
    });
  }
  return [...otherLines, ...newLines];
}
