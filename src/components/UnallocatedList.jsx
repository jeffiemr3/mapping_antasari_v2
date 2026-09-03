import { useMemo, useState } from 'react';
import { Search, MapPin, Phone, Sparkles } from 'lucide-react';

function UnallocatedCard({ order, vehicles, onManualAllocate, onGeocode, geocodingId }) {
  const missingCoords = !order.lat || !order.lng;
  return (
    <div className="bg-slate-50 dark:bg-[#151720] border border-slate-200 dark:border-white/5 rounded-xl p-3 space-y-1.5">
      <p className="font-mono text-[10px] text-slate-400">{order.NPno}</p>
      <p className="font-bold text-sm text-slate-900 dark:text-white">{order.customer}</p>
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
    </div>
  );
}

export default function UnallocatedList({ unallocatedIds, ordersMap, vehicles, onManualAllocate, onGeocode, geocodingId }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return unallocatedIds;
    const q = search.trim().toLowerCase();
    return unallocatedIds.filter((id) => {
      const o = ordersMap[id];
      return o && (o.NPno.toLowerCase().includes(q) || o.customer.toLowerCase().includes(q));
    });
  }, [search, unallocatedIds, ordersMap]);

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
        {filtered.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-4 text-center">Tidak ada nota belum teralokasi.</p>
        ) : (
          filtered.map((id) => {
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
              />
            );
          })
        )}
      </div>
    </section>
  );
}
