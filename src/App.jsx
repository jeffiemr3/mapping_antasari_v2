import { useMemo, useState } from 'react';
import { Settings, Truck } from 'lucide-react';

import Header from './components/Header';
import Toolbar from './components/Toolbar';
import FleetPicker from './components/FleetPicker';
import StatsRow from './components/StatsRow';
import FleetOverviewCard from './components/FleetOverviewCard';
import AmsenExclusionSection from './components/AmsenExclusionSection';
import UnallocatedList from './components/UnallocatedList';
import ReschedulePanel from './components/ReschedulePanel';
import MapView from './components/MapView';
import ManifestSection from './components/ManifestSection';
import SettingsModal from './components/SettingsModal';
import SizeWeightModal from './components/SizeWeightModal';
import SplitNotaModal from './components/SplitNotaModal';
import Footer from './components/Footer';

import { useLocalStorage } from './hooks/useLocalStorage';
import { useOrders } from './hooks/useOrders';
import { useTheme } from './hooks/useTheme';
import { STORAGE_KEYS } from './utils/storage';
import { autoAllocate, fleetRowKey } from './utils/allocation';
import { findOversizedSingleOrders } from './utils/allocation';
import { splitOrderInRawLines } from './utils/splitNota';
import { getOrPromptApiKey, geocodeAddress } from './utils/geocode';
import { DEFAULT_WAREHOUSE } from './data/constants';
import { toDDMMYYYY } from './utils/format';
import fleetSeed from './data/fleetSeed.json';
import sizeWeightSeed from './data/sizeWeightSeed.json';

const EMPTY_DISPATCH = { drivers: [], assignments: [], unallocated: [] };

export default function App() {
  const { theme, toggleTheme } = useTheme();

  // ---- Data mentah (persisten di localStorage) ---------------------------
  const [rawLines, setRawLines] = useLocalStorage(STORAGE_KEYS.ORDERS, []);
  const [customCatalog, setCustomCatalog] = useLocalStorage('m10_custom_catalog', {});
  const [sizeWeightRows, setSizeWeightRows] = useLocalStorage('m10_size_weight_master', sizeWeightSeed);
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
  const [sizeWeightOpen, setSizeWeightOpen] = useState(false);
  const [splitNotaId, setSplitNotaId] = useState(null);
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
    sizeWeightRows,
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
        onRawLinesChange={setRawLines}
        customCatalog={customCatalog}
        onCustomCatalogChange={setCustomCatalog}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenSizeWeight={() => setSizeWeightOpen(true)}
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
            onClick={() => setSettingsOpen(true)}
            title="Pengaturan lanjutan (API key & import armada)"
            className="no-print shrink-0 p-3 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#111218] text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            <Settings className="w-4 h-4" />
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
        />

        {geocodeError && <p className="text-xs text-rose-500 no-print">{geocodeError}</p>}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4 items-start">
          <div className="bg-white dark:bg-[#111218] border border-slate-200 dark:border-white/5 rounded-2xl p-3 no-print" style={{ height: 480 }}>
            <h4 className="font-display font-bold text-xs text-slate-900 dark:text-white mb-2 px-1">
              🗺️ Peta Jalur Rute Pengiriman
            </h4>
            <div style={{ height: 'calc(100% - 24px)' }}>
              <MapView
                drivers={dispatch.drivers}
                assignments={dispatch.assignments}
                ordersMap={ordersMap}
                warehouse={warehouse}
                focusedVehicleIdx={focusedVehicleIdx}
                onFocusVehicle={setFocusedVehicleIdx}
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
        />
      </main>

      <Footer />

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} fleetRows={fleetRows} onFleetChange={setFleetRows} />}
      {sizeWeightOpen && (
        <SizeWeightModal onClose={() => setSizeWeightOpen(false)} rows={sizeWeightRows} onRowsChange={setSizeWeightRows} />
      )}
      {splitNotaId && ordersMap[splitNotaId] && (
        <SplitNotaModal order={ordersMap[splitNotaId]} onClose={() => setSplitNotaId(null)} onConfirm={handleSplitOrder} />
      )}
    </div>
  );
}
