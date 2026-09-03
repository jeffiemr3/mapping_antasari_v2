import { Zap, RotateCcw, MapPin, Gauge, CalendarDays } from 'lucide-react';
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

export default function Toolbar({
  selectedDate,
  onSelectedDateChange,
  warehouse,
  onWarehouseChange,
  maxLoadPercent,
  onMaxLoadPercentChange,
  cumulativeMode,
  onCumulativeModeChange,
  excludeAmsen,
  onExcludeAmsenChange,
  onAutoMapping,
  onReset,
}) {
  function handleCoordText(text) {
    const [latStr, lngStr] = text.split(',').map((s) => s.trim());
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    onWarehouseChange({
      ...warehouse,
      lat: Number.isFinite(lat) ? lat : warehouse.lat,
      lng: Number.isFinite(lng) ? lng : warehouse.lng,
      _text: text, // simpan teks mentah supaya bisa diketik bebas sebelum lengkap
    });
  }
  const coordText = warehouse._text ?? `${warehouse.lat}, ${warehouse.lng}`;

  return (
    <div className="bg-white dark:bg-[#111218] border border-slate-200 dark:border-white/5 rounded-2xl p-4 space-y-3 no-print">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1">
            <CalendarDays className="w-3.5 h-3.5 text-orange-500" />
            Tanggal Promised Delivery
          </label>
          <input
            type="date"
            value={ddmmyyyyToInputValue(selectedDate)}
            onChange={(e) => onSelectedDateChange(inputValueToDdmmyyyy(e.target.value))}
            className="text-xs font-mono border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1c1d26] text-slate-900 dark:text-white rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>

        <div className="space-y-1 flex-1 min-w-[220px]">
          <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-teal-500" />
            Titik Awal (Koordinat Gudang)
          </label>
          <input
            type="text"
            value={coordText}
            onChange={(e) => handleCoordText(e.target.value)}
            placeholder="lat, lng"
            className="w-full text-xs font-mono border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1c1d26] text-slate-900 dark:text-white rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>

        <div className="space-y-1 w-48">
          <div className="flex justify-between items-center text-[10px] uppercase tracking-wider text-slate-400 font-bold">
            <span className="flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5 text-indigo-500" />
              Batas Beban Maksimal
            </span>
            <span className="text-indigo-600 dark:text-indigo-400 font-mono font-bold">{maxLoadPercent}%</span>
          </div>
          <input
            type="range"
            min="30"
            max="100"
            value={maxLoadPercent}
            onChange={(e) => onMaxLoadPercentChange(parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-slate-200 dark:bg-[#1c1d26] rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>

        <div className="flex gap-2 ml-auto">
          <button
            onClick={onAutoMapping}
            disabled={!selectedDate}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed"
          >
            <Zap className="w-4 h-4 fill-current" />
            Auto Mapping
          </button>
          <button
            onClick={onReset}
            disabled={!selectedDate}
            title="Reset alokasi manual dan algoritma"
            className="bg-slate-100 dark:bg-[#1c1d26] hover:bg-slate-200 dark:hover:bg-[#222431] text-slate-600 dark:text-slate-300 font-semibold p-2.5 rounded-xl flex items-center justify-center cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5">
        <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={cumulativeMode}
            onChange={(e) => onCumulativeModeChange(e.target.checked)}
            className="accent-orange-500"
          />
          Termasuk Overdue (nota promised &le; tanggal terpilih)
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={excludeAmsen}
            onChange={(e) => onExcludeAmsenChange(e.target.checked)}
            className="accent-orange-500"
          />
          Pisahkan nota berkomentar &quot;Amsen&quot; / &quot;Amsen Titip&quot;
        </label>
        <button
          type="button"
          onClick={() => onSelectedDateChange(toDDMMYYYY(new Date()))}
          className="text-[11px] text-blue-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
        >
          Hari ini
        </button>
      </div>
    </div>
  );
}
