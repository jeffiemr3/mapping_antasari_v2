import { Factory, X } from 'lucide-react';

export default function GudangSection({ gudangIds, ordersMap, onRemoveFromGudang }) {
  if (gudangIds.length === 0) return null;

  return (
    <section className="no-print bg-teal-50 dark:bg-teal-950/15 border border-teal-200 dark:border-teal-500/20 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Factory className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
        <div>
          <h4 className="font-display font-bold text-sm text-teal-700 dark:text-teal-400">
            📦 Titipan Gudang ({gudangIds.length} nota)
          </h4>
          <p className="text-[11px] text-slate-600 dark:text-slate-300">
            Barang-barang ini tidak dikirim pakai armada &mdash; ikut terkirim ke operator (tab &quot;Titipan
            Gudang&quot;) saat klik &quot;Kirim ke Operator&quot; di bawah, supaya bisa disiapkan &amp; disimpan
            menunggu diambil pelanggan.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {gudangIds.map((id) => {
          const order = ordersMap[id];
          if (!order) return null;
          return (
            <span
              key={id}
              className="flex items-center gap-1.5 text-[11px] bg-white dark:bg-[#111218] border border-teal-200 dark:border-teal-500/20 rounded-full pl-3 pr-1.5 py-1"
            >
              <span className="font-semibold text-slate-700 dark:text-slate-200">{order.customer}</span>
              <span className="font-mono text-slate-400">({order.NPno})</span>
              <button
                onClick={() => onRemoveFromGudang(id)}
                title="Batalkan titip gudang (kembalikan ke daftar Amsen)"
                className="p-0.5 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          );
        })}
      </div>
    </section>
  );
}
