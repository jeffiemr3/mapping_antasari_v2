import { MapPinned } from 'lucide-react';
import { ROUTE_COLORS } from '../data/constants';

export default function FleetOverviewCard({ vehicle, vehicleIndex, assignedIds, ordersMap, isFocused, onToggleFocus }) {
  const totalWeight = assignedIds.reduce((sum, id) => sum + (ordersMap[id]?.totalWeightKg || 0), 0);
  const totalCubage = assignedIds.reduce((sum, id) => sum + (ordersMap[id]?.totalCubageM3 || 0), 0);
  const weightPct = vehicle.capWeightKg > 0 ? Math.min(100, (totalWeight / vehicle.capWeightKg) * 100) : 0;
  const cubagePct = vehicle.capCubageM3 > 0 ? Math.min(100, (totalCubage / vehicle.capCubageM3) * 100) : 0;
  const loadPct = Math.max(weightPct, cubagePct);
  const color = ROUTE_COLORS[vehicleIndex % ROUTE_COLORS.length];

  return (
    <button
      onClick={onToggleFocus}
      style={{ borderLeftColor: color, borderLeftWidth: 4 }}
      className={`text-left bg-white dark:bg-[#111218] border rounded-2xl p-3.5 space-y-2 cursor-pointer transition-shadow ${
        isFocused ? 'ring-2 ring-blue-400' : ''
      } border-slate-200 dark:border-white/5`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="font-display font-bold text-xs text-slate-900 dark:text-white">{vehicle.vehicle}</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
            {vehicle.plate} &middot; {vehicle.driver}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-display font-bold text-sm" style={{ color }}>
            {loadPct.toFixed(0)}%
          </p>
          <p className="text-[8px] uppercase tracking-wider text-slate-400 font-bold leading-none">Muatan</p>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400">
          <span>Beban Berat:</span>
          <span>
            {totalWeight.toFixed(1)} / {vehicle.capWeightKg.toLocaleString('id-ID')} kg
          </span>
        </div>
        <div className="h-1.5 bg-slate-100 dark:bg-[#1c1d26] rounded-full overflow-hidden">
          <div className="h-full" style={{ width: `${weightPct}%`, backgroundColor: color }} />
        </div>
        <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400">
          <span>Volume Kubik:</span>
          <span>
            {totalCubage.toFixed(2)} / {vehicle.capCubageM3.toFixed(2)} m&sup3;
          </span>
        </div>
        <div className="h-1.5 bg-slate-100 dark:bg-[#1c1d26] rounded-full overflow-hidden">
          <div className="h-full" style={{ width: `${cubagePct}%`, backgroundColor: color }} />
        </div>
      </div>

      <p className="text-[10.5px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-semibold">
        <MapPinned className="w-3 h-3" style={{ color }} />
        {assignedIds.length} Alamat Stop
      </p>
    </button>
  );
}
