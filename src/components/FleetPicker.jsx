import { Weight, Box, Ruler, Trash2, PlusCircle } from 'lucide-react';
import { fleetRowKey } from '../utils/allocation';

export default function FleetPicker({ fleetRows, activeFleetKeys, onActiveFleetKeysChange, onDeleteVehicle, onAddVehicleClick }) {
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
  function handleDelete(e, row) {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm(`Hapus armada "${row.vehicle}" (${row.driver}, ${row.plate}) dari daftar?`)) {
      onDeleteVehicle(row);
    }
  }

  return (
    <div className="bg-white dark:bg-[#111218] border border-slate-200 dark:border-white/5 rounded-2xl p-4 space-y-3 no-print">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10.5px] uppercase tracking-wider text-slate-400 font-bold">
          Pilih Armada &amp; Supir yang Digunakan ({activeFleetKeys.size}/{fleetRows.length})
        </p>
        <div className="flex items-center gap-3 text-[11px] font-semibold shrink-0">
          <button onClick={selectAll} className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
            Pilih Semua
          </button>
          <button onClick={selectNone} className="text-rose-600 dark:text-rose-400 hover:underline cursor-pointer">
            Kosongkan Semua
          </button>
          <button
            onClick={onAddVehicleClick}
            title="Tambah armada baru (L300 / NKEL)"
            className="flex items-center justify-center w-6 h-6 rounded-full border border-orange-200 dark:border-orange-500/30 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-500/20 cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
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
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[9px] font-mono text-slate-400">{row.plate}</span>
                  <button
                    onClick={(e) => handleDelete(e, row)}
                    title="Hapus armada ini"
                    className="text-slate-300 dark:text-slate-600 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer p-0.5 -m-0.5"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
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
