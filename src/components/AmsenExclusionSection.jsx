import { AlertTriangle, Sparkles, PackagePlus } from 'lucide-react';

function AmsenCard({ id, order, vehicles, onManualAllocate, onGeocode, geocodingId, onAddToGudang }) {
  const missingCoords = !order.lat || !order.lng;
  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#111218] p-3 space-y-1.5">
      <p className="font-mono text-[10px] text-slate-400">{order.NPno}</p>
      <p className="font-bold text-sm text-slate-900 dark:text-white">{order.customer}</p>
      {order.comments.length > 0 && (
        <span className="inline-block px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[10px] border border-amber-200 dark:border-amber-500/20">
          {order.comments.join('; ')}
        </span>
      )}

      <ul className="divide-y divide-slate-100 dark:divide-white/5 pt-1">
        {order.lines.map((line, li) => (
          <li key={li} className="py-1 flex items-start justify-between gap-2 text-[11px]">
            <div className="min-w-0">
              <p className="text-slate-700 dark:text-slate-200">{line.itemName}</p>
              <p className="text-[9.5px] font-mono text-slate-400">{line.itemNo || '(tanpa kode)'}</p>
            </div>
            <span className="shrink-0 font-mono font-bold text-slate-900 dark:text-white">
              {line.qty} {line.uom}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-2 pt-1 flex-wrap">
        <button
          onClick={() => onAddToGudang(id)}
          className="flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white cursor-pointer"
        >
          <PackagePlus className="w-3.5 h-3.5" />
          Titip ke Gudang
        </button>
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
          className="flex-1 text-[11px] bg-white dark:bg-[#1c1d26] border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1.5 cursor-pointer"
        >
          <option value="" disabled>
            Atau kirim pakai Truk…
          </option>
          {vehicles.map((v, idx) => (
            <option key={idx} value={idx}>
              {v.driver} &middot; {v.vehicle}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default function AmsenExclusionSection({ orderIds, ordersMap, vehicles, onManualAllocate, onGeocode, geocodingId, onAddToGudang }) {
  if (orderIds.length === 0) return null;

  return (
    <section className="no-print bg-amber-50 dark:bg-amber-950/15 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
        <div>
          <h4 className="font-display font-bold text-sm text-amber-700 dark:text-amber-400">
            🚫 Dikecualikan Otomatis: Komentar &quot;Amsen&quot; / &quot;Amsen Titip&quot;
          </h4>
          <p className="text-[11px] text-slate-600 dark:text-slate-300">
            Ada {orderIds.length} nota yang berlabel amsen. Nota ini dikeluarkan dari algoritma auto mapping &mdash;
            titip barangnya ke Gudang (kalau pelanggan akan ambil sendiri), atau alokasikan ke truk secara manual kalau
            tetap perlu dikirim.
          </p>
        </div>
      </div>

      {/* Tabel untuk layar lebar */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#111218]">
        <table className="w-full text-xs text-slate-700 dark:text-slate-300">
          <thead>
            <tr className="bg-slate-50 dark:bg-[#151720] border-b border-slate-200 dark:border-white/5 text-left font-bold text-slate-600 dark:text-slate-300">
              <th className="p-3">NPno</th>
              <th className="p-3">Pelanggan</th>
              <th className="p-3">Item No</th>
              <th className="p-3">Item Name</th>
              <th className="p-3 text-right">Qty</th>
              <th className="p-3">Komentar</th>
              <th className="p-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {orderIds.map((id) => {
              const order = ordersMap[id];
              if (!order) return null;
              const missingCoords = !order.lat || !order.lng;
              const lines = order.lines.length > 0 ? order.lines : [null];
              return lines.map((line, li) => (
                <tr key={`${id}-${li}`} className="hover:bg-slate-50 dark:hover:bg-[#151720]/40 align-top">
                  {li === 0 && (
                    <td className="p-3 font-mono text-[11px]" rowSpan={lines.length}>
                      {order.NPno}
                    </td>
                  )}
                  {li === 0 && (
                    <td className="p-3 font-bold text-slate-900 dark:text-white" rowSpan={lines.length}>
                      {order.customer}
                    </td>
                  )}
                  <td className="p-3 font-mono text-[10.5px] text-slate-500 dark:text-slate-400">
                    {line ? line.itemNo || '-' : '-'}
                  </td>
                  <td className="p-3">{line ? line.itemName : '(tidak ada rincian item)'}</td>
                  <td className="p-3 text-right font-mono font-semibold">{line ? `${line.qty} ${line.uom}` : ''}</td>
                  {li === 0 && (
                    <td className="p-3" rowSpan={lines.length}>
                      {order.comments.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[10px] border border-amber-200 dark:border-amber-500/20">
                          {order.comments.join('; ')}
                        </span>
                      )}
                    </td>
                  )}
                  {li === 0 && (
                    <td className="p-3 text-right" rowSpan={lines.length}>
                      <div className="flex flex-col items-end gap-1.5">
                        <button
                          onClick={() => onAddToGudang(id)}
                          className="flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white cursor-pointer whitespace-nowrap"
                        >
                          <PackagePlus className="w-3.5 h-3.5" />
                          Titip ke Gudang
                        </button>
                        <div className="flex items-center gap-2">
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
                              Atau Truk…
                            </option>
                            {vehicles.map((v, idx) => (
                              <option key={idx} value={idx}>
                                {v.driver} &middot; {v.vehicle}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </td>
                  )}
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>

      {/* Kartu untuk layar sempit (HP) */}
      <div className="md:hidden space-y-2">
        {orderIds.map((id) => {
          const order = ordersMap[id];
          if (!order) return null;
          return (
            <AmsenCard
              key={id}
              id={id}
              order={order}
              vehicles={vehicles}
              onManualAllocate={onManualAllocate}
              onGeocode={onGeocode}
              geocodingId={geocodingId}
              onAddToGudang={onAddToGudang}
            />
          );
        })}
      </div>
    </section>
  );
}
