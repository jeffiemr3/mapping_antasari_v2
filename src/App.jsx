import { useEffect, useMemo, useState } from 'react';
import { PlusCircle, Truck } from 'lucide-react';

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

const EMPTY_DISPATCH = { drivers: [], assignments: [], unallocated: [], gudangIds: [] };

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
    Promise.all([loadSharedData('orders'), loadSharedData('warehouseLocations')])
      .then(([ordersResult, locationsResult]) => {
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

  function handleAutoMapping() {
    const eligible = getEligibleIds();
    const activeFleet = getActiveFleetRows();
    const result = autoAllocate(eligible, ordersMap, activeFleet, warehouse, maxLoadPercent);
    setDispatch(result);
    setFocusedVehicleIdx(null);
  }

  function handleReset() {
    const eligible = getEligibleIds();
    const activeFleet = getActiveFleetRows();
    setDispatch({
      drivers: activeFleet.map((r) => ({ ...r })),
      assignments: activeFleet.map(() => []),
      unallocated: eligible,
    });
    setFocusedVehicleIdx(null);
  }

  function handleManualAllocate(orderId, vehicleIdx) {
    setDispatch((d) => ({
      ...d,
      assignments: d.assignments.map((arr, i) => (i === vehicleIdx ? [...arr, orderId] : arr)),
      unallocated: d.unallocated.filter((id) => id !== orderId),
    }));
  }

  function handleMoveStop(orderId, fromIdx, toIdx) {
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

  /** Hapus satu armada dari rute hari ini. Nota yang sudah dialokasikan otomatis
   * kembali ke "Belum Teralokasi" (karena tidak lagi ada di assignments manapun),
   * dan checklist-nya di panel "Pilih Armada & Supir" ikut tidak tercentang. */
  function handleRemoveVehicle(vehicleIdx) {
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

  /** Tambah satu armada baru (dari tombol "+ Tambah Armada"). Otomatis diaktifkan
   * kalau sebelumnya user sudah pernah menyunting pilihan armada aktif secara manual. */
  function handleAddVehicle(newRow) {
    setFleetRows([...fleetRows, newRow]);
    if (activeFleetKeysArray !== null) {
      setActiveFleetKeysArray([...activeFleetKeysArray, fleetRowKey(newRow)]);
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

        <div className="flex items-start gap-2">
          <div className="flex-1">
            <FleetPicker fleetRows={fleetRows} activeFleetKeys={activeFleetKeys} onActiveFleetKeysChange={setActiveFleetKeys} />
          </div>
          <button
            onClick={() => setAddVehicleOpen(true)}
            title="Tambah armada baru (L300 / NKEL)"
            className="no-print shrink-0 p-3 rounded-2xl border border-orange-200 dark:border-orange-500/30 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-500/20 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
          </button>
        </div>

        <StatsRow
          totalNota={orderIdsForDate.length}
          allocatedCount={allAssignedIds.size}
          unallocatedCount={orderIdsForDate.length - allAssignedIds.size}
          totalWeightKg={totalWeightForDate}
          totalCubageM3={totalCubageForDate}
        />

        <section className="space-y-3 no-print">
          <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-orange-500" />
            Armada Logistik ({dispatch.drivers.length} Rute Aktif)
          </h3>
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
        <SettingsModal onClose={() => setSettingsOpen(false)} fleetRows={fleetRows} onFleetChange={setFleetRows} />
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
