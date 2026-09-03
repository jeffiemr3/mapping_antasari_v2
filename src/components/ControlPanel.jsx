import { Zap, RotateCcw, MapPin, Gauge } from 'lucide-react';
import { toDDMMYYYY } from '../utils/format';

function ddmmyyyyToInputValue(ddmmyyyy) {
  const [dd, mm, yyyy] = (ddmmyyyy || '').split('-');
  if (!dd || !mm || !yyyy) return '';
  return `${yyyy}-${mm}-${dd}`;
}
function inputValueToDdmmyyyy(value) {
  const [yyyy, mm, dd] = (value || '').split('-');
  if (!dd || !mm || !yyyy) return '';
  return `${dd}-${mm}-${yyyy}`;
}

export default function ControlPanel({
  selectedDate,
  onSelectedDateChange,
  cumulativeMode,
  onCumulativeModeChange,
  excludeAmsen,
  onExcludeAmsenChange,
  maxLoadPercent,
  onMaxLoadPercentChange,
  warehouse,
  onWarehouseChange,
  fleetRows,
  activeFleetKeys,
  onActiveFleetKeysChange,
  onAutoMapping,
  onReset,
}) {
  function fleetKey(row) {
    return `${row.driver}|${row.vehicle}|${row.plate}`;
  }
  function toggleFleet(key) {
    const next = new Set(activeFleetKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onActiveFleetKeysChange(next);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-[10.5px] uppercase tracking-wider text-slate-400 font-bold">
          Tanggal Pengiriman
        </label>
        <input
          type="date"
          value={ddmmyyyyToInputValue(selectedDate)}
          onChange={(e) => onSelectedDateChange(inputValueToDdmmyyyy(e.target.value))}
          className="w-full text-xs font-mono border border-white/10 bg-[#1c1d26] text-white rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
        <button
          type="button"
          onClick={() => onSelectedDateChange(toDDMMYYYY(new Date()))}
          className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
        >
          Hari ini
        </button>
      </div>

      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
        <input
          type="checkbox"
          checked={cumulativeMode}
          onChange={(e) => onCumulativeModeChange(e.target.checked)}
          className="accent-indigo-500"
        />
        Sertakan pengiriman terlambat (kumulatif s/d tanggal ini)
      </label>

      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
        <input
          type="checkbox"
          checked={excludeAmsen}
          onChange={(e) => onExcludeAmsenChange(e.target.checked)}
          className="accent-indigo-500"
        />
        Kecualikan otomatis nota berkomentar "Amsen"
      </label>

      <div className="space-y-1.5">
        <label className="text-[10.5px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-teal-500" />
          Titik Awal (Koordinat Gudang)
        </label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            step="0.000001"
            value={warehouse.lat}
            onChange={(e) => onWarehouseChange({ ...warehouse, lat: parseFloat(e.target.value) || 0 })}
            className="text-xs font-mono border border-white/10 bg-[#1c1d26] text-white rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
            placeholder="lat"
          />
          <input
            type="number"
            step="0.000001"
            value={warehouse.lng}
            onChange={(e) => onWarehouseChange({ ...warehouse, lng: parseFloat(e.target.value) || 0 })}
            className="text-xs font-mono border border-white/10 bg-[#1c1d26] text-white rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
            placeholder="lng"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-[10.5px] uppercase tracking-wider text-slate-400 font-bold">
          <span className="flex items-center gap-1">
            <Gauge className="w-3.5 h-3.5 text-indigo-400" />
            Batas Beban Maksimal
          </span>
          <span className="text-indigo-400 font-mono font-bold">{maxLoadPercent}%</span>
        </div>
        <input
          type="range"
          min="30"
          max="100"
          value={maxLoadPercent}
          onChange={(e) => onMaxLoadPercentChange(parseInt(e.target.value, 10))}
          className="w-full h-1.5 bg-[#1c1d26] rounded-lg appearance-none cursor-pointer accent-indigo-500"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[10.5px] uppercase tracking-wider text-slate-400 font-bold">
          Armada Aktif ({activeFleetKeys.size}/{fleetRows.length})
        </label>
        <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
          {fleetRows.map((row) => {
            const key = fleetKey(row);
            return (
              <label key={key} className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeFleetKeys.has(key)}
                  onChange={() => toggleFleet(key)}
                  className="accent-indigo-500"
                />
                <span className="font-semibold text-white">{row.driver}</span>
                <span className="text-slate-500">{row.vehicle}</span>
                <span className="text-slate-500 font-mono">{row.plate}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onAutoMapping}
          disabled={!selectedDate}
          className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:from-[#1c1d26] disabled:to-[#1c1d26] disabled:text-slate-600 text-slate-950 font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed"
        >
          <Zap className="w-4 h-4 fill-current" />
          Auto Mapping
        </button>
        <button
          onClick={onReset}
          disabled={!selectedDate}
          title="Reset alokasi manual dan algoritma"
          className="bg-[#1c1d26] hover:bg-[#222431] text-slate-300 font-semibold p-3 rounded-xl flex items-center justify-center cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
