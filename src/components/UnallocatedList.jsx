import { useMemo, useState } from 'react';
import { Search, MapPin, Phone, Sparkles, Scissors, AlertOctagon } from 'lucide-react';

function UnallocatedCard({ order, vehicles, onManualAllocate, onGeocode, geocodingId, isOversized, onSplitNota }) {
  const missingCoords = !order.lat || !order.lng;
  return (
    <div
      className={`border rounded-xl p-3 space-y-1.5 ${
        isOversized
          ? 'bg-rose-50 dark:bg-rose-950/15 border-rose-200 dark:border-rose-500/20'
          : 'bg-slate-50 dark:bg-[#151720] border-slate-200 dark:border-white/5'
      }`}
    >
      {isOversized && (
        <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
          <AlertOctagon className="w-3.5 h-3.5" />
          Melebihi kapasitas mobil manapun - perlu dipecah
        </p>
      )}
      <p className="font-mono text-[10px] text-slate-400">{order.NPno}</p>
      <p className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
        {order.customer}
        {order.priorityRit1 && (
          <span className="text-[8.5px] px-1.5 py-0.5 bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400 rounded font-bold border border-red-200 dark:border-red-500/20">
            &#9200; PRIORITAS RIT 1
          </span>
        )}
      </p>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-1">
        <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
        {order.address}
      </p>
      {order.phone && (
        <p className="text-[11px] flex items-center gap-1">
          <Phone className="w-3 h-3 text-emerald-500" />
          <a href={`tel:${order.phone}`} className="text-blue-600 dark:text-blue-400 hover:underline">
            {order.phone}
          </a>
        </p>
      )}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] font-mono bg-white dark:bg-[#1c1d26] border border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">
          {order.totalWeightKg.toFixed(1)} kg &middot; {order.totalCubageM3.toFixed(3)} m&sup3;
        </span>
        <span className="text-[10px] bg-white dark:bg-[#1c1d26] border border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">
          {order.lines.length} Item
        </span>
        {missingCoords && (
          <button
            onClick={() => onGeocode(order.NPno)}
            disabled={geocodingId === order.NPno}
            className="text-[10px] text-teal-600 dark:text-teal-400 hover:text-teal-700 font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3 h-3" />
            {geocodingId === order.NPno ? 'Mencari…' : 'AI Geocode'}
          </button>
        )}
      </div>
      <select
        defaultValue=""
        onChange={(e) => {
          if (e.target.value !== '') onManualAllocate(order.NPno, parseInt(e.target.value, 10));
          e.target.value = '';
        }}
        className="w-full text-xs bg-white dark:bg-[#1c1d26] border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1.5 cursor-pointer"
      >
        <option value="" disabled>
          Manual Alokasi Kendaraan…
        </option>
        {vehicles.map((v, idx) => (
          <option key={idx} value={idx}>
            🚚 {v.vehicle}
          </option>
        ))}
      </select>
      <button
        onClick={() => onSplitNota(order.NPno)}
        className={`w-full text-xs font-semibold py-1.5 rounded-lg cursor-pointer flex items-center justify-center gap-1.5 ${
          isOversized
            ? 'bg-rose-600 hover:bg-rose-700 text-white'
            : 'bg-slate-100 dark:bg-[#1c1d26] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#222431]'
        }`}
      >
        <Scissors className="w-3.5 h-3.5" />
        Pecah Nota
      </button>
    </div>
  );
}

export default function UnallocatedList({
  unallocatedIds,
  ordersMap,
  vehicles,
  onManualAllocate,
  onGeocode,
  geocodingId,
  oversizedIds = [],
  onSplitNota,
}) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return unallocatedIds;
    const q = search.trim().toLowerCase();
    return unallocatedIds.filter((id) => {
      const o = ordersMap[id];
      return o && (o.NPno.toLowerCase().includes(q) || o.customer.toLowerCase().includes(q));
    });
  }, [search, unallocatedIds, ordersMap]);

  // Tampilkan yang oversized duluan biar langsung kelihatan perlu ditindak
  const sorted = useMemo(() => {
    const oversizedSet = new Set(oversizedIds);
    return [...filtered].sort((a, b) => (oversizedSet.has(b) ? 1 : 0) - (oversizedSet.has(a) ? 1 : 0));
  }, [filtered, oversizedIds]);

  return (
    <section className="no-print bg-white dark:bg-[#111218] border border-slate-200 dark:border-white/5 rounded-2xl p-4 space-y-3 h-full flex flex-col">
      <div className="flex items-center gap-2">
        <h4 className="font-display font-bold text-sm text-slate-900 dark:text-white">Belum Teralokasi</h4>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400">
          {unallocatedIds.length} Nota
        </span>
      </div>

      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nomor nota (NPno)"
          className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1c1d26] text-slate-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
        />
      </div>

      <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 420 }}>
        {sorted.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-4 text-center">Tidak ada nota belum teralokasi.</p>
        ) : (
          sorted.map((id) => {
            const order = ordersMap[id];
            if (!order) return null;
            return (
              <UnallocatedCard
                key={id}
                order={order}
                vehicles={vehicles}
                onManualAllocate={onManualAllocate}
                onGeocode={onGeocode}
                geocodingId={geocodingId}
                isOversized={oversizedIds.includes(id)}
                onSplitNota={onSplitNota}
              />
            );
          })
        )}
      </div>
    </section>
  );
}
