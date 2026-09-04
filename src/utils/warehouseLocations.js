import * as XLSX from 'xlsx';

// =============================================================================
// Import "Report Stock Warehouse By Location" (laporan lokasi rak gudang)
// =============================================================================
// File export standar sistem toko: 1 baris judul laporan di atas, lalu baris
// header tabel berisi kolom "Storage Location Id", "Zone Id", "Item No",
// "Available Qty", dst. Dipakai untuk menandai di mana (rak/zona) tiap barang
// bisa diambil operator gudang saat menyiapkan barang untuk armada.

const HEADER_MARKERS = ['Storage Location Id', 'Item No'];

/** "0100003393" (teks) maupun 100003393 (angka, kehilangan leading zero saat
 *  dibaca Excel) -> dinormalisasi jadi bentuk yang sama supaya bisa dicocokkan. */
export function normalizeItemNo(raw) {
  if (raw === null || raw === undefined) return '';
  const s = String(raw).trim();
  if (!s) return '';
  const stripped = s.replace(/^0+/, '');
  return stripped || '0';
}

function rowsToLocationIndex(rows) {
  const headerIdx = rows.findIndex((r) => HEADER_MARKERS.every((marker) => r.some((cell) => String(cell || '').trim() === marker)));
  if (headerIdx === -1) return null;
  const headers = rows[headerIdx].map((h) => String(h || '').trim());
  const idx = (name) => headers.indexOf(name);
  const iItemNo = idx('Item No');
  const iStorageLoc = idx('Storage Location Id');
  const iZone = idx('Zone Id');
  const iAvailQty = idx('Available Qty');
  const iSohQty = idx('Stock On Hand Qty');
  const iUom = idx('Base UOM');
  const iActive = idx('Storage Location Active Status');
  if (iItemNo === -1 || iStorageLoc === -1) return null;

  /** itemNo dinormalisasi -> array lokasi { storageLocationId, zoneId, qty, uom } */
  const index = {};
  rows.slice(headerIdx + 1).forEach((row) => {
    const itemNoRaw = row[iItemNo];
    if (!itemNoRaw) return;
    const itemNo = normalizeItemNo(itemNoRaw);
    if (!itemNo) return;
    const storageLocationId = String(row[iStorageLoc] || '').trim();
    if (!storageLocationId) return;
    if (iActive !== -1) {
      const active = String(row[iActive] || '').trim().toUpperCase();
      if (active && active !== 'ACTIV' && active !== 'ACTIVE') return;
    }
    const qty = parseFloat(iAvailQty !== -1 ? row[iAvailQty] : row[iSohQty]) || 0;
    if (qty <= 0) return;

    if (!index[itemNo]) index[itemNo] = [];
    const existing = index[itemNo].find((l) => l.storageLocationId === storageLocationId);
    if (existing) {
      existing.qty += qty;
    } else {
      index[itemNo].push({
        storageLocationId,
        zoneId: iZone !== -1 ? String(row[iZone] || '').trim() : '',
        qty,
        uom: iUom !== -1 ? String(row[iUom] || '').trim() : '',
      });
    }
  });

  // Urutkan tiap daftar lokasi per item dari stok terbanyak -> tersedikit,
  // supaya operator diarahkan ke rak dengan stok paling banyak dulu.
  Object.values(index).forEach((locs) => locs.sort((a, b) => b.qty - a.qty));
  return index;
}

export function parseWarehouseLocationExcel(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  return rowsToLocationIndex(rows);
}

/** Cari daftar lokasi untuk satu Item No dari index hasil import. */
export function lookupLocations(locationIndex, itemNo) {
  if (!locationIndex) return [];
  return locationIndex[normalizeItemNo(itemNo)] || [];
}

/** Ringkas jadi label pendek untuk ditampilkan, mis. "W120170101 (89 PCS)". */
export function formatLocationLabel(loc) {
  if (!loc) return '';
  const qtyPart = loc.qty ? ` (${loc.qty % 1 === 0 ? loc.qty : loc.qty.toFixed(1)}${loc.uom ? ' ' + loc.uom : ''})` : '';
  return `${loc.storageLocationId}${qtyPart}`;
}
