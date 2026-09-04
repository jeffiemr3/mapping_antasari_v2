import { useEffect, useMemo, useState } from 'react';
import {
  Loader2,
  AlertTriangle,
  Truck,
  MapPin,
  Phone,
  RefreshCw,
  PackageSearch,
  ListChecks,
  Clock,
  Boxes,
} from 'lucide-react';
import { fetchManifestSnapshot } from '../utils/pickerSync';

function useCheckedItems(storageKey) {
  const [checked, setChecked] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(checked));
    } catch {
      /* ignore, tidak fatal kalau localStorage penuh/diblokir */
    }
  }, [storageKey, checked]);
  function toggle(key) {
    setChecked((c) => ({ ...c, [key]: !c[key] }));
  }
  return [checked, toggle];
}

/** Gabungkan semua item di semua stop 1 armada jadi daftar per kode barang
 *  (diurutkan berdasarkan lokasi rak) -- ini yang paling praktis dipakai
 *  operator jalan keliling gudang mengambil barang. */
function aggregateByItem(vehicle) {
  const map = {};
  vehicle.stops.forEach((stop) => {
    stop.items.forEach((item) => {
      const key = item.itemNo || item.itemName;
      if (!map[key]) {
        map[key] = {
          key,
          itemNo: item.itemNo,
          itemName: item.itemName,
          uom: item.uom,
          qty: 0,
          locations: item.locations || [],
          npnos: new Set(),
        };
      }
      map[key].qty += item.qty;
      map[key].npnos.add(item.npno);
    });
  });
  const list = Object.values(map).map((row) => ({ ...row, notaCount: row.npnos.size }));
  list.sort((a, b) => {
    const locA = a.locations[0]?.storageLocationId || '\uffff';
    const locB = b.locations[0]?.storageLocationId || '\uffff';
    if (locA !== locB) return locA.localeCompare(locB);
    return a.itemName.localeCompare(b.itemName);
  });
  return list;
}

function LocationBadges({ locations }) {
  if (!locations || locations.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200 font-semibold">
        <AlertTriangle className="w-3 h-3" />
        Lokasi belum diketahui
      </span>
    );
  }
  return (
    <div className="flex flex-wrap gap-1">
      {locations.map((loc, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200 font-mono font-semibold"
        >
          <MapPin className="w-3 h-3" />
          {loc.storageLocationId}
          {loc.zoneId ? ` · ${loc.zoneId}` : ''}
        </span>
      ))}
    </div>
  );
}

function PerItemView({ vehicle, code, vehicleIdx }) {
  const items = useMemo(() => aggregateByItem(vehicle), [vehicle]);
  const [checked, toggle] = useCheckedItems(`m10_picker_${code}_v${vehicleIdx}_item`);
  const doneCount = items.filter((it) => checked[it.key]).length;

  return (
    <div className="space-y-3">
      <div className="sticky top-[104px] z-10 bg-slate-50/95 dark:bg-[#0b0c10]/95 backdrop-blur -mx-4 px-4 py-2 border-b border-slate-200 dark:border-white/5">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
          <span>
            {doneCount} / {items.length} kode barang diambil
          </span>
          <span className="text-slate-400">{vehicle.stops.length} stop</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-200 dark:bg-white/10 mt-1.5 overflow-hidden">
          <div
            className="h-full bg-teal-500 transition-all"
            style={{ width: `${items.length ? (doneCount / items.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      <ul className="space-y-2">
        {items.map((item) => {
          const isChecked = Boolean(checked[item.key]);
          return (
            <li key={item.key}>
              <label
                className={`flex items-start gap-3 p-3 rounded-2xl border transition-colors ${
                  isChecked
                    ? 'bg-teal-50 dark:bg-teal-500/10 border-teal-200 dark:border-teal-500/20'
                    : 'bg-white dark:bg-[#111218] border-slate-200 dark:border-white/5'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggle(item.key)}
                  className="mt-1 w-5 h-5 accent-teal-500 shrink-0 cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-semibold leading-snug ${
                      isChecked ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {item.itemName}
                  </p>
                  <p className="text-[10.5px] text-slate-400 font-mono mt-0.5">{item.itemNo || '(tanpa kode)'}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-base font-extrabold text-slate-900 dark:text-white">
                      {item.qty % 1 === 0 ? item.qty : item.qty.toFixed(2)}
                    </span>
                    <span className="text-xs text-slate-500">{item.uom}</span>
                    <span className="text-[10px] text-slate-400">
                      dari {item.notaCount} nota
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <LocationBadges locations={item.locations} />
                  </div>
                </div>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PerStopView({ vehicle }) {
  const sortedStops = useMemo(() => [...vehicle.stops].sort((a, b) => a.stopNo - b.stopNo), [vehicle]);
  return (
    <div className="space-y-3">
      {sortedStops.map((stop) => (
        <div key={stop.stopNo} className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#111218] p-3.5 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-slate-800 dark:bg-white/10 text-white flex items-center justify-center font-mono font-bold text-xs shrink-0">
                {stop.stopNo}
              </span>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{stop.customer}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                  {stop.address}
                  {stop.address2 ? ` (${stop.address2})` : ''}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-slate-400 shrink-0">Muat ke-{stop.loadOrder}</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {stop.isMultiNota && (
              <span className="text-[9.5px] px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded font-bold border border-indigo-200">
                📦 {stop.npnos.length} NOTA - 1 DROP
              </span>
            )}
            {stop.priorityRit1 && (
              <span className="text-[9.5px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-bold border border-red-200 flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" /> PRIORITAS RIT 1
              </span>
            )}
            {stop.phone && (
              <span className="text-[9.5px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded font-mono font-semibold border border-emerald-200 flex items-center gap-0.5">
                <Phone className="w-2.5 h-2.5" /> {stop.phone}
              </span>
            )}
          </div>

          {stop.comments.length > 0 && (
            <p className="text-[10.5px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
              💬 {stop.comments.join(' / ')}
            </p>
          )}

          <ul className="divide-y divide-slate-100 dark:divide-white/5 pt-1">
            {stop.items.map((item, i) => (
              <li key={i} className="py-1.5 flex items-start justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <p className="text-slate-700 dark:text-slate-200 font-medium leading-snug">{item.itemName}</p>
                  <div className="mt-0.5">
                    <LocationBadges locations={item.locations} />
                  </div>
                </div>
                <span className="shrink-0 font-mono font-bold text-slate-900 dark:text-white">
                  {item.qty % 1 === 0 ? item.qty : item.qty.toFixed(2)} {item.uom}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default function PickerView({ code }) {
  const [status, setStatus] = useState('loading'); // loading | ready | notfound | error
  const [data, setData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeVehicleIdx, setActiveVehicleIdx] = useState(0);
  const [viewMode, setViewMode] = useState('perItem'); // perItem | perStop

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    fetchManifestSnapshot(code)
      .then((snap) => {
        if (cancelled) return;
        if (!snap) {
          setStatus('notfound');
        } else {
          setData(snap);
          setStatus('ready');
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setErrorMsg(err.message || 'Gagal memuat manifest.');
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-2 text-slate-500 dark:text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
        <p className="text-sm">Memuat manifest...</p>
      </div>
    );
  }

  if (status === 'notfound') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-2 text-center p-6">
        <AlertTriangle className="w-8 h-8 text-amber-500" />
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Kode manifest tidak ditemukan.</p>
        <p className="text-xs text-slate-500 max-w-xs">
          Link/QR ini mungkin salah ketik, atau mintakan dispatcher kirim ulang link terbaru.
        </p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-center p-6">
        <AlertTriangle className="w-8 h-8 text-rose-500" />
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Gagal memuat manifest.</p>
        <p className="text-xs text-slate-500 max-w-xs">{errorMsg}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Coba lagi
        </button>
      </div>
    );
  }

  const vehicles = data.vehicles || [];
  const vehicle = vehicles[activeVehicleIdx];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0c10]">
      <div className="sticky top-0 z-20 bg-white dark:bg-[#111218] border-b border-slate-200 dark:border-white/5 px-4 pt-3 pb-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
              <PackageSearch className="w-4 h-4 text-indigo-500" />
              Picking &mdash; MITRA10 ANTASARI
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{data.selectedDate}</p>
          </div>
          <span className="text-[10px] font-mono text-slate-400">#{code}</span>
        </div>

        {vehicles.length === 0 ? (
          <p className="text-xs text-slate-500 py-4">Belum ada armada dengan muatan di manifest ini.</p>
        ) : (
          <div className="flex gap-1.5 overflow-x-auto pt-3 pb-2 -mx-1 px-1">
            {vehicles.map((v, i) => (
              <button
                key={i}
                onClick={() => setActiveVehicleIdx(i)}
                className={`shrink-0 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border ${
                  i === activeVehicleIdx
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'bg-white dark:bg-[#1c1d26] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                {v.vehicle}
                <span className={i === activeVehicleIdx ? 'text-indigo-200' : 'text-slate-400'}>({v.stopCount})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {vehicle && (
        <>
          <div className="px-4 pt-3">
            <div className="rounded-2xl bg-white dark:bg-[#111218] border border-slate-200 dark:border-white/5 p-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  {vehicle.vehicle} &bull; {vehicle.plate}
                </p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Supir: {vehicle.driver}</p>
              </div>
              <div className="flex rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden text-[10.5px] font-bold shrink-0">
                <button
                  onClick={() => setViewMode('perItem')}
                  className={`px-2.5 py-1.5 flex items-center gap-1 cursor-pointer ${
                    viewMode === 'perItem' ? 'bg-teal-500 text-white' : 'bg-white dark:bg-[#1c1d26] text-slate-500'
                  }`}
                >
                  <ListChecks className="w-3.5 h-3.5" />
                  Ringkasan
                </button>
                <button
                  onClick={() => setViewMode('perStop')}
                  className={`px-2.5 py-1.5 flex items-center gap-1 cursor-pointer ${
                    viewMode === 'perStop' ? 'bg-teal-500 text-white' : 'bg-white dark:bg-[#1c1d26] text-slate-500'
                  }`}
                >
                  <Boxes className="w-3.5 h-3.5" />
                  Per Stop
                </button>
              </div>
            </div>
          </div>

          <div className="px-4 py-3 pb-10">
            {viewMode === 'perItem' ? (
              <PerItemView vehicle={vehicle} code={code} vehicleIdx={activeVehicleIdx} />
            ) : (
              <PerStopView vehicle={vehicle} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
