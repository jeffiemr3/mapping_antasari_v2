function StatCard({ icon, label, value, valueClassName = '', subtitle }) {
  return (
    <div className="bg-white dark:bg-[#111218] border border-slate-200 dark:border-white/5 rounded-2xl p-4">
      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1">
        {icon} {label}
      </p>
      <p className={`font-display font-bold text-2xl mt-1 ${valueClassName || 'text-slate-900 dark:text-white'}`}>{value}</p>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
    </div>
  );
}

export default function StatsRow({ totalNota, allocatedCount, unallocatedCount, totalWeightKg, totalCubageM3 }) {
  const effectiveness = totalNota > 0 ? Math.round((allocatedCount / totalNota) * 100) : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 no-print">
      <StatCard label="Total Nota Hari Ini" value={totalNota} subtitle="Memenuhi kriteria filter" />
      <StatCard
        label="Telah Teralokasi"
        value={allocatedCount}
        valueClassName="text-teal-600 dark:text-teal-400"
        subtitle={`${effectiveness}% Efektivitas`}
      />
      <StatCard
        label="Belum Teralokasi"
        value={unallocatedCount}
        valueClassName="text-rose-600 dark:text-rose-400"
        subtitle={`${unallocatedCount} Perlu Alokasi`}
      />
      <StatCard
        label="Total Tonase"
        value={`${(totalWeightKg / 1000).toFixed(1)} Ton`}
        subtitle={`${totalWeightKg.toLocaleString('id-ID', { maximumFractionDigits: 0 })} kg beban`}
      />
      <StatCard
        label="Total Volume"
        value={`${totalCubageM3.toFixed(2)} m\u00B3`}
        valueClassName="text-blue-600 dark:text-blue-400"
        subtitle="Kapasitas kubikasi total"
      />
    </div>
  );
}
