import { useEffect, useMemo, useState } from 'react';
import { Truck, Lock, Save, CloudDownload } from 'lucide-react';

import Header from './components/Header';
import Toolbar from './components/Toolbar';
import FleetPicker from './components/FleetPicker';
import StatsRow from './components/StatsRow';
import FleetOverviewCard from './components/FleetOverviewCard';
import AmsenExclusionSection from './components/AmsenExclusionSection';
import GudangSection from './components/GudangSection';
import UnallocatedList from './components/UnallocatedList';
import ReschedulePanel from './components/ReschedulePanel';
import MapView from './components/MapView';
import ManifestSection from './components/ManifestSection';
import SettingsModal from './components/SettingsModal';
import AddVehicleModal from './components/AddVehicleModal';
import SizeWeightModal from './components/SizeWeightModal';
import SplitNotaModal from './components/SplitNotaModal';
import EditStopModal from './components/EditStopModal';
import Footer from './components/Footer';

import { useLocalStorage } from './hooks/useLocalStorage';
import { useOrders } from './hooks/useOrders';
import { useTheme } from './hooks/useTheme';
import { STORAGE_KEYS } from './utils/storage';
import { autoAllocate, fleetRowKey } from './utils/allocation';
import { findOversizedSingleOrders } from './utils/allocation';
import { splitOrderInRawLines } from './utils/splitNota';
import { getOrPromptApiKey, geocodeAddress } from './utils/geocode';
import { saveSharedData, loadSharedData } from './utils/sharedDataSync';
import { isFirebaseConfigured } from './lib/firebase';
import { DEFAULT_WAREHOUSE } from './data/constants';
import { toDDMMYYYY } from './utils/format';
import fleetSeed from './data/fleetSeed.json';
import sizeWeightSeed from './data/sizeWeightSeed.json';

const EMPTY_DISPATCH = { drivers: [], assignments: [], unallocated: [], gudangIds: [], lockedVehicleKeys: [] };

export default function App() {
  const { theme, toggleTheme } = useTheme();

  // ---- Data mentah (persisten di localStorage) ---------------------------
  const [rawLines, setRawLines] = useLocalStorage(STORAGE_KEYS.ORDERS, []);
  const [customCatalog, setCustomCatalog] = useLocalStorage('m10_custom_catalog', {});
  const [sizeWeightRows, setSizeWeightRows] = useLocalStorage('m10_size_weight_master', sizeWeightSeed);
  const [fleetRows, setFleetRows] = useLocalStorage(STORAGE_KEYS.FLEET, fleetSeed);
  const [warehouse, setWarehouse] = useLocalStorage(STORAGE_KEYS.WAREHOUSE, DEFAULT_WAREHOUSE);
  const [warehouseLocations, setWarehouseLocations] = useLocalStorage(STORAGE_KEYS.WAREHOUSE_LOCATIONS, null);
  const [dispatch, setDispatch] = useLocalStorage(STORAGE_KEYS.ALLOCATIONS, EMPTY_DISPATCH);
  const [orderOverrides, setOrderOverrides] = useLocalStorage(STORAGE_KEYS.ORDER_OVERRIDES, {});

  // ---- Pengaturan tampilan (persisten) ------------------------------------
  const [selectedDate, setSelectedDate] = useLocalStorage('m10_selected_date', toDDMMYYYY(new Date()));
  const [cumulativeMode, setCumulativeMode] = useLocalStorage('m10_cumulative_mode', true);
  const [excludeAmsen, setExcludeAmsen] = useLocalStorage('m10_exclude_amsen', true);
  const [maxLoadPercent, setMaxLoadPercent] = useLocalStorage('m10_max_load_percent', 100);
  const [activeFleetKeysArray, setActiveFleetKeysArray] = useLocalStorage('m10_active_fleet_keys', null);

  // ---- State transien (tidak perlu disimpan) ------------------------------
  const [focusedVehicleIdx, setFocusedVehicleIdx] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addVehicleOpen, setAddVehicleOpen] = useState(false);
  // 'idle' | 'loading' | 'synced' | 'local-only' | 'error'
  const [cloudSyncStatus, setCloudSyncStatus] = useState('idle');
  // Kapan Penjualan (OTS NP) & Lokasi Gudang (SWBL) terakhir diupdate -
  // ditampilkan di tombol header. Disimpan juga di localStorage supaya
  // tetap kelihatan walau reload sebelum Firebase selesai dicek.
  const [ordersUpdatedAt, setOrdersUpdatedAt] = useLocalStorage('m10_orders_updated_at', null);
  const [warehouseLocationsUpdatedAt, setWarehouseLocationsUpdatedAt] = useLocalStorage(
    'm10_warehouse_locations_updated_at',
    null
  );

  // Begitu app dibuka, tarik dulu versi Penjualan & Lokasi Gudang TERAKHIR
  // yang pernah diupload (dari device manapun) dari Firebase - supaya tidak
  // perlu upload ulang tiap ganti device/browser. Kalau Firebase belum
  // di-setup atau belum ada data di sana sama sekali, diam-diam tetap pakai
  // apa yang ada di localStorage seperti biasa (tidak mengganggu).
  useEffect(() => {
    if (!isFirebaseConfigured) {
      setCloudSyncStatus('local-only');
      return;
    }
    let cancelled = false;
    setCloudSyncStatus('loading');
    const wasDispatchEmpty = dispatch.drivers.length === 0;
    Promise.all([
      loadSharedData('orders'),
      loadSharedData('warehouseLocations'),
      loadSharedData('fleet'),
      loadSharedData('dispatch'),
    ])
      .then(([ordersResult, locationsResult, fleetResult, dispatchResult]) => {
        if (cancelled) return;
        if (ordersResult?.data) {
          // Cuma reset alokasi kalau datanya BEDA dari yang sudah ada di
          // localStorage device ini - supaya buka/refresh app biasa (data
          // di Firebase = data lokal, kasus paling umum) tidak menghapus
          // hasil Auto Mapping yang sedang dikerjakan tanpa alasan.
          const changed = JSON.stringify(ordersResult.data) !== JSON.stringify(rawLines);
          setRawLines(ordersResult.data);
          if (changed) setDispatch(EMPTY_DISPATCH);
          if (ordersResult.updatedAt) setOrdersUpdatedAt(ordersResult.updatedAt);
        }
        if (locationsResult?.data) {
          setWarehouseLocations(locationsResult.data);
          if (locationsResult.updatedAt) setWarehouseLocationsUpdatedAt(locationsResult.updatedAt);
        }
        if (fleetResult?.data) setFleetRows(fleetResult.data);
        // Mapping (dispatch) itu hasil kerja aktif, bukan sekadar data
        // referensi - jadi HANYA diambil otomatis kalau device ini belum
        // punya alokasi sama sekali (device baru/fresh). Kalau device ini
        // sudah ada kerjaan jalan, biarkan lokal - user bisa tarik manual
        // lewat tombol "Muat dari Cloud" kalau memang mau menimpa.
        if (dispatchResult?.data && wasDispatchEmpty) {
          setDispatch(dispatchResult.data);
        }
        setCloudSyncStatus('synced');
      })
      .catch(() => {
        if (!cancelled) setCloudSyncStatus('error');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Simpan daftar armada terbaru ke Firebase (dipanggil setiap kali fleetRows berubah). */
  async function syncFleetToFirebase(newFleetRows) {
    if (!isFirebaseConfigured) return;
    setCloudSyncStatus('loading');
    try {
      await saveSharedData('fleet', newFleetRows);
      setCloudSyncStatus('synced');
    } catch {
      setCloudSyncStatus('error');
    }
  }

  /** Dipanggil Header setelah rawLines baru berhasil di-parse dari file upload. */
  async function handleRawLinesUploaded(newRawLines) {
    setRawLines(newRawLines);
    // Hasil alokasi/manifest lama bisa saja menunjuk ke NPno yang sudah
    // tidak ada lagi di data baru (mis. tanggal yang sama tapi isi notanya
    // beda) - kalau dibiarkan, komponen lain yang baca ordersMap[npnoLama]
    // akan dapat undefined dan bisa crash. Reset alokasi supaya dispatcher
    // jalankan ulang Auto Mapping dengan data yang sudah pasti sinkron.
    setDispatch(EMPTY_DISPATCH);
    setOrdersUpdatedAt(Date.now());
    if (!isFirebaseConfigured) return;
    setCloudSyncStatus('loading');
    try {
      await saveSharedData('orders', newRawLines);
      setCloudSyncStatus('synced');
    } catch {
      setCloudSyncStatus('error');
    }
  }

  /** Dipanggil Header setelah data Lokasi Gudang baru berhasil di-parse dari file upload. */
  async function handleWarehouseLocationsUploaded(newIndex) {
    setWarehouseLocations(newIndex);
    setWarehouseLocationsUpdatedAt(Date.now());
    if (!isFirebaseConfigured) return;
    setCloudSyncStatus('loading');
    try {
      await saveSharedData('warehouseLocations', newIndex);
      setCloudSyncStatus('synced');
    } catch {
      setCloudSyncStatus('error');
    }
  }
  const [sizeWeightOpen, setSizeWeightOpen] = useState(false);
  const [splitNotaId, setSplitNotaId] = useState(null);
  const [geocodingId, setGeocodingId] = useState(null);
  const [geocodeError, setGeocodeError] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null); // { id, vehicleIdx }

  const activeFleetKeys = useMemo(
    () => new Set(activeFleetKeysArray ?? fleetRows.map(fleetRowKey)),
    [activeFleetKeysArray, fleetRows]
  );
  function setActiveFleetKeys(setValue) {
    setActiveFleetKeysArray(Array.from(setValue));
  }

  const { ordersMap, orderIdsForDate } = useOrders({
    rawLines,
    customCatalog,
    sizeWeightRows,
    selectedDate,
    cumulativeMode,
    overrides: orderOverrides,
  });

  const allAssignedIds = useMemo(() => new Set(dispatch.assignments.flat()), [dispatch.assignments]);
  const gudangIds = useMemo(() => dispatch.gudangIds || [], [dispatch.gudangIds]);
  const gudangIdSet = useMemo(() => new Set(gudangIds), [gudangIds]);

  const amsenIdsToShow = useMemo(() => {
    if (!excludeAmsen) return [];
    return orderIdsForDate.filter(
      (id) => ordersMap[id]?.hasAmsenComment && !allAssignedIds.has(id) && !gudangIdSet.has(id)
    );
  }, [excludeAmsen, orderIdsForDate, ordersMap, allAssignedIds, gudangIdSet]);

  const unallocatedIdsToShow = useMemo(
    () => dispatch.unallocated.filter((id) => !allAssignedIds.has(id) && ordersMap[id]),
    [dispatch.unallocated, allAssignedIds, ordersMap]
  );

  const oversizedIds = useMemo(
    () => findOversizedSingleOrders(unallocatedIdsToShow, ordersMap, getActiveFleetRows(), maxLoadPercent),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [unallocatedIdsToShow, ordersMap, fleetRows, activeFleetKeys, maxLoadPercent]
  );

  const totalWeightForDate = useMemo(
    () => orderIdsForDate.reduce((sum, id) => sum + (ordersMap[id]?.totalWeightKg || 0), 0),
    [orderIdsForDate, ordersMap]
  );
  const totalCubageForDate = useMemo(
    () => orderIdsForDate.reduce((sum, id) => sum + (ordersMap[id]?.totalCubageM3 || 0), 0),
    [orderIdsForDate, ordersMap]
  );

  function getEligibleIds() {
    return orderIdsForDate.filter((id) => !(excludeAmsen && ordersMap[id]?.hasAmsenComment));
  }
  function getActiveFleetRows() {
    return fleetRows.filter((row) => activeFleetKeys.has(fleetRowKey(row)));
  }

  /** Cek apakah SATU armada tertentu sedang dikunci (dibandingkan lewat
   * fleetRowKey supaya tetap akurat walau urutan armada berubah). */
  function isVehicleLocked(vehicle) {
    return (dispatch.lockedVehicleKeys || []).includes(fleetRowKey(vehicle));
  }

  /** Tolak aksi yang menyentuh armada tertentu kalau armada itu terkunci. */
  function guardVehicleLocked(vehicleIdx) {
    const vehicle = dispatch.drivers[vehicleIdx];
    if (vehicle && isVehicleLocked(vehicle)) {
      alert(`Rute "${vehicle.vehicle}" sedang dikunci 🔒 — buka kunci dulu (ikon gembok di kartu armadanya) kalau mau mengubah.`);
      return true;
    }
    return false;
  }

  function handleAutoMapping() {
    const lockedKeys = new Set(dispatch.lockedVehicleKeys || []);
    const lockedIdx = dispatch.drivers
      .map((v, i) => (lockedKeys.has(fleetRowKey(v)) ? i : -1))
      .filter((i) => i !== -1);
    const lockedVehicles = lockedIdx.map((i) => dispatch.drivers[i]);
    const lockedAssignments = lockedIdx.map((i) => dispatch.assignments[i] || []);
    const lockedOrderIds = new Set(lockedAssignments.flat());

    const eligible = getEligibleIds().filter((id) => !lockedOrderIds.has(id));
    const activeFleet = getActiveFleetRows().filter((r) => !lockedKeys.has(fleetRowKey(r)));
    const result = autoAllocate(eligible, ordersMap, activeFleet, warehouse, maxLoadPercent);

    // Armada yang terkunci dipertahankan APA ADANYA (posisi & isinya), sisanya
    // diisi hasil algoritma yang baru - supaya rute yang sudah di-fix tidak
    // ikut berubah walau Auto Mapping dijalankan ulang untuk armada lain.
    setDispatch({
      drivers: [...lockedVehicles, ...result.drivers],
      assignments: [...lockedAssignments, ...result.assignments],
      unallocated: result.unallocated,
      gudangIds: dispatch.gudangIds || [],
      lockedVehicleKeys: dispatch.lockedVehicleKeys || [],
    });
    setFocusedVehicleIdx(null);
  }

  function handleReset() {
    const lockedKeys = new Set(dispatch.lockedVehicleKeys || []);
    const lockedIdx = dispatch.drivers
      .map((v, i) => (lockedKeys.has(fleetRowKey(v)) ? i : -1))
      .filter((i) => i !== -1);
    const lockedVehicles = lockedIdx.map((i) => dispatch.drivers[i]);
    const lockedAssignments = lockedIdx.map((i) => dispatch.assignments[i] || []);
    const lockedOrderIds = new Set(lockedAssignments.flat());

    const eligible = getEligibleIds().filter((id) => !lockedOrderIds.has(id));
    const activeFleet = getActiveFleetRows().filter((r) => !lockedKeys.has(fleetRowKey(r)));
    setDispatch({
      drivers: [...lockedVehicles, ...activeFleet.map((r) => ({ ...r }))],
      assignments: [...lockedAssignments, ...activeFleet.map(() => [])],
      unallocated: eligible,
      gudangIds: dispatch.gudangIds || [],
      lockedVehicleKeys: dispatch.lockedVehicleKeys || [],
    });
    setFocusedVehicleIdx(null);
  }

  function handleManualAllocate(orderId, vehicleIdx) {
    if (guardVehicleLocked(vehicleIdx)) return;
    setDispatch((d) => ({
      ...d,
      assignments: d.assignments.map((arr, i) => (i === vehicleIdx ? [...arr, orderId] : arr)),
      unallocated: d.unallocated.filter((id) => id !== orderId),
    }));
  }

  function handleMoveStop(orderId, fromIdx, toIdx) {
    if (guardVehicleLocked(fromIdx) || guardVehicleLocked(toIdx)) return;
    if (fromIdx === toIdx) return;
    setDispatch((d) => ({
      ...d,
      assignments: d.assignments.map((arr, i) => {
        if (i === fromIdx) return arr.filter((id) => id !== orderId);
        if (i === toIdx) return [...arr, orderId];
        return arr;
      }),
    }));
  }

  /** Keluarkan nota dari rute armada -> kembali ke "Belum Teralokasi" (mis. pelanggan minta reschedule). */
  function handleRemoveStop(orderId, fromIdx) {
    if (guardVehicleLocked(fromIdx)) return;
    setDispatch((d) => ({
      ...d,
      assignments: d.assignments.map((arr, i) => (i === fromIdx ? arr.filter((id) => id !== orderId) : arr)),
      unallocated: d.unallocated.includes(orderId) ? d.unallocated : [...d.unallocated, orderId],
    }));
  }

  /** Titip nota "Amsen" ke Gudang (bukan dikirim pakai armada). Nanti ikut
   * terkirim ke operator sebagai tab "Titipan Gudang" tersendiri. */
  function handleAddToGudang(npno) {
    setDispatch((d) => {
      const current = d.gudangIds || [];
      if (current.includes(npno)) return d;
      return { ...d, gudangIds: [...current, npno] };
    });
  }

  function handleRemoveFromGudang(npno) {
    setDispatch((d) => ({ ...d, gudangIds: (d.gudangIds || []).filter((id) => id !== npno) }));
  }

  /** Kunci/buka-kunci SATU armada tertentu. Kalau dikunci: isinya tidak akan
   * ikut berubah walau Auto Mapping/Reset dijalankan ulang, dan tidak bisa
   * dipindah/dihapus/ditambah manual sampai dibuka lagi. */
  function handleToggleVehicleLock(vehicleIdx) {
    const vehicle = dispatch.drivers[vehicleIdx];
    if (!vehicle) return;
    const key = fleetRowKey(vehicle);
    setDispatch((d) => {
      const current = d.lockedVehicleKeys || [];
      const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
      const updated = { ...d, lockedVehicleKeys: next };
      syncDispatchToFirebase(updated);
      return updated;
    });
  }

  /** Hapus satu armada dari rute hari ini. Nota yang sudah dialokasikan otomatis
   * kembali ke "Belum Teralokasi" (karena tidak lagi ada di assignments manapun),
   * dan checklist-nya di panel "Pilih Armada & Supir" ikut tidak tercentang. */
  function handleRemoveVehicle(vehicleIdx) {
    if (guardVehicleLocked(vehicleIdx)) return;
    const removedVehicle = dispatch.drivers[vehicleIdx];
    setDispatch((d) => ({
      ...d,
      drivers: d.drivers.filter((_, i) => i !== vehicleIdx),
      assignments: d.assignments.filter((_, i) => i !== vehicleIdx),
    }));
    if (removedVehicle) {
      const next = new Set(activeFleetKeys);
      next.delete(fleetRowKey(removedVehicle));
      setActiveFleetKeys(next);
    }
    setFocusedVehicleIdx((f) => {
      if (f === null) return f;
      if (f === vehicleIdx) return null;
      if (f > vehicleIdx) return f - 1;
      return f;
    });
  }

  /** Simpan hasil mapping saat ini ke Firebase, supaya device lain (mis. HP
   * dispatcher kedua, atau operator) bisa buka & lihat hasil yang sama. */
  async function handleSaveMapping() {
    if (!isFirebaseConfigured) {
      alert('Firebase belum di-setup di aplikasi ini, jadi belum bisa disimpan ke cloud (cuma tersimpan lokal di device ini).');
      return;
    }
    const ok = await syncDispatchToFirebase(dispatch);
    if (ok) alert('Berhasil disimpan ke cloud ☁️ — bisa dibuka di device lain sekarang.');
    else alert('Gagal menyimpan ke cloud. Cek koneksi internet, atau Security Rules Firebase-nya.');
  }

  /** Ambil hasil mapping TERAKHIR yang tersimpan di Firebase (dari device
   * manapun), menimpa yang ada di device ini. Selalu minta konfirmasi dulu
   * karena ini aksi yang menimpa/menghapus kerjaan lokal yang belum disimpan. */
  async function handleLoadSavedMapping() {
    if (!isFirebaseConfigured) {
      alert('Firebase belum di-setup di aplikasi ini.');
      return;
    }
    const result = await loadSharedData('dispatch');
    if (!result?.data) {
      alert('Belum ada mapping tersimpan di cloud.');
      return;
    }
    if (!window.confirm('Ini akan menimpa mapping yang sedang kamu lihat di device ini dengan versi terakhir yang tersimpan di cloud. Lanjutkan?')) {
      return;
    }
    setDispatch(result.data);
    setFocusedVehicleIdx(null);
  }

  /** Simpan satu snapshot dispatch ke Firebase. Dipanggil manual (tombol
   * Simpan) maupun otomatis (toggle kunci) - selalu simpan versi TERBARU
   * yang ada di state, bukan yang lama. */
  async function syncDispatchToFirebase(dispatchToSave) {
    if (!isFirebaseConfigured) return false;
    setCloudSyncStatus('loading');
    try {
      await saveSharedData('dispatch', dispatchToSave);
      setCloudSyncStatus('synced');
      return true;
    } catch {
      setCloudSyncStatus('error');
      return false;
    }
  }

  /** Tambah satu armada baru (dari tombol "+ Tambah Armada"). Otomatis diaktifkan
   * kalau sebelumnya user sudah pernah menyunting pilihan armada aktif secara manual. */
  function handleAddVehicle(newRow) {
    const next = [...fleetRows, newRow];
    setFleetRows(next);
    syncFleetToFirebase(next);
    if (activeFleetKeysArray !== null) {
      setActiveFleetKeysArray([...activeFleetKeysArray, fleetRowKey(newRow)]);
    }
  }

  /** Hapus satu armada dari daftar (tombol tempat sampah di kartu armada). */
  function handleDeleteVehicle(rowToDelete) {
    const key = fleetRowKey(rowToDelete);
    const next = fleetRows.filter((r) => fleetRowKey(r) !== key);
    setFleetRows(next);
    syncFleetToFirebase(next);
    if (activeFleetKeysArray !== null) {
      setActiveFleetKeysArray(activeFleetKeysArray.filter((k) => k !== key));
    }
  }

  /** Simpan koreksi manual (nama pelanggan / nama barang / qty) dari popup peta. */
  function handleSaveOrderEdit(npno, { customer, lines }) {
    setOrderOverrides((prev) => ({
      ...prev,
      [npno]: { customer, lines },
    }));
  }

  /** Geser urutan drop satu langkah (naik = lebih awal, turun = lebih akhir) dalam armada yang sama. */
  function handleReorderStop(vehicleIdx, orderId, direction) {
    setDispatch((d) => ({
      ...d,
      assignments: d.assignments.map((arr, i) => {
        if (i !== vehicleIdx) return arr;
        const idx = arr.indexOf(orderId);
        const newIdx = idx + direction;
        if (idx === -1 || newIdx < 0 || newIdx >= arr.length) return arr;
        const next = [...arr];
        [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
        return next;
      }),
    }));
  }

  /** Pindahkan drop langsung ke posisi urutan tertentu (0-based) dalam armada yang sama. */
  function handleSetStopPosition(vehicleIdx, orderId, newIndex) {
    setDispatch((d) => ({
      ...d,
      assignments: d.assignments.map((arr, i) => {
        if (i !== vehicleIdx) return arr;
        const idx = arr.indexOf(orderId);
        if (idx === -1) return arr;
        const clamped = Math.max(0, Math.min(arr.length - 1, newIndex));
        if (clamped === idx) return arr;
        const next = [...arr];
        next.splice(idx, 1);
        next.splice(clamped, 0, orderId);
        return next;
      }),
    }));
  }

  /** Pindahkan tombol filter armada ke posisi urutan lain (dipakai mode "Atur Urutan" di peta). */
  function handleMoveVehicleToIndex(fromIdx, toIdx) {
    if (fromIdx === toIdx) return;
    setDispatch((d) => {
      const drivers = [...d.drivers];
      const assignments = [...d.assignments];
      const [movedDriver] = drivers.splice(fromIdx, 1);
      const [movedAssignment] = assignments.splice(fromIdx, 1);
      drivers.splice(toIdx, 0, movedDriver);
      assignments.splice(toIdx, 0, movedAssignment);
      return { ...d, drivers, assignments };
    });
    setFocusedVehicleIdx((f) => {
      if (f === null) return f;
      if (f === fromIdx) return toIdx;
      if (fromIdx < toIdx && f > fromIdx && f <= toIdx) return f - 1;
      if (fromIdx > toIdx && f >= toIdx && f < fromIdx) return f + 1;
      return f;
    });
  }

  function handleSplitOrder(quantities) {
    const npno = splitNotaId;
    if (!npno) return;
    setRawLines((lines) => splitOrderInRawLines(lines, npno, quantities));
    setDispatch((d) => {
      const withoutOld = d.unallocated.filter((id) => id !== npno);
      const numParts = quantities[0]?.length || 0;
      const newIds = Array.from({ length: numParts }, (_, i) => `${npno}-${String.fromCharCode(65 + i)}`);
      return { ...d, unallocated: [...withoutOld, ...newIds] };
    });
    setSplitNotaId(null);
  }

  async function handleGeocode(orderId) {
    const order = ordersMap[orderId];
    if (!order) return;
    const apiKey = getOrPromptApiKey();
    if (!apiKey) return;
    setGeocodingId(orderId);
    setGeocodeError(null);
    try {
      const result = await geocodeAddress(order, apiKey);
      setRawLines((lines) => lines.map((l) => (l.NPno === orderId ? { ...l, Lat: result.lat, Lng: result.lng } : l)));
    } catch (err) {
      setGeocodeError(err.message);
    } finally {
      setGeocodingId(null);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        rawLines={rawLines}
        onRawLinesChange={handleRawLinesUploaded}
        customCatalog={customCatalog}
        onCustomCatalogChange={setCustomCatalog}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenSizeWeight={() => setSizeWeightOpen(true)}
        warehouseLocations={warehouseLocations}
        onWarehouseLocationsChange={handleWarehouseLocationsUploaded}
        cloudSyncStatus={cloudSyncStatus}
        ordersUpdatedAt={ordersUpdatedAt}
        warehouseLocationsUpdatedAt={warehouseLocationsUpdatedAt}
      />

      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 space-y-4">
        <Toolbar
          selectedDate={selectedDate}
          onSelectedDateChange={setSelectedDate}
          warehouse={warehouse}
          onWarehouseChange={setWarehouse}
          maxLoadPercent={maxLoadPercent}
          onMaxLoadPercentChange={setMaxLoadPercent}
          cumulativeMode={cumulativeMode}
          onCumulativeModeChange={setCumulativeMode}
          excludeAmsen={excludeAmsen}
          onExcludeAmsenChange={setExcludeAmsen}
          onAutoMapping={handleAutoMapping}
          onReset={handleReset}
        />

        <FleetPicker
          fleetRows={fleetRows}
          activeFleetKeys={activeFleetKeys}
          onActiveFleetKeysChange={setActiveFleetKeys}
          onDeleteVehicle={handleDeleteVehicle}
          onAddVehicleClick={() => setAddVehicleOpen(true)}
        />

        <StatsRow
          totalNota={orderIdsForDate.length}
          allocatedCount={allAssignedIds.size}
          unallocatedCount={orderIdsForDate.length - allAssignedIds.size}
          totalWeightKg={totalWeightForDate}
          totalCubageM3={totalCubageForDate}
        />

        <section className="space-y-3 no-print">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-orange-500" />
              Armada Logistik ({dispatch.drivers.length} Rute Aktif)
              {(dispatch.lockedVehicleKeys || []).length > 0 && (
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400">
                  <Lock className="w-3 h-3" />
                  {dispatch.lockedVehicleKeys.length} Terkunci
                </span>
              )}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleLoadSavedMapping}
                title="Muat hasil mapping terakhir yang tersimpan di cloud (menimpa yang ada di device ini)"
                className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1c1d26] cursor-pointer"
              >
                <CloudDownload className="w-3.5 h-3.5" />
                Muat dari Cloud
              </button>
              <button
                onClick={handleSaveMapping}
                disabled={dispatch.drivers.length === 0}
                title="Simpan mapping saat ini ke cloud, supaya bisa dibuka di device lain"
                className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Save className="w-3.5 h-3.5" />
                Simpan
              </button>
            </div>
          </div>
          {dispatch.drivers.length === 0 ? (
            <p className="text-xs text-slate-500">
              Belum ada armada aktif. Import data nota, pilih tanggal, lalu klik &quot;Auto Mapping&quot;.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {dispatch.drivers.map((vehicle, idx) => (
                <FleetOverviewCard
                  key={idx}
                  vehicle={vehicle}
                  vehicleIndex={idx}
                  assignedIds={dispatch.assignments[idx] || []}
                  ordersMap={ordersMap}
                  isFocused={focusedVehicleIdx === idx}
                  onToggleFocus={() => setFocusedVehicleIdx((v) => (v === idx ? null : idx))}
                  onRemove={() => handleRemoveVehicle(idx)}
                  isLocked={isVehicleLocked(vehicle)}
                  onToggleLock={() => handleToggleVehicleLock(idx)}
                />
              ))}
            </div>
          )}
        </section>

        <AmsenExclusionSection
          orderIds={amsenIdsToShow}
          ordersMap={ordersMap}
          vehicles={dispatch.drivers}
          onManualAllocate={handleManualAllocate}
          onGeocode={handleGeocode}
          geocodingId={geocodingId}
          onAddToGudang={handleAddToGudang}
        />

        <GudangSection gudangIds={gudangIds} ordersMap={ordersMap} onRemoveFromGudang={handleRemoveFromGudang} />

        {geocodeError && <p className="text-xs text-rose-500 no-print">{geocodeError}</p>}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4 items-start">
          <div className="bg-white dark:bg-[#111218] border border-slate-200 dark:border-white/5 rounded-2xl p-3 no-print flex flex-col h-[430px] sm:h-[480px] lg:h-[560px]">
            <h4 className="font-display font-bold text-xs text-slate-900 dark:text-white mb-2 px-1 shrink-0">
              🗺️ Peta Jalur Rute Pengiriman
            </h4>
            <div className="flex-1 min-h-0">
              <MapView
                drivers={dispatch.drivers}
                assignments={dispatch.assignments}
                ordersMap={ordersMap}
                warehouse={warehouse}
                focusedVehicleIdx={focusedVehicleIdx}
                onFocusVehicle={setFocusedVehicleIdx}
                onEditOrder={(id, vehicleIdx, stopIdx, totalStops) =>
                  setEditingOrder({ id, vehicleIdx, stopIdx, totalStops })
                }
                onReorderStop={handleReorderStop}
                onMoveVehicleToIndex={handleMoveVehicleToIndex}
              />
            </div>
          </div>

          <div className="space-y-4">
            <ReschedulePanel rawLines={rawLines} onRawLinesChange={setRawLines} ordersMap={ordersMap} />
            <UnallocatedList
              unallocatedIds={unallocatedIdsToShow}
              ordersMap={ordersMap}
              vehicles={dispatch.drivers}
              onManualAllocate={handleManualAllocate}
              onGeocode={handleGeocode}
              geocodingId={geocodingId}
              oversizedIds={oversizedIds}
              onSplitNota={setSplitNotaId}
            />
          </div>
        </div>

        <ManifestSection
          drivers={dispatch.drivers}
          assignments={dispatch.assignments}
          ordersMap={ordersMap}
          selectedDate={selectedDate}
          onMoveStop={handleMoveStop}
          onRemoveStop={handleRemoveStop}
          focusedVehicleIdx={focusedVehicleIdx}
          warehouseLocations={warehouseLocations}
          gudangIds={gudangIds}
        />
      </main>

      <Footer />

      {settingsOpen && (
        <SettingsModal
          onClose={() => setSettingsOpen(false)}
          fleetRows={fleetRows}
          onFleetChange={(rows) => {
            setFleetRows(rows);
            syncFleetToFirebase(rows);
          }}
        />
      )}
      {addVehicleOpen && (
        <AddVehicleModal
          fleetRows={fleetRows}
          onAddVehicle={handleAddVehicle}
          onClose={() => setAddVehicleOpen(false)}
          onOpenAdvancedSettings={() => {
            setAddVehicleOpen(false);
            setSettingsOpen(true);
          }}
        />
      )}
      {sizeWeightOpen && (
        <SizeWeightModal onClose={() => setSizeWeightOpen(false)} rows={sizeWeightRows} onRowsChange={setSizeWeightRows} />
      )}
      {splitNotaId && ordersMap[splitNotaId] && (
        <SplitNotaModal order={ordersMap[splitNotaId]} onClose={() => setSplitNotaId(null)} onConfirm={handleSplitOrder} />
      )}
      {editingOrder && ordersMap[editingOrder.id] && (
        <EditStopModal
          order={ordersMap[editingOrder.id]}
          vehicles={dispatch.drivers}
          currentVehicleIdx={editingOrder.vehicleIdx}
          stopIdx={editingOrder.stopIdx}
          totalStops={editingOrder.totalStops}
          onClose={() => setEditingOrder(null)}
          onSave={handleSaveOrderEdit}
          onMoveVehicle={handleMoveStop}
          onSetPosition={handleSetStopPosition}
        />
      )}
    </div>
  );
}
