import { useMemo, useState } from 'react';
import { Printer } from 'lucide-react';

import Header from './components/Header';
import ImportPanel from './components/ImportPanel';
import ControlPanel from './components/ControlPanel';
import VehicleCard from './components/VehicleCard';
import UnallocatedList from './components/UnallocatedList';
import MapView from './components/MapView';
import SettingsModal from './components/SettingsModal';
import ReschedulePanel from './components/ReschedulePanel';

import { useLocalStorage } from './hooks/useLocalStorage';
import { useOrders } from './hooks/useOrders';
import { STORAGE_KEYS } from './utils/storage';
import { autoAllocate, fleetRowKey } from './utils/allocation';
import { getOrPromptApiKey, geocodeAddress } from './utils/geocode';
import { DEFAULT_WAREHOUSE } from './data/constants';
import { toDDMMYYYY } from './utils/format';
import fleetSeed from './data/fleetSeed.json';

const EMPTY_DISPATCH = { drivers: [], assignments: [], unallocated: [] };

export default function App() {
  // ---- Data mentah (persisten di localStorage) ---------------------------
  const [rawLines, setRawLines] = useLocalStorage(STORAGE_KEYS.ORDERS, []);
  const [customCatalog, setCustomCatalog] = useLocalStorage('m10_custom_catalog', {});
  const [fleetRows, setFleetRows] = useLocalStorage(STORAGE_KEYS.FLEET, fleetSeed);
  const [warehouse, setWarehouse] = useLocalStorage(STORAGE_KEYS.WAREHOUSE, DEFAULT_WAREHOUSE);
  const [dispatch, setDispatch] = useLocalStorage(STORAGE_KEYS.ALLOCATIONS, EMPTY_DISPATCH);

  // ---- Pengaturan tampilan (persisten) ------------------------------------
  const [selectedDate, setSelectedDate] = useLocalStorage('m10_selected_date', toDDMMYYYY(new Date()));
  const [cumulativeMode, setCumulativeMode] = useLocalStorage('m10_cumulative_mode', true);
  const [excludeAmsen, setExcludeAmsen] = useLocalStorage('m10_exclude_amsen', true);
  const [maxLoadPercent, setMaxLoadPercent] = useLocalStorage('m10_max_load_percent', 100);
  const [activeFleetKeysArray, setActiveFleetKeysArray] = useLocalStorage('m10_active_fleet_keys', null);

  // ---- State transien (tidak perlu disimpan) ------------------------------
  const [focusedVehicleIdx, setFocusedVehicleIdx] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [geocodingId, setGeocodingId] = useState(null);
  const [geocodeError, setGeocodeError] = useState(null);

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
    selectedDate,
    cumulativeMode,
  });

  const allAssignedIds = useMemo(() => new Set(dispatch.assignments.flat()), [dispatch.assignments]);

  const amsenIdsToShow = useMemo(() => {
    if (!excludeAmsen) return [];
    return orderIdsForDate.filter((id) => ordersMap[id]?.hasAmsenComment && !allAssignedIds.has(id));
  }, [excludeAmsen, orderIdsForDate, ordersMap, allAssignedIds]);

  const unallocatedIdsToShow = useMemo(
    () => dispatch.unallocated.filter((id) => !allAssignedIds.has(id) && ordersMap[id]),
    [dispatch.unallocated, allAssignedIds, ordersMap]
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

  function handleRemoveStop(orderId, vehicleIdx) {
    setDispatch((d) => ({
      ...d,
      assignments: d.assignments.map((arr, i) => (i === vehicleIdx ? arr.filter((id) => id !== orderId) : arr)),
      unallocated: [...d.unallocated, orderId],
    }));
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
      setRawLines((lines) =>
        lines.map((l) => (l.NPno === orderId ? { ...l, Lat: result.lat, Lng: result.lng } : l))
      );
    } catch (err) {
      setGeocodeError(err.message);
    } finally {
      setGeocodingId(null);
    }
  }

  const vehicleCount = dispatch.drivers.length;

  return (
    <div className="min-h-screen flex flex-col">
      <Header onOpenSettings={() => setSettingsOpen(true)} />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[320px_1fr_380px] gap-4 p-4">
        {/* Kolom kiri: import & kontrol */}
        <aside className="space-y-5 no-print">
          <div className="bg-[#111218] border border-white/5 rounded-2xl p-4">
            <ImportPanel rawLines={rawLines} onChange={setRawLines} />
          </div>
          <div className="bg-[#111218] border border-white/5 rounded-2xl p-4">
            <ControlPanel
              selectedDate={selectedDate}
              onSelectedDateChange={setSelectedDate}
              cumulativeMode={cumulativeMode}
              onCumulativeModeChange={setCumulativeMode}
              excludeAmsen={excludeAmsen}
              onExcludeAmsenChange={setExcludeAmsen}
              maxLoadPercent={maxLoadPercent}
              onMaxLoadPercentChange={setMaxLoadPercent}
              warehouse={warehouse}
              onWarehouseChange={setWarehouse}
              fleetRows={fleetRows}
              activeFleetKeys={activeFleetKeys}
              onActiveFleetKeysChange={setActiveFleetKeys}
              onAutoMapping={handleAutoMapping}
              onReset={handleReset}
            />
          </div>
          <div className="bg-[#111218] border border-white/5 rounded-2xl p-4">
            <ReschedulePanel rawLines={rawLines} onRawLinesChange={setRawLines} ordersMap={ordersMap} />
          </div>
        </aside>

        {/* Kolom tengah: peta */}
        <main className="space-y-3">
          <div className="bg-[#111218] border border-white/5 rounded-2xl p-2 no-print" style={{ height: 460 }}>
            <MapView
              assignments={dispatch.assignments}
              ordersMap={ordersMap}
              warehouse={warehouse}
              focusedVehicleIdx={focusedVehicleIdx}
            />
          </div>

          <div className="flex items-center justify-between no-print">
            <p className="text-xs text-slate-400">
              {orderIdsForDate.length} nota untuk tanggal {selectedDate || '-'} &middot; {vehicleCount} armada aktif
            </p>
            <div className="flex items-center gap-2">
              {focusedVehicleIdx !== null && (
                <button
                  onClick={() => setFocusedVehicleIdx(null)}
                  className="text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Tampilkan Semua Rute ×
                </button>
              )}
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 px-3 py-2 rounded-xl cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Cetak Semua Rute (Ramping &amp; Hemat Kertas)
              </button>
            </div>
          </div>

          {geocodeError && <p className="text-xs text-rose-400 no-print">{geocodeError}</p>}

          <UnallocatedList
            amsenIds={amsenIdsToShow}
            unallocatedIds={unallocatedIdsToShow}
            ordersMap={ordersMap}
            vehicles={dispatch.drivers}
            onManualAllocate={handleManualAllocate}
            onGeocode={handleGeocode}
            geocodingId={geocodingId}
          />
        </main>

        {/* Kolom kanan: manifest per armada */}
        <aside className="space-y-3">
          <h3 className="font-display font-bold text-sm text-white no-print">
            Manifest Jalan Armada Pengiriman
          </h3>
          {dispatch.drivers.length === 0 ? (
            <p className="text-xs text-slate-500 no-print">
              Belum ada armada aktif. Import data nota, pilih tanggal, lalu klik "Auto Mapping".
            </p>
          ) : (
            dispatch.drivers.map((vehicle, idx) => (
              <VehicleCard
                key={idx}
                vehicle={vehicle}
                vehicleIndex={idx}
                assignedIds={dispatch.assignments[idx] || []}
                ordersMap={ordersMap}
                isFocused={focusedVehicleIdx === idx}
                onToggleFocus={() => setFocusedVehicleIdx((v) => (v === idx ? null : idx))}
                onRemoveStop={handleRemoveStop}
                vehicleCount={vehicleCount}
              />
            ))
          )}
        </aside>
      </div>

      {settingsOpen && (
        <SettingsModal
          onClose={() => setSettingsOpen(false)}
          fleetRows={fleetRows}
          onFleetChange={setFleetRows}
          customCatalog={customCatalog}
          onCustomCatalogChange={setCustomCatalog}
        />
      )}
    </div>
  );
}
