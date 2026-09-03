import { Printer, Route } from 'lucide-react';
import { ROUTE_COLORS } from '../data/constants';

function VehicleManifest({ vehicle, vehicleIndex, assignedIds, ordersMap, allVehicles, selectedDate, onMoveStop, isFocused }) {
  const totalWeight = assignedIds.reduce((sum, id) => sum + (ordersMap[id]?.totalWeightKg || 0), 0);
  const totalCubage = assignedIds.reduce((sum, id) => sum + (ordersMap[id]?.totalCubageM3 || 0), 0);
  const color = ROUTE_COLORS[vehicleIndex % ROUTE_COLORS.length];

  return (
    <div
      style={{ borderLeftColor: color, borderLeftWidth: 6 }}
      className={`print-route bg-white dark:bg-[#111218] rounded-2xl border p-4 print:p-2.5 space-y-3 ${
        isFocused ? 'border-blue-300 dark:border-blue-500/40 ring-1 ring-blue-200 dark:ring-blue-500/10' : 'border-slate-200 dark:border-white/5'
      }`}
    >
      {/* Header khusus cetak (tersembunyi di layar) */}
      <div className="hidden print:block border-b border-slate-900 pb-1.5 mb-1">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-sm font-bold tracking-tight text-slate-900">MITRA10 ANTASARI &bull; MANIFEST JALAN SUPIR</h2>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Kendaraan: <strong>{vehicle.vehicle}</strong> &bull; No. Polisi: <strong>{vehicle.plate}</strong> &bull; Supir:{' '}
              <strong>{vehicle.driver}</strong>
            </p>
          </div>
          <div className="text-right text-[10px] text-slate-500 font-mono">
            Tanggal: {selectedDate} &bull; Total Stops: {assignedIds.length}
          </div>
        </div>
        <div className="flex gap-x-4 text-[10.5px] font-semibold text-slate-800 mt-1.5 bg-slate-100 p-1.5 rounded">
          <span>
            Total Berat: {totalWeight.toFixed(1)} / {vehicle.capWeightKg} kg
          </span>
          <span>
            Total Volume: {totalCubage.toFixed(3)} / {vehicle.capCubageM3.toFixed(3)} m&sup3;
          </span>
        </div>
      </div>

      {/* Header layar */}
      <div className="flex justify-between items-start gap-4 flex-wrap no-print">
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full inline-block shrink-0" style={{ backgroundColor: color }} />
          <div>
            <h4 className="font-display font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
              {vehicle.vehicle} &bull; {vehicle.plate}
              <span className="text-xs font-normal text-slate-400">({assignedIds.length} stops)</span>
            </h4>
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Supir: {vehicle.driver}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right text-xs font-mono pr-2 border-r border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-200">{totalWeight.toFixed(1)} kg</span> /{' '}
            {totalCubage.toFixed(3)} m&sup3;
          </div>
          <button
            onClick={() => window.print()}
            disabled={assignedIds.length === 0}
            className="bg-slate-100 dark:bg-[#1c1d26] hover:bg-slate-200 dark:hover:bg-[#222431] text-slate-700 dark:text-slate-300 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/5 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5" />
            Cetak Manifest
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/5">
        <table className="w-full text-xs text-slate-700 dark:text-slate-300 border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-[#151720] border-b border-slate-200 dark:border-white/5 text-left font-bold text-slate-600 dark:text-slate-200">
              <th className="p-2 w-10 text-center">Urutan</th>
              <th className="p-2 w-28">Nota (NPno)</th>
              <th className="p-2">Pelanggan &amp; Alamat</th>
              <th className="p-2">Item Pengiriman</th>
              <th className="p-2 w-24 text-right">Berat &amp; Vol</th>
              <th className="p-2 w-28 text-right no-print">Alihkan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {assignedIds.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-400 italic">
                  Belum ada pengiriman dialokasikan ke armada ini.
                </td>
              </tr>
            ) : (
              assignedIds.map((id, idx) => {
                const order = ordersMap[id];
                if (!order) return null;
                const loadOrder = assignedIds.length - idx; // LIFO: dimuat kebalikan urutan antar
                return (
                  <tr key={id} className="hover:bg-slate-50 dark:hover:bg-[#151720]/40">
                    <td className="p-2 text-center">
                      <span
                        className="w-5 h-5 rounded-full text-white font-mono font-bold text-[10px] flex items-center justify-center mx-auto"
                        style={{ backgroundColor: color }}
                      >
                        {idx + 1}
                      </span>
                    </td>
                    <td className="p-2">
                      <div className="font-mono text-[11px] font-bold text-slate-900 dark:text-white">{order.NPno}</div>
                      <div className="text-[9.5px] text-slate-400 mt-0.5">
                        Muat ke-<strong>{loadOrder}</strong>
                      </div>
                    </td>
                    <td className="p-2 max-w-sm">
                      <div className="font-bold text-[11px] text-slate-900 dark:text-white">{order.customer}</div>
                      <p className="text-slate-500 dark:text-slate-400 text-[10px] leading-tight mt-0.5">
                        {order.address} {order.address2 ? `(${order.address2})` : ''}
                      </p>
                      {order.phone && (
                        <span className="font-mono text-[9.5px] text-emerald-600 dark:text-emerald-400 font-semibold block mt-0.5">
                          📞 {order.phone}
                        </span>
                      )}
                    </td>
                    <td className="p-2 space-y-0.5">
                      {order.lines.map((line, li) => (
                        <div
                          key={li}
                          className="flex justify-between items-center gap-2 text-[10px] leading-tight border-b border-slate-100 dark:border-white/5 pb-0.5"
                        >
                          <span className="text-slate-600 dark:text-slate-300">
                            {line.itemName} &times; <strong className="text-slate-900 dark:text-white">{line.qty}</strong> {line.uom}
                          </span>
                          {line.comment && (
                            <span className="px-1 py-0.5 bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[8px] rounded font-medium border border-amber-200 dark:border-amber-500/20 shrink-0 max-w-28 truncate">
                              💬 {line.comment}
                            </span>
                          )}
                        </div>
                      ))}
                    </td>
                    <td className="p-2 text-right font-mono font-medium text-slate-700 dark:text-slate-200">
                      <div className="text-[11px]">{order.totalWeightKg.toFixed(1)} kg</div>
                      <div className="text-[9.5px] text-slate-400 mt-0">{order.totalCubageM3.toFixed(3)} m&sup3;</div>
                    </td>
                    <td className="p-2 text-right no-print">
                      <select
                        value={vehicleIndex}
                        onChange={(e) => onMoveStop(id, vehicleIndex, parseInt(e.target.value, 10))}
                        className="text-xs border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1c1d26] text-slate-700 dark:text-white py-1 px-1.5 rounded-lg cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500"
                      >
                        {allVehicles.map((v, vi) => (
                          <option key={vi} value={vi}>
                            🚚 {v.vehicle}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Tanda tangan, cetak saja */}
      <div className="hidden print:grid grid-cols-3 gap-6 pt-4 text-center text-[10px] font-semibold text-slate-700">
        <div className="space-y-6">
          <p>Dibuat Oleh,</p>
          <div className="border-t border-slate-400 mx-auto w-32 pt-1">Logistik Toko</div>
        </div>
        <div className="space-y-6">
          <p>Dibawa Oleh,</p>
          <div className="border-t border-slate-400 mx-auto w-32 pt-1">
            {vehicle.driver} ({vehicle.plate})
          </div>
        </div>
        <div className="space-y-6">
          <p>Disetujui Oleh,</p>
          <div className="border-t border-slate-400 mx-auto w-32 pt-1">Store Manager</div>
        </div>
      </div>
    </div>
  );
}

export default function ManifestSection({ drivers, assignments, ordersMap, selectedDate, onMoveStop, focusedVehicleIdx }) {
  const totalAssigned = assignments.reduce((sum, arr) => sum + arr.length, 0);

  return (
    <section className="space-y-4">
      <div className="border-b border-slate-200 dark:border-white/5 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div className="space-y-1">
          <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
            <Route className="w-4 h-4 text-amber-500" />
            Manifest Jalan Armada Pengiriman
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Urutan Ke-N merupakan petunjuk rute. Barang stop terakhir dimuat paling belakang (LIFO).
          </p>
        </div>
        <button
          onClick={() => window.print()}
          disabled={totalAssigned === 0}
          className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed"
        >
          <Printer className="w-4 h-4" />
          Cetak Semua Rute (Ramping &amp; Hemat Kertas)
        </button>
      </div>

      {drivers.map((vehicle, idx) => {
        if (focusedVehicleIdx !== null && focusedVehicleIdx !== idx) return null;
        return (
          <VehicleManifest
            key={idx}
            vehicle={vehicle}
            vehicleIndex={idx}
            assignedIds={assignments[idx] || []}
            ordersMap={ordersMap}
            allVehicles={drivers}
            selectedDate={selectedDate}
            onMoveStop={onMoveStop}
            isFocused={focusedVehicleIdx === idx}
          />
        );
      })}
    </section>
  );
}
