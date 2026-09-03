// =============================================================================
// Algoritma Auto Mapping (alokasi + routing armada)
// =============================================================================
// Direkonstruksi dari bundle asli (fungsi-fungsi minified: eo, Iv, Bv, Uv, jv,
// Gv, Hv, Pv). Tahapannya:
//
//   1. clusterOrders()   -> gabungkan nota (NPno) yang kemungkinan satu
//                           pelanggan/satu titik antar (nama sama ATAU no HP
//                           sama) memakai union-find, supaya beberapa nota
//                           yang dikirim ke alamat yang sama dihitung sebagai
//                           SATU stop, bukan dikunjungi berkali-kali.
//   2. groupFleetRows()  -> gabungkan baris armada mentah (yang bisa berisi
//                           beberapa "RIT" untuk driver+plat yang sama) jadi
//                           satu entri per kendaraan dengan hitungan rit yang
//                           sudah ada.
//   3. autoAllocate()    -> alokasikan cluster ke armada dengan pendekatan
//                           greedy nearest-neighbor (per armada, selalu
//                           ambil stop TERDEKAT dari posisi terakhirnya yang
//                           masih muat kapasitas). Kalau semua armada sudah
//                           penuh tapi masih ada sisa order yang muat di
//                           kapasitas dasar sebuah armada, buat "Rit"
//                           tambahan (maks. 8 rit total per driver+plat).
//   4. optimize2Opt()    -> setelah urutan stop kasar terbentuk, rapikan
//                           dengan 2-opt (tukar-menukar segmen rute) supaya
//                           jaraknya lebih pendek.
//   5. orderByNearest()  -> untuk nota-nota di dalam satu cluster, urutkan
//                           juga berdasarkan jarak dari posisi berjalan.
//
// Semua unit jarak pakai kilometer (Haversine, asumsi bumi bulat).
// =============================================================================

/** Kunci unik satu baris armada (dipakai untuk checklist armada aktif). */
export function fleetRowKey(row) {
  return `${row.driver}|${row.vehicle}|${row.plate}`;
}

/** Jarak Haversine antara dua koordinat, dalam kilometer. */
export function haversineKm(lat1, lng1, lat2, lng2) {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Normalisasi nama pelanggan untuk pencocokan cluster (trim, upper, spasi tunggal). */
export function normalizeCustomerName(name) {
  return (name || '').trim().toUpperCase().replace(/\s+/g, ' ');
}

/** Normalisasi nomor HP Indonesia ke format lokal berawalan "0". */
export function normalizePhone(phone) {
  let digits = (phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('62')) digits = '0' + digits.slice(2);
  else if (digits.startsWith('8')) digits = '0' + digits;
  return digits;
}

/**
 * Kelompokkan daftar NPno menjadi cluster stop pengiriman, memakai
 * union-find: dua nota digabung kalau nama pelanggan (dinormalisasi) SAMA
 * atau nomor HP (dinormalisasi) SAMA.
 *
 * @param {string[]} orderIds - daftar NPno yang akan dikelompokkan
 * @param {Record<string, object>} ordersMap - NPno -> detail order teragregasi
 *   (harus punya: customer, phone, lat, lng, totalWeightKg, totalCubageM3)
 * @returns {Array<{members:string[], validMembers:string[], zeroMembers:string[], lat:number|null, lng:number|null, totalWeightKg:number, totalCubageM3:number}>}
 */
export function clusterOrders(orderIds, ordersMap) {
  const parent = {};
  orderIds.forEach((id) => (parent[id] = id));

  function find(x) {
    let root = x;
    while (parent[root] !== root) root = parent[root];
    let cur = x;
    while (cur !== root) {
      const next = parent[cur];
      parent[cur] = root;
      cur = next;
    }
    return root;
  }
  function union(a, b) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  }

  const byName = {};
  const byPhone = {};
  orderIds.forEach((id) => {
    const order = ordersMap[id];
    const name = normalizeCustomerName(order.customer);
    if (name) {
      if (byName[name] !== undefined) union(id, byName[name]);
      else byName[name] = id;
    }
    const phone = normalizePhone(order.phone);
    if (phone) {
      if (byPhone[phone] !== undefined) union(id, byPhone[phone]);
      else byPhone[phone] = id;
    }
  });

  const groups = {};
  orderIds.forEach((id) => {
    const root = find(id);
    if (!groups[root]) groups[root] = [];
    groups[root].push(id);
  });

  return Object.values(groups).map((members) => {
    const validMembers = members.filter((id) => {
      const o = ordersMap[id];
      return o.lat && o.lng && o.lat !== 0 && o.lng !== 0;
    });
    const zeroMembers = members.filter((id) => !validMembers.includes(id));
    let lat = null;
    let lng = null;
    if (validMembers.length > 0) {
      lat = validMembers.reduce((sum, id) => sum + ordersMap[id].lat, 0) / validMembers.length;
      lng = validMembers.reduce((sum, id) => sum + ordersMap[id].lng, 0) / validMembers.length;
    }
    return {
      members,
      validMembers,
      zeroMembers,
      lat,
      lng,
      totalWeightKg: members.reduce((sum, id) => sum + ordersMap[id].totalWeightKg, 0),
      totalCubageM3: members.reduce((sum, id) => sum + ordersMap[id].totalCubageM3, 0),
    };
  });
}

/**
 * Gabungkan baris armada mentah (yang bisa berisi beberapa RIT untuk
 * driver+plat yang sama) menjadi satu entri per kendaraan dasar.
 */
export function groupFleetRows(fleetRows) {
  const map = {};
  const order = [];
  fleetRows.forEach((row) => {
    const key = `${row.driver}|${row.plate}`;
    if (!map[key]) {
      map[key] = {
        driver: row.driver,
        plate: row.plate,
        capWeightKg: row.capWeightKg,
        capCubageM3: row.capCubageM3,
        baseName: (row.vehicle || '').replace(/\s*RIT\s*\d+\s*$/i, '').trim() || row.vehicle,
        existingRits: 0,
      };
      order.push(key);
    }
    map[key].existingRits++;
  });
  return order.map((key) => map[key]);
}

const MAX_RITS_PER_VEHICLE = 8; // batas keras jumlah rit (trip) per driver+plat
const MAX_ITERATIONS = 20000; // pengaman anti infinite-loop

/**
 * Alokasikan cluster stop ke armada aktif dengan greedy nearest-neighbor,
 * membuat rit tambahan otomatis kalau perlu (maks MAX_RITS_PER_VEHICLE).
 *
 * @param {string[]} orderIds - NPno yang mau dialokasikan (sudah difilter tanggal & exclude amsen)
 * @param {Record<string, object>} ordersMap - detail order teragregasi per NPno
 * @param {Array} activeFleet - baris armada yang dicentang aktif
 * @param {{lat:number, lng:number}} startPoint - koordinat gudang
 * @param {number} maxLoadPercent - 30-100, batas beban maksimal (safety margin)
 * @returns {{drivers: Array, assignments: string[][], unallocated: string[]}}
 */
export function autoAllocate(orderIds, ordersMap, activeFleet, startPoint, maxLoadPercent) {
  const loadFactor = maxLoadPercent / 100;
  const clusters = clusterOrders(orderIds, ordersMap);
  const withCoords = clusters.filter((c) => c.lat !== null);
  const withoutCoords = clusters.filter((c) => c.lat === null);

  const vehicles = activeFleet.map((v) => ({ ...v }));
  const baseVehicles = groupFleetRows(vehicles);
  const ritCounts = {};
  baseVehicles.forEach((v) => {
    ritCounts[`${v.driver}|${v.plate}`] = v.existingRits;
  });

  const pending = [...withCoords];
  const assignments = vehicles.map(() => []);
  const routeState = vehicles.map((v) => ({
    curLat: startPoint.lat,
    curLng: startPoint.lng,
    remW: v.capWeightKg * loadFactor,
    remC: v.capCubageM3 * loadFactor,
    routeClusters: [],
  }));

  let iterations = 0;
  while (pending.length > 0 && iterations < MAX_ITERATIONS) {
    let assignedSomething = false;

    for (let k = 0; k < vehicles.length && pending.length > 0; k++) {
      iterations++;
      const state = routeState[k];
      let bestIdx = -1;
      let bestDist = Infinity;

      pending.forEach((cluster, idx) => {
        if (
          cluster.totalWeightKg > state.remW + 1e-9 ||
          cluster.totalCubageM3 > state.remC + 1e-9
        ) {
          return;
        }
        const dist = haversineKm(state.curLat, state.curLng, cluster.lat, cluster.lng);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = idx;
        }
      });

      if (bestIdx !== -1) {
        const cluster = pending.splice(bestIdx, 1)[0];
        state.routeClusters.push(cluster);
        state.remW -= cluster.totalWeightKg;
        state.remC -= cluster.totalCubageM3;
        state.curLat = cluster.lat;
        state.curLng = cluster.lng;
        assignedSomething = true;
      }
    }

    if (!assignedSomething) {
      // Semua armada aktif penuh untuk pass ini. Coba tambah rit baru kalau
      // masih ada order yang muat di kapasitas DASAR sebuah kendaraan.
      let createdRit = false;
      baseVehicles.forEach((base) => {
        const key = `${base.driver}|${base.plate}`;
        const canAddMore = ritCounts[key] < base.existingRits + MAX_RITS_PER_VEHICLE;
        const somethingFits = pending.some(
          (c) =>
            c.totalWeightKg <= base.capWeightKg * loadFactor + 1e-9 &&
            c.totalCubageM3 <= base.capCubageM3 * loadFactor + 1e-9
        );
        if (!canAddMore || !somethingFits) return;

        ritCounts[key]++;
        const newVehicle = {
          driver: base.driver,
          plate: base.plate,
          capWeightKg: base.capWeightKg,
          capCubageM3: base.capCubageM3,
          vehicle: `${base.baseName} RIT ${ritCounts[key]}`,
        };
        vehicles.push(newVehicle);
        assignments.push([]);
        routeState.push({
          curLat: startPoint.lat,
          curLng: startPoint.lng,
          remW: newVehicle.capWeightKg * loadFactor,
          remC: newVehicle.capCubageM3 * loadFactor,
          routeClusters: [],
        });
        createdRit = true;
      });
      if (!createdRit) break; // benar-benar tidak ada lagi yang bisa dialokasikan
    }
  }

  // Rapikan urutan stop per armada (2-opt), lalu jabarkan tiap cluster
  // menjadi daftar NPno berurutan (nearest-neighbor di dalam cluster).
  vehicles.forEach((_, k) => {
    const orderedClusters = optimize2Opt(routeState[k].routeClusters, startPoint);
    let curLat = startPoint.lat;
    let curLng = startPoint.lng;
    orderedClusters.forEach((cluster) => {
      const orderedMembers = orderByNearest(cluster.validMembers, curLat, curLng, ordersMap);
      orderedMembers.forEach((id) => assignments[k].push(id));
      cluster.zeroMembers.forEach((id) => assignments[k].push(id));
      if (orderedMembers.length > 0) {
        const last = ordersMap[orderedMembers[orderedMembers.length - 1]];
        curLat = last.lat;
        curLng = last.lng;
      }
    });
  });

  const stillPending = pending.reduce((acc, c) => acc.concat(c.members), []);
  const noCoords = withoutCoords.reduce((acc, c) => acc.concat(c.members), []);

  return {
    drivers: vehicles,
    assignments,
    unallocated: stillPending.concat(noCoords),
  };
}

/**
 * Urutkan anggota satu cluster (NPno-NPno di alamat yang sama) dengan
 * nearest-neighbor sederhana relatif ke posisi berjalan.
 */
export function orderByNearest(memberIds, curLat, curLng, ordersMap) {
  const remaining = [...memberIds];
  const ordered = [];
  let lat = curLat;
  let lng = curLng;
  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    remaining.forEach((id, idx) => {
      const o = ordersMap[id];
      const dist = haversineKm(lat, lng, o.lat, o.lng);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = idx;
      }
    });
    const id = remaining.splice(bestIdx, 1)[0];
    ordered.push(id);
    const o = ordersMap[id];
    lat = o.lat;
    lng = o.lng;
  }
  return ordered;
}

/**
 * Perbaikan rute 2-opt: tukar segmen kalau itu memperpendek jarak total.
 * Maks 100 iterasi supaya tetap cepat untuk rute yang wajar (belasan stop).
 */
export function optimize2Opt(clusters, startPoint) {
  if (clusters.length < 3) return clusters;
  const route = [...clusters];
  const dist = (a, b) => haversineKm(a[0], a[1], b[0], b[1]);
  const point = (c) => [c.lat || 0, c.lng || 0];

  let improved = true;
  let iterations = 0;
  const maxIterations = 100;

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;
    for (let i = 0; i < route.length - 1; i++) {
      const before = i === 0 ? [startPoint.lat, startPoint.lng] : point(route[i - 1]);
      const a = point(route[i]);
      for (let j = i + 1; j < route.length; j++) {
        const b = point(route[j]);
        const after = j === route.length - 1 ? null : point(route[j + 1]);
        const currentDist = dist(before, a) + (after ? dist(b, after) : 0);
        const swappedDist = dist(before, b) + (after ? dist(a, after) : 0);
        if (swappedDist + 1e-9 < currentDist) {
          let lo = i;
          let hi = j;
          while (lo < hi) {
            const tmp = route[lo];
            route[lo] = route[hi];
            route[hi] = tmp;
            lo++;
            hi--;
          }
          improved = true;
          break;
        }
      }
      if (improved) break;
    }
  }
  return route;
}
