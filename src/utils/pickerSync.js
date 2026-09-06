import { ref, set, get, serverTimestamp } from 'firebase/database';
import { getDb, isFirebaseConfigured } from '../lib/firebase';
import { clusterOrders } from './allocation';
import { lookupLocations } from './warehouseLocations';

// Karakter kode dipilih supaya tidak ambigu saat dibaca/diketik manual oleh
// operator (tanpa 0/O, 1/I, dst).
const CODE_CHARS = 'ACDEFGHJKLMNPQRTUVWXY346789';

function randomCode(len = 5) {
  let out = '';
  for (let i = 0; i < len; i++) out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return out;
}

/** Bangun daftar "stop" (kelompok nota per pelanggan) + item di dalamnya,
 * lengkap dengan lokasi rak -- dipakai untuk armada pengiriman maupun untuk
 * kelompok "Titipan Gudang" (nota Amsen Titip yang tidak dikirim pakai armada). */
function buildStopsPayload(ids, ordersMap, warehouseLocations) {
  const stops = clusterOrders(ids, ordersMap);
  const totalStops = stops.length;
  return stops.map((stop, stopIdx) => {
    const members = stop.members.filter((id) => ordersMap[id]);
    const primary = ordersMap[members[0]];
    const comments = [];
    members.forEach((id) => {
      (ordersMap[id]?.comments || []).forEach((c) => {
        if (!comments.includes(c)) comments.push(c);
      });
    });
    const items = [];
    members.forEach((id) => {
      (ordersMap[id]?.lines || []).forEach((line) => {
        const locations = warehouseLocations ? lookupLocations(warehouseLocations, line.itemNo).slice(0, 3) : [];
        items.push({
          npno: id,
          itemNo: line.itemNo || '',
          itemName: line.itemName || line.itemNo || '(tanpa nama)',
          qty: line.qty || 0,
          uom: line.uom || '',
          locations: locations.map((l) => ({
            storageLocationId: l.storageLocationId,
            zoneId: l.zoneId || '',
            qty: l.qty || 0,
          })),
        });
      });
    });

    return {
      npnos: members,
      stopNo: stopIdx + 1,
      loadOrder: totalStops - stopIdx,
      customer: primary?.customer || '',
      address: primary?.address || '',
      address2: primary?.address2 || '',
      phone: primary?.phone || '',
      comments,
      priorityRit1: members.some((id) => ordersMap[id]?.priorityRit1),
      isMultiNota: members.length > 1,
      items,
    };
  });
}

/**
 * Rakit snapshot manifest (armada -> stop -> item) yang siap dikirim ke
 * Realtime Database untuk dibaca ulang oleh Tampilan Operator (PickerView).
 * Struktur & urutan stop sama persis dengan yang dipakai ManifestSection
 * layar/cetak (clusterOrders yang sama), supaya operator lihat urutan Rit
 * yang sama dengan yang dicetak untuk supir. Kalau ada `gudangIds` (nota
 * "Amsen Titip" yang dititip di gudang, bukan dikirim pakai armada), itu
 * disisipkan sebagai "armada" ke-N khusus supaya operator bisa lihat &
 * checklist dengan tampilan yang sama persis (Ringkasan / Per Stop).
 */
export function buildManifestSnapshot({ drivers, assignments, ordersMap, selectedDate, warehouseLocations, gudangIds = [] }) {
  const vehicles = drivers.map((vehicle, vIdx) => {
    const assignedIds = assignments[vIdx] || [];
    const stopPayload = buildStopsPayload(assignedIds, ordersMap, warehouseLocations);
    const totalWeightKg = assignedIds.reduce((sum, id) => sum + (ordersMap[id]?.totalWeightKg || 0), 0);
    const totalCubageM3 = assignedIds.reduce((sum, id) => sum + (ordersMap[id]?.totalCubageM3 || 0), 0);

    return {
      vehicle: vehicle.vehicle || '',
      plate: vehicle.plate || '',
      driver: vehicle.driver || '',
      totalWeightKg,
      totalCubageM3,
      stopCount: stopPayload.length,
      stops: stopPayload,
    };
  });

  if (gudangIds.length > 0) {
    const gudangStops = buildStopsPayload(gudangIds, ordersMap, warehouseLocations);
    vehicles.push({
      vehicle: 'Titipan Gudang',
      plate: '-',
      driver: '-',
      isGudang: true,
      totalWeightKg: 0,
      totalCubageM3: 0,
      stopCount: gudangStops.length,
      stops: gudangStops,
    });
  }

  return {
    selectedDate,
    vehicles: vehicles.filter((v) => v.stops.length > 0),
  };
}

/** Simpan snapshot ke Realtime Database & kembalikan kode pendek untuk dibagikan ke operator. */
export async function sendManifestSnapshot(payload) {
  if (!isFirebaseConfigured) {
    throw new Error('Sinkronisasi belum di-setup. Lihat PANDUAN_OPERATOR_GUDANG.md untuk cara mengaktifkannya.');
  }
  const db = getDb();
  const code = randomCode();
  await set(ref(db, `manifests/${code}`), {
    ...payload,
    // Dicocokkan ke Realtime Database Security Rules (lihat
    // PANDUAN_OPERATOR_GUDANG.md) supaya path "manifests" tidak bisa ditulis
    // sembarangan oleh bot yang mengetahui nama project-nya, walau tanpa
    // login/auth.
    appToken: import.meta.env.VITE_APP_WRITE_TOKEN || '',
    sentAt: serverTimestamp(),
  });
  return code;
}

/** Ambil snapshot manifest dari Realtime Database berdasarkan kode (dipakai PickerView). */
export async function fetchManifestSnapshot(code) {
  if (!isFirebaseConfigured) {
    throw new Error('Sinkronisasi belum di-setup di aplikasi ini.');
  }
  const db = getDb();
  const snap = await get(ref(db, `manifests/${code}`));
  if (!snap.exists()) return null;
  return snap.val();
}
