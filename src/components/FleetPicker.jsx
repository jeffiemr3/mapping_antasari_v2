import { Weight, Box, Ruler } from 'lucide-react';
import { fleetRowKey } from '../utils/allocation';

export default function FleetPicker({ fleetRows, activeFleetKeys, onActiveFleetKeysChange }) {
  function toggle(key) {
    const next = new Set(activeFleetKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onActiveFleetKeysChange(next);
  }
  function selectAll() {
    onActiveFleetKeysChange(new Set(fleetRows.map(fleetRowKey)));
  }
  function selectNone() {
    onActiveFleetKeysChange(new Set());
  }

  return (
    <div className="bg-white dark:bg-[#111218] border border-slate-200 dark:border-white/5 rounded-2xl p-4 space-y-3 no-print">
      <div className="flex items-center justify-between">
        <p className="text-[10.5px] uppercase tracking-wider text-slate-400 font-bold">
          Pilih Armada &amp; Supir yang Digunakan ({activeFleetKeys.size}/{fleetRows.length})
        </p>
        <div className="flex items-center gap-3 text-[11px] font-semibold">
          <button onClick={selectAll} className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
            Pilih Semua
          </button>
          <button onClick={selectNone} className="text-rose-600 dark:text-rose-400 hover:underline cursor-pointer">
            Kosongkan Semua
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {fleetRows.map((row) => {
          const key = fleetRowKey(row);
          const checked = activeFleetKeys.has(key);
          return (
            <label
              key={key}
              className={`rounded-xl border p-2.5 space-y-1 cursor-pointer transition-colors ${
                checked
                  ? 'border-orange-300 dark:border-orange-500/40 bg-orange-50/60 dark:bg-orange-500/5'
                  : 'border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-[#1c1d26]'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <input type="checkbox" checked={checked} onChange={() => toggle(key)} className="accent-orange-500 shrink-0" />
                  <span className="font-bold text-xs text-slate-900 dark:text-white truncate">{row.driver}</span>
                </div>
                <span className="text-[9px] font-mono text-slate-400 shrink-0">{row.plate}</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">{row.vehicle}</p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9.5px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-0.5">
                  <Weight className="w-2.5 h-2.5" /> {row.capWeightKg / 1000}t
                </span>
                <span className="flex items-center gap-0.5">
                  <Box className="w-2.5 h-2.5" /> {row.capCubageM3.toFixed(2)}m&sup3;
                </span>
                {row.lengthCm > 0 && (
                  <span className="flex items-center gap-0.5">
                    <Ruler className="w-2.5 h-2.5" />
                    {row.heightCm}x{row.widthCm}x{row.lengthCm}
                  </span>
                )}
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
