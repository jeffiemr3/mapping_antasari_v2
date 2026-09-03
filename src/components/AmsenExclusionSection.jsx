import { AlertTriangle, Sparkles } from 'lucide-react';

export default function AmsenExclusionSection({ orderIds, ordersMap, vehicles, onManualAllocate, onGeocode, geocodingId }) {
  if (orderIds.length === 0) return null;

  return (
    <section className="no-print bg-amber-50 dark:bg-amber-950/15 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-amber-500" />
        <div>
          <h4 className="font-display font-bold text-sm text-amber-700 dark:text-amber-400">
            🚫 Dikecualikan Otomatis: Komentar &quot;Amsen&quot; / &quot;Amsen Titip&quot;
          </h4>
          <p className="text-[11px] text-slate-600 dark:text-slate-300">
            Ada {orderIds.length} nota yang berlabel amsen. Nota ini dikeluarkan dari algoritma auto mapping, silakan
            alokasikan secara manual jika supir sudah siap.
          </p>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#111218]">
        <table className="w-full text-xs text-slate-700 dark:text-slate-300">
          <thead>
            <tr className="bg-slate-50 dark:bg-[#151720] border-b border-slate-200 dark:border-white/5 text-left font-bold text-slate-600 dark:text-slate-300">
              <th className="p-3">NPno</th>
              <th className="p-3">Pelanggan</th>
              <th className="p-3">Alamat</th>
              <th className="p-3">Komentar</th>
              <th className="p-3 text-right">Alokasikan Manual</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {orderIds.map((id) => {
              const order = ordersMap[id];
              if (!order) return null;
              const missingCoords = !order.lat || !order.lng;
              return (
                <tr key={id} className="hover:bg-slate-50 dark:hover:bg-[#151720]/40">
                  <td className="p-3 font-mono text-[11px]">{order.NPno}</td>
                  <td className="p-3 font-bold text-slate-900 dark:text-white">{order.customer}</td>
                  <td className="p-3 text-slate-500 dark:text-slate-400 max-w-sm truncate">{order.address}</td>
                  <td className="p-3">
                    {order.comments.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[10px] border border-amber-200 dark:border-amber-500/20">
                        {order.comments.join('; ')}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {missingCoords && (
                        <button
                          onClick={() => onGeocode(id)}
                          disabled={geocodingId === id}
                          className="text-[10px] text-teal-600 dark:text-teal-400 hover:text-teal-700 font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          title="Cari koordinat pakai AI"
                        >
                          <Sparkles className="w-3 h-3" />
                          {geocodingId === id ? 'Mencari…' : 'AI Geocode'}
                        </button>
                      )}
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value !== '') onManualAllocate(id, parseInt(e.target.value, 10));
                          e.target.value = '';
                        }}
                        className="text-[10px] bg-white dark:bg-[#1c1d26] border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 cursor-pointer"
                      >
                        <option value="" disabled>
                          Pilih Truk…
                        </option>
                        {vehicles.map((v, idx) => (
                          <option key={idx} value={idx}>
                            {v.driver} &middot; {v.vehicle}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
