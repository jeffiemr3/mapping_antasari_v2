import * as XLSX from 'xlsx';
import Papa from 'papaparse';

// =============================================================================
// Import "Data Penjualan / Nota" (pesanan pengiriman)
// =============================================================================
// Header baris pertama HARUS punya kolom "Site ID" (dipakai untuk mendeteksi
// baris header di file mentah, karena file sumbernya biasanya punya baris
// judul laporan di atas tabel). Kolom lain yang dibaca:
//   Site Name, NPno, Order Date, Promised Delievery Date / Promised Delivery
//   Date, Customer Name, Sell To Address, Sell To Address 2, Latitude,
//   Longitude, Item No, Item Name, Outstanding Qty Base, UOM, Comment,
//   Phone No / Cellular Phone, NPType
//
// Hanya baris dengan NPType "Delivery Gudang Store (...)" atau
// "Cash & Delivery via Gudang Store" yang diproses (pengambilan langsung di
// toko / cash-and-carry TIDAK ikut dispatch).
const ORDER_HEADER_MARKER = 'Site ID';

function normalizeNPType(raw) {
  return (raw || '').toLowerCase().replace(/\s+/g, '');
}

function isDeliveryType(npType) {
  const n = normalizeNPType(npType);
  return n.startsWith('deliverygudangstore(') || n === 'cash&deliveryviagudangstore';
}

function rowsToOrderLines(rows) {
  const headerIdx = rows.findIndex((r) => r[0] && String(r[0]).trim() === ORDER_HEADER_MARKER);
  if (headerIdx === -1) return null;
  const headers = rows[headerIdx].map((h) => String(h || '').trim());
  const col = (row, name) => {
    const idx = headers.indexOf(name);
    return idx > -1 ? String(row[idx] ?? '').trim() : '';
  };

  const lines = [];
  rows.slice(headerIdx + 1).forEach((row) => {
    if (!row[0]) return;
    const npType = col(row, 'NPType');
    if (!isDeliveryType(npType)) return;
    lines.push({
      SiteName: col(row, 'Site Name'),
      NPno: col(row, 'NPno'),
      OrderDate: col(row, 'Order Date'),
      PromisedDate: col(row, 'Promised Delievery Date') || col(row, 'Promised Delivery Date'),
      Customer: col(row, 'Customer Name'),
      Address: col(row, 'Sell To Address'),
      Address2: col(row, 'Sell To Address 2'),
      Phone: col(row, 'Phone No') || col(row, 'Cellular Phone') || col(row, 'Cellular Phone No'),
      Lat: parseFloat(col(row, 'Latitude')) || 0,
      Lng: parseFloat(col(row, 'Longitude')) || 0,
      ItemNo: col(row, 'Item No'),
      ItemName: col(row, 'Item Name'),
      QtyOutstanding: parseFloat(col(row, 'Outstanding Qty Base')) || 0,
      UOM: col(row, 'UOM'),
      Comment: col(row, 'Comment'),
      NPType: npType,
    });
  });
  return lines;
}

/** Parse file Excel (.xlsx/.xls) berisi data nota/pesanan. */
export function parseOrdersExcel(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const lines = rowsToOrderLines(rows);
  if (lines === null) {
    throw new Error(`Format Excel tidak cocok. Header '${ORDER_HEADER_MARKER}' tidak ditemukan di kolom pertama.`);
  }
  return lines;
}

/** Parse file CSV (delimiter otomatis dideteksi: ";" atau ",") berisi data nota. */
export function parseOrdersCSV(text) {
  const delimiter = text.includes(';') ? ';' : ',';
  const result = Papa.parse(text, { delimiter, skipEmptyLines: true });
  const lines = rowsToOrderLines(result.data);
  if (lines === null) {
    throw new Error(`Format CSV tidak cocok. Header '${ORDER_HEADER_MARKER}' tidak ditemukan.`);
  }
  return lines;
}

/** Parse file JSON berisi array nota, atau objek dengan field "sales"/"data". */
export function parseOrdersJSON(text) {
  const parsed = JSON.parse(text);
  const arr = Array.isArray(parsed) ? parsed : parsed.sales || parsed.data || [];
  return arr.map((row) => ({
    SiteName: row.SiteName || row['Site Name'] || '',
    NPno: row.NPno || row.NPNo || '',
    OrderDate: row.OrderDate || row['Order Date'] || '',
    PromisedDate: row.PromisedDate || row['Promised Delivery Date'] || row['Promised Delievery Date'] || '',
    Customer: row.Customer || row['Customer Name'] || '',
    Address: row.Address || row['Sell To Address'] || '',
    Address2: row.Address2 || row['Sell To Address 2'] || '',
    Phone: row.Phone || row['Phone No'] || row['Cellular Phone'] || '',
    Lat: parseFloat(row.Lat || row.Latitude) || 0,
    Lng: parseFloat(row.Lng || row.Longitude) || 0,
    ItemNo: row.ItemNo || row['Item No'] || '',
    ItemName: row.ItemName || row['Item Name'] || '',
    QtyOutstanding: parseFloat(row.QtyOutstanding || row['Outstanding Qty Base']) || 0,
    UOM: row.UOM || '',
    Comment: row.Comment || '',
    NPType: row.NPType || '',
  }));
}

/**
 * Gabungkan (merge) baris-baris nota baru ke daftar lama: baris lama yang
 * PromisedDate-nya TIDAK disentuh oleh import baru tetap dipertahankan;
 * tanggal yang muncul di file baru akan sepenuhnya digantikan isinya.
 * Ini supaya import harian tidak menghapus data hari-hari lain.
 */
export function mergeOrderLinesByPromisedDate(existingLines, newLines) {
  const touchedDates = new Set(newLines.map((l) => l.PromisedDate));
  const kept = existingLines.filter((l) => !touchedDates.has(l.PromisedDate));
  return kept.concat(newLines);
}

// =============================================================================
// Agregasi baris nota -> order per NPno (dengan lookup berat/volume katalog)
// =============================================================================

/**
 * Kelompokkan baris-baris item (satu nota bisa berisi banyak baris item)
 * menjadi satu order per NPno, sambil menghitung total berat & kubikasi dari
 * katalog produk (weight_gr, cubage_cm3 per Item No dikali qty).
 *
 * @param {Array} lines - hasil parseOrders*
 * @param {Record<string, {name:string, weight_gr:number, cubage_cm3:number}>} catalog
 * @returns {Record<string, object>} NPno -> order teragregasi
 */
export function aggregateOrderLines(lines, catalog) {
  const orders = {};
  lines.forEach((line) => {
    if (!orders[line.NPno]) {
      orders[line.NPno] = {
        NPno: line.NPno,
        siteName: line.SiteName,
        orderDate: line.OrderDate,
        promisedDate: line.PromisedDate,
        customer: line.Customer,
        address: line.Address,
        address2: line.Address2,
        phone: '',
        lat: line.Lat || 0,
        lng: line.Lng || 0,
        totalWeightKg: 0,
        totalCubageM3: 0,
        missingItemData: false,
        hasAmsenComment: false,
        comments: [],
        lines: [],
      };
    }
    const order = orders[line.NPno];
    if (!order.phone && line.Phone) order.phone = line.Phone;

    const product = catalog[line.ItemNo];
    const qty = line.QtyOutstanding || 0;
    let weightKg = 0;
    let cubageM3 = 0;
    if (product) {
      weightKg = ((product.weight_gr || 0) * qty) / 1000;
      cubageM3 = ((product.cubage_cm3 || 0) * qty) / 1e6;
    } else {
      order.missingItemData = true;
    }
    order.totalWeightKg += weightKg;
    order.totalCubageM3 += cubageM3;

    const comment = (line.Comment || '').trim();
    if (comment && !order.comments.includes(comment)) order.comments.push(comment);
    if (/amsen/i.test(comment)) order.hasAmsenComment = true;

    order.lines.push({
      itemNo: line.ItemNo,
      itemName: line.ItemName || (product ? product.name : line.ItemNo),
      qty,
      uom: line.UOM,
    });
  });
  return orders;
}

// =============================================================================
// Import Katalog Produk Kustom (opsional, menambah/menimpa katalog bawaan)
// =============================================================================
// Header baris terdeteksi dari baris yang mengandung sel persis "Item No".
// Kolom "Item Name" dipakai apa adanya; kolom berat & kubikasi dicari lewat
// nama kolom yang MENGANDUNG kata "Weight" / "Cubage" (case-sensitive, sama
// seperti file asli) supaya fleksibel terhadap variasi judul kolom.
export function parseCustomCatalogExcel(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  const headerIdx = rows.findIndex((r) => r.some((cell) => String(cell || '').trim() === 'Item No'));
  if (headerIdx === -1) return null;
  const headers = rows[headerIdx].map((h) => String(h || '').trim());
  const idxItemNo = headers.indexOf('Item No');
  const idxItemName = headers.indexOf('Item Name');
  const idxWeight = headers.findIndex((h) => h.includes('Weight'));
  const idxCubage = headers.findIndex((h) => h.includes('Cubage'));
  if (idxItemNo === -1) return null;

  const catalog = {};
  rows.slice(headerIdx + 1).forEach((row) => {
    const code = String(row[idxItemNo] ?? '').trim();
    if (!code) return;
    catalog[code] = {
      name: String(row[idxItemName] ?? '').trim(),
      weight_gr: parseFloat(String(row[idxWeight] || '0').replace(/[^0-9.]/g, '')) || 0,
      cubage_cm3: parseFloat(String(row[idxCubage] || '0').replace(/[^0-9.]/g, '')) || 0,
    };
  });
  return catalog;
}

// =============================================================================
// Import Armada / Supir (Excel / CSV / TXT)
// =============================================================================
// Kolom yang dibaca: Driver, Vehicle, nomor polisi (Plat Nomor), Height,
// Width, Length (cm, dimensi bak), Weight (KAPASITAS BERAT DALAM GRAM),
// Cubage (KAPASITAS VOLUME DALAM CM3). Weight & Cubage disimpan ke model
// internal dalam kg dan m3 (dibagi 1000 / 1e6).
export function parseFleetRows(rows) {
  const headerIdx = rows.findIndex((r) => r.some((c) => String(c || '').trim() === 'Driver'));
  if (headerIdx === -1) return [];
  const headers = rows[headerIdx].map((h) => String(h || '').trim());
  const col = (row, name) => {
    const idx = headers.indexOf(name);
    return idx > -1 ? row[idx] : undefined;
  };

  return rows
    .slice(headerIdx + 1)
    .filter((r) => r[0])
    .map((row) => ({
      driver: String(col(row, 'Driver') ?? '').trim(),
      vehicle: String(col(row, 'Vehicle') ?? '').trim(),
      plate: String(col(row, 'nomor polisi') ?? col(row, 'Plate') ?? '').trim(),
      heightCm: parseFloat(col(row, 'Height')) || 0,
      widthCm: parseFloat(col(row, 'Width')) || 0,
      lengthCm: parseFloat(col(row, 'Length')) || 0,
      capWeightKg: (parseFloat(col(row, 'Weight')) || 0) / 1000,
      capCubageM3: (parseFloat(col(row, 'Cubage')) || 0) / 1e6,
    }));
}

export function parseFleetExcel(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  return parseFleetRows(rows);
}

export function parseFleetDelimited(text) {
  const delimiter = text.includes('\t') ? '\t' : text.includes(';') ? ';' : ',';
  const result = Papa.parse(text, { delimiter, skipEmptyLines: true });
  return parseFleetRows(result.data);
}
