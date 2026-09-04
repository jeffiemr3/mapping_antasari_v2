import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
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

/**
 * Rakit snapshot manifest (armada -> stop -> item) yang siap dikirim ke
 * Firestore untuk dibaca ulang oleh Tampilan Operator (PickerView). Struktur
 * & urutan stop sama persis dengan yang dipakai ManifestSection layar/cetak
 * (clusterOrders yang sama), supaya operator lihat urutan Rit yang sama
 * dengan yang dicetak untuk supir.
 */
export function buildManifestSnapshot({ drivers, assignments, ordersMap, selectedDate, warehouseLocations }) {
  const vehicles = drivers.map((vehicle, vIdx) => {
    const assignedIds = assignments[vIdx] || [];
    const stops = clusterOrders(assignedIds, ordersMap);
    const totalStops = stops.length;

    const stopPayload = stops.map((stop, stopIdx) => {
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

  return {
    selectedDate,
    vehicles: vehicles.filter((v) => v.stops.length > 0),
  };
}

/** Simpan snapshot ke Firestore & kembalikan kode pendek untuk dibagikan ke operator. */
export async function sendManifestSnapshot(payload) {
  if (!isFirebaseConfigured) {
    throw new Error('Sinkronisasi belum di-setup. Lihat PANDUAN_OPERATOR_GUDANG.md untuk cara mengaktifkannya.');
  }
  const db = getDb();
  const code = randomCode();
  await setDoc(doc(db, 'manifests', code), {
    ...payload,
    // Dicocokkan ke Firestore Security Rules (lihat PANDUAN_OPERATOR_GUDANG.md)
    // supaya collection "manifests" tidak bisa ditulis sembarangan oleh bot
    // yang mengetahui nama collection-nya, walau tanpa login/auth.
    appToken: import.meta.env.VITE_APP_WRITE_TOKEN || '',
    sentAt: serverTimestamp(),
  });
  return code;
}

/** Ambil snapshot manifest dari Firestore berdasarkan kode (dipakai PickerView). */
export async function fetchManifestSnapshot(code) {
  if (!isFirebaseConfigured) {
    throw new Error('Sinkronisasi belum di-setup di aplikasi ini.');
  }
  const db = getDb();
  const snap = await getDoc(doc(db, 'manifests', code));
  if (!snap.exists()) return null;
  return snap.data();
}
