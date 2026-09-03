import { Truck, X, MapPinned } from 'lucide-react';
import { ROUTE_COLORS } from '../data/constants';

export default function VehicleCard({
  vehicle,
  vehicleIndex,
  assignedIds,
  ordersMap,
  isFocused,
  onToggleFocus,
  onRemoveStop,
  vehicleCount,
}) {
  const totalWeight = assignedIds.reduce((sum, id) => sum + (ordersMap[id]?.totalWeightKg || 0), 0);
  const totalCubage = assignedIds.reduce((sum, id) => sum + (ordersMap[id]?.totalCubageM3 || 0), 0);
  const weightPct = vehicle.capWeightKg > 0 ? Math.min(100, (totalWeight / vehicle.capWeightKg) * 100) : 0;
  const cubagePct = vehicle.capCubageM3 > 0 ? Math.min(100, (totalCubage / vehicle.capCubageM3) * 100) : 0;
  const color = ROUTE_COLORS[vehicleIndex % ROUTE_COLORS.length];

  return (
    <section
      className={`bg-[#111218] border rounded-2xl p-4 space-y-3 print-route ${
        isFocused ? 'border-blue-500/50' : 'border-white/5'
      }`}
    >
      <div className="flex items-center justify-between">
        <button
          onClick={onToggleFocus}
          className="flex items-center gap-2 cursor-pointer no-print"
          title="Fokuskan rute ini di peta"
        >
          <span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: color }}>
            <Truck className="w-3.5 h-3.5 text-slate-950" />
          </span>
          <div className="text-left">
            <p className="font-display font-bold text-xs text-white leading-none">{vehicle.driver}</p>
            <p className="text-[10px] text-slate-500 leading-none mt-0.5">
              {vehicle.vehicle} &middot; {vehicle.plate}
            </p>
          </div>
        </button>
        {isFocused && (
          <span className="text-[10px] text-blue-400 font-bold bg-blue-500/15 px-2 py-0.5 rounded-full border border-blue-500/20 no-print">
            Fokus Terpilih
          </span>
        )}
        <span className="hidden print:block font-display font-bold text-xs">
          {vehicle.driver} &middot; {vehicle.vehicle} &middot; {vehicle.plate}
        </span>
      </div>

      <div className="space-y-1.5 no-print">
        <div className="flex justify-between text-[10px] text-slate-500">
          <span>Berat: {totalWeight.toFixed(1)} / {vehicle.capWeightKg} kg</span>
          <span>{weightPct.toFixed(0)}%</span>
        </div>
        <div className="h-1.5 bg-[#1c1d26] rounded-full overflow-hidden">
          <div
            className={`h-full ${weightPct > 90 ? 'bg-rose-500' : 'bg-indigo-500'}`}
            style={{ width: `${weightPct}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-500">
          <span>
            Volume: {totalCubage.toFixed(3)} / {vehicle.capCubageM3} m&sup3;
          </span>
          <span>{cubagePct.toFixed(0)}%</span>
        </div>
        <div className="h-1.5 bg-[#1c1d26] rounded-full overflow-hidden">
          <div
            className={`h-full ${cubagePct > 90 ? 'bg-rose-500' : 'bg-teal-500'}`}
            style={{ width: `${cubagePct}%` }}
          />
        </div>
      </div>

      {assignedIds.length === 0 ? (
        <p className="text-[11px] text-slate-500 italic">Belum ada pengiriman dialokasikan ke armada ini.</p>
      ) : (
        <ol className="space-y-2">
          {assignedIds.map((id, idx) => {
            const order = ordersMap[id];
            if (!order) return null;
            return (
              <li key={id} className="flex items-start gap-2 text-[11px] bg-[#151720] rounded-xl p-2.5">
                <span
                  className="w-5 h-5 shrink-0 rounded-full text-white font-bold text-[10px] flex items-center justify-center"
                  style={{ backgroundColor: color }}
                >
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white truncate">{order.customer}</p>
                  <p className="text-slate-400 truncate">{order.address}</p>
                  <p className="text-slate-500 font-mono text-[10px]">
                    {order.NPno} &middot; {order.totalWeightKg.toFixed(1)}kg &middot; {order.totalCubageM3.toFixed(3)}m&sup3;
                  </p>
                  {order.comments.length > 0 && (
                    <p className="text-amber-400 text-[10px] mt-0.5">💬 {order.comments.join('; ')}</p>
                  )}
                  {!order.lat && (
                    <p className="text-rose-400 text-[10px] flex items-center gap-1 mt-0.5">
                      <MapPinned className="w-3 h-3" /> Belum ada koordinat
                    </p>
                  )}
                </div>
                <button
                  onClick={() => onRemoveStop(id, vehicleIndex)}
                  className="text-slate-500 hover:text-rose-400 cursor-pointer no-print"
                  title="Keluarkan dari rute ini"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </li>
            );
          })}
        </ol>
      )}
      <p className="text-[10px] text-slate-600 no-print">
        {assignedIds.length} stop &middot; kendaraan {vehicleIndex + 1}/{vehicleCount}
      </p>
    </section>
  );
}
