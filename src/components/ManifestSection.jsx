import { useState } from 'react';
import { Printer, Route, Send } from 'lucide-react';
import { ROUTE_COLORS } from '../data/constants';
import { clusterOrders } from '../utils/allocation';
import SendToOperatorModal from './SendToOperatorModal';

function StopRow({ stop, stopIdx, totalStops, ordersMap, color, vehicleIndex, allVehicles, onMoveStop, onRemoveStop }) {
  const members = stop.members;
  const primary = ordersMap[members[0]];
  if (!primary) return null;
  const loadOrder = totalStops - stopIdx; // LIFO: dimuat kebalikan urutan antar stop
  const isMultiNota = members.length > 1;

  const mergedComments = [];
  members.forEach((id) => {
    (ordersMap[id]?.comments || []).forEach((c) => {
      if (!mergedComments.includes(c)) mergedComments.push(c);
    });
  });
  const anyPriority = members.some((id) => ordersMap[id]?.priorityRit1);
  const stopWeight = members.reduce((sum, id) => sum + (ordersMap[id]?.totalWeightKg || 0), 0);
  const stopCubage = members.reduce((sum, id) => sum + (ordersMap[id]?.totalCubageM3 || 0), 0);

  function handleSelectChange(e) {
    const value = e.target.value;
    members.forEach((id) => {
      if (value === 'REMOVE') onRemoveStop(id, vehicleIndex);
      else onMoveStop(id, vehicleIndex, parseInt(value, 10));
    });
  }

  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-[#151720]/40 align-top print:break-inside-avoid print:even:bg-slate-50">
      <td className="p-2 print:p-1.5 text-center print:border print:border-slate-300 print:align-top">
        <span
          className="w-5 h-5 print:w-6 print:h-6 rounded-full text-white print:text-slate-900 print:bg-white font-mono font-bold text-[10px] print:text-[11px] flex items-center justify-center mx-auto print:border-2 print:border-slate-800"
          style={{ backgroundColor: color }}
        >
          {stopIdx + 1}
        </span>
        <div className="hidden print:block text-[7px] text-slate-500 mt-1 leading-none">&#9744; selesai</div>
      </td>
      <td className="p-2 print:p-1.5 max-w-sm print:border print:border-slate-300 print:align-top">
        <div className="flex items-baseline gap-2 flex-wrap">
          {isMultiNota ? (
            <span className="flex flex-col gap-0.5">
              {members.map((id) => (
                <span key={id} className="font-mono text-[10.5px] print:text-[9px] font-bold text-slate-900 dark:text-white">
                  {id}
                </span>
              ))}
            </span>
          ) : (
            <span className="font-mono text-[10.5px] print:text-[9px] font-bold text-slate-900 dark:text-white">
              {members[0]}
            </span>
          )}
          <span className="text-[9px] print:text-[8px] text-slate-400 print:text-slate-500">
            Muat ke-<strong>{loadOrder}</strong>
          </span>
          {isMultiNota && (
            <span className="text-[8.5px] print:text-[8px] px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-500/15 print:bg-transparent text-indigo-700 dark:text-indigo-400 print:text-indigo-700 rounded font-bold border border-indigo-200 dark:border-indigo-500/20 print:border print:border-indigo-700 shrink-0">
              &#128230; {members.length} NOTA - 1 DROP
            </span>
          )}
          {anyPriority && (
            <span className="text-[8.5px] print:text-[8px] px-1.5 py-0.5 bg-red-100 dark:bg-red-500/15 print:bg-transparent text-red-700 dark:text-red-400 print:text-red-700 rounded font-bold border border-red-200 dark:border-red-500/20 print:border print:border-red-700 shrink-0">
            &#9200; PRIORITAS RIT 1
          </span>
          )}
        </div>
        <div className="font-bold text-[11px] print:text-[10px] text-slate-900 dark:text-white mt-1 print:mt-1.5">
          {primary.customer}
        </div>
        <p className="text-slate-500 dark:text-slate-400 print:text-slate-700 text-[10px] print:text-[8.5px] leading-tight mt-0.5 print:mt-1">
          {primary.address} {primary.address2 ? `(${primary.address2})` : ''}
        </p>
        {primary.phone && (
          <span className="font-mono text-[9.5px] print:text-[8.5px] text-emerald-600 dark:text-emerald-400 print:text-slate-800 font-semibold block mt-0.5 print:mt-1">
            &#9742; {primary.phone}
          </span>
        )}
        {mergedComments.length > 0 && (
          <span className="inline-block mt-0.5 print:mt-1 px-1 py-0.5 bg-amber-100 dark:bg-amber-500/15 print:bg-transparent print:px-0 print:py-0 text-amber-700 dark:text-amber-400 print:text-slate-900 text-[9px] print:text-[8.5px] rounded font-medium print:font-bold border border-amber-200 dark:border-amber-500/20 print:border-0">
            &#128172; {mergedComments.join(' / ')}
          </span>
        )}
        <div className="text-[9.5px] print:hidden font-mono font-semibold text-slate-600 dark:text-slate-300 mt-0.5">
          &#9878; {stopWeight.toFixed(1)} kg &middot; {stopCubage.toFixed(3)} m&sup3;
        </div>
        <div className="hidden print:block mt-2 pt-1 border-t border-dotted border-slate-400">
          <span className="text-[7.5px] text-slate-500">Catatan: </span>
          <span className="inline-block align-bottom border-b border-slate-400" style={{ width: '75%' }}>
            &nbsp;
          </span>
        </div>
      </td>
      <td className="p-2 print:p-1.5 print:border print:border-slate-300 print:align-top">
        <div className="space-y-1.5 print:space-y-1.5">
          {members.map((id) => {
            const order = ordersMap[id];
            if (!order) return null;
            return (
              <div key={id} className={isMultiNota ? 'pb-1 print:pb-1 border-b border-dashed border-slate-200 dark:border-white/10 print:border-slate-300 last:border-0' : ''}>
                {isMultiNota && (
                  <p className="text-[8.5px] print:text-[7.5px] font-mono text-slate-400 print:text-slate-500 mb-0.5">{id}:</p>
                )}
                <div className="space-y-0.5 print:space-y-1">
                  {order.lines.map((line, li) => (
                    <div key={li} className="flex items-center gap-1 text-[10px] print:text-[8.5px] leading-tight border-b border-slate-100 dark:border-white/5 print:border-b-0 pb-0.5 print:pb-0">
                      <span className="text-slate-600 dark:text-slate-300 print:text-slate-800 flex items-center gap-1 flex-wrap">
                        <span className="hidden print:inline text-slate-400">&bull;</span>
                        {line.itemName} &times; <strong className="text-slate-900 dark:text-white">{line.qty}</strong> {line.uom}
                        {line.weightSource === 'sizeEstimate' && (
                          <span
                            className="print:hidden text-[8px] px-1 py-0.5 bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 rounded border border-blue-200 dark:border-blue-500/20 shrink-0"
                            title="Berat ditaksir dari Master Tambahan (ukuran), bukan dari Master Item"
                          >
                            &#8776; estimasi
                          </span>
                        )}
                        {line.missing && (
                          <span
                            className="print:hidden text-[8px] px-1 py-0.5 bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 rounded border border-rose-200 dark:border-rose-500/20 shrink-0"
                            title="Kode barang tidak ditemukan di Master Item maupun Master Tambahan"
                          >
                            &#9888; berat n/a
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </td>
      <td className="p-2 text-right no-print">
        <select
          value={vehicleIndex}
          onChange={handleSelectChange}
          className="text-xs border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1c1d26] text-slate-700 dark:text-white py-1 px-1.5 rounded-lg cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          {allVehicles.map((v, vi) => (
            <option key={vi} value={vi}>
              🚚 {v.vehicle}
            </option>
          ))}
          <option value="REMOVE" className="text-rose-600">
            🗑️ Keluarkan (Reschedule)
          </option>
        </select>
      </td>
    </tr>
  );
}

function VehicleManifest({ vehicle, vehicleIndex, assignedIds, ordersMap, allVehicles, selectedDate, onMoveStop, onRemoveStop, isFocused, pageBreakBefore }) {
  const totalWeight = assignedIds.reduce((sum, id) => sum + (ordersMap[id]?.totalWeightKg || 0), 0);
  const totalCubage = assignedIds.reduce((sum, id) => sum + (ordersMap[id]?.totalCubageM3 || 0), 0);
  const color = ROUTE_COLORS[vehicleIndex % ROUTE_COLORS.length];
  // Nota dengan nama pelanggan ATAU no. HP yang sama digabung jadi 1 baris/drop,
  // supaya tidak dikirim terpisah - pakai algoritma clustering yang sama
  // dengan yang dipakai auto-allocate (union-find nama/telepon).
  const stops = clusterOrders(assignedIds, ordersMap);

  return (
    <div
      style={{ borderLeftColor: color, borderLeftWidth: 6 }}
      className={`print-route bg-white dark:bg-[#111218] rounded-2xl border p-4 print:p-1.5 space-y-3 print:space-y-1 ${
        pageBreakBefore ? 'print:break-before-page' : ''
      } ${
        isFocused ? 'border-blue-300 dark:border-blue-500/40 ring-1 ring-blue-200 dark:ring-blue-500/10' : 'border-slate-200 dark:border-white/5'
      }`}
    >
      {/* Header khusus cetak (tersembunyi di layar) */}
      <div className="hidden print:block border-2 border-slate-800 rounded-none p-2 mb-1.5">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-sm font-extrabold tracking-tight text-slate-900">MITRA10 ANTASARI &bull; MANIFEST JALAN SUPIR</h2>
            <p className="text-[10px] text-slate-700 mt-1">
              Kendaraan: <strong>{vehicle.vehicle}</strong> &bull; No. Polisi: <strong>{vehicle.plate}</strong> &bull; Supir:{' '}
              <strong>{vehicle.driver}</strong>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-600 font-mono">{selectedDate}</p>
            <p className="text-sm font-extrabold text-slate-900">{stops.length} STOP</p>
          </div>
        </div>
      </div>

      {/* Header layar */}
      <div className="flex justify-between items-start gap-4 flex-wrap no-print">
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full inline-block shrink-0" style={{ backgroundColor: color }} />
          <div>
            <h4 className="font-display font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
              {vehicle.vehicle} &bull; {vehicle.plate}
              <span className="text-xs font-normal text-slate-400">({stops.length} stops &middot; {assignedIds.length} nota)</span>
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

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/5 print:border-0 print:rounded-none print:overflow-visible">
        <table className="w-full text-xs print:text-[9.5px] text-slate-700 dark:text-slate-300 border-collapse table-auto print:table-fixed">
          <colgroup className="hidden print:table-column-group">
            <col className="print:w-[7%]" />
            <col className="print:w-[42%]" />
            <col className="print:w-[51%]" />
          </colgroup>
          <thead>
            <tr className="bg-slate-50 dark:bg-[#151720] print:bg-slate-200 border-b border-slate-200 dark:border-white/5 print:border-b-2 print:border-slate-800 text-left font-bold text-slate-600 dark:text-slate-200 print:text-slate-900">
              <th className="p-2 print:p-1.5 w-8 text-center print:border print:border-slate-400">Urutan</th>
              <th className="p-2 print:p-1.5 print:border print:border-slate-400">Nota &amp; Pelanggan &amp; Alamat &amp; Komen &amp; Tonase</th>
              <th className="p-2 print:p-1.5 print:border print:border-slate-400">Item Pengiriman</th>
              <th className="p-2 print:p-1.5 w-28 text-right no-print">Alihkan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5 print:divide-y-0">
            {stops.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-6 text-center text-slate-400 italic">
                  Belum ada pengiriman dialokasikan ke armada ini.
                </td>
              </tr>
            ) : (
              stops.map((stop, stopIdx) => (
                <StopRow
                  key={stop.members.join(',')}
                  stop={stop}
                  stopIdx={stopIdx}
                  totalStops={stops.length}
                  ordersMap={ordersMap}
                  color={color}
                  vehicleIndex={vehicleIndex}
                  allVehicles={allVehicles}
                  onMoveStop={onMoveStop}
                  onRemoveStop={onRemoveStop}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Tanda tangan, cetak saja */}
      <div className="hidden print:grid grid-cols-3 gap-6 pt-2 text-center text-[9px] font-semibold text-slate-700">
        <div className="space-y-4">
          <p>Dibuat Oleh,</p>
          <div className="border-t border-slate-400 mx-auto w-28 pt-1">Logistik Toko</div>
        </div>
        <div className="space-y-4">
          <p>Dibawa Oleh,</p>
          <div className="border-t border-slate-400 mx-auto w-28 pt-1">
            {vehicle.driver} ({vehicle.plate})
          </div>
        </div>
        <div className="space-y-4">
          <p>Disetujui Oleh,</p>
          <div className="border-t border-slate-400 mx-auto w-28 pt-1">Store Manager</div>
        </div>
      </div>
    </div>
  );
}

export default function ManifestSection({
  drivers,
  assignments,
  ordersMap,
  selectedDate,
  onMoveStop,
  onRemoveStop,
  focusedVehicleIdx,
  warehouseLocations,
}) {
  const totalAssigned = assignments.reduce((sum, arr) => sum + arr.length, 0);
  const [sendModalOpen, setSendModalOpen] = useState(false);

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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSendModalOpen(true)}
            disabled={totalAssigned === 0}
            className="bg-white dark:bg-[#111218] hover:bg-slate-50 dark:hover:bg-[#1c1d26] disabled:opacity-50 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4 text-indigo-500" />
            Kirim ke Operator
          </button>
          <button
            onClick={() => window.print()}
            disabled={totalAssigned === 0}
            className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed"
          >
            <Printer className="w-4 h-4" />
            Cetak Semua Rute (Ramping &amp; Hemat Kertas)
          </button>
        </div>
      </div>

      {drivers.map((vehicle, idx) => {
        if (focusedVehicleIdx !== null && focusedVehicleIdx !== idx) return null;
        // Hitung apakah ini armada pertama yg ditampilkan (kalau ada focus filter,
        // armada yg difokuskan itu sendiri jadi "pertama" -> tidak perlu page-break).
        const isFirstVisible =
          focusedVehicleIdx !== null ? focusedVehicleIdx === idx : idx === 0;
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
            onRemoveStop={onRemoveStop}
            isFocused={focusedVehicleIdx === idx}
            pageBreakBefore={!isFirstVisible}
          />
        );
      })}

      {sendModalOpen && (
        <SendToOperatorModal
          onClose={() => setSendModalOpen(false)}
          drivers={drivers}
          assignments={assignments}
          ordersMap={ordersMap}
          selectedDate={selectedDate}
          warehouseLocations={warehouseLocations}
        />
      )}
    </section>
  );
}
