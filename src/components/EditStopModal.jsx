import { useState } from 'react';
import { X, PencilLine, Truck, Save } from 'lucide-react';

/**
 * Dipicu dari tombol "Edit / Pindahkan" di popup marker peta. Mengedit nama
 * pelanggan, nama barang, dan qty tersimpan sebagai "koreksi" terpisah dari
 * data mentah (lihat utils/orderOverrides.js) -- data hasil import tidak
 * pernah ditimpa langsung, supaya tetap bisa ditelusuri ke sumber aslinya.
 */
export default function EditStopModal({ order, vehicles, currentVehicleIdx, onClose, onSave, onMoveVehicle }) {
  const [customer, setCustomer] = useState(order.customer);
  const [lines, setLines] = useState(() => order.lines.map((l) => ({ itemName: l.itemName, qty: l.qty })));
  const [vehicleIdx, setVehicleIdx] = useState(currentVehicleIdx ?? '');

  function updateLine(idx, field, value) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  }

  function handleSave() {
    const linesOverride = {};
    lines.forEach((l, idx) => {
      linesOverride[idx] = { itemName: l.itemName, qty: Math.max(0, parseFloat(l.qty) || 0) };
    });
    onSave(order.NPno, { customer, lines: linesOverride });
    if (vehicleIdx !== '' && currentVehicleIdx != null && Number(vehicleIdx) !== currentVehicleIdx) {
      onMoveVehicle(order.NPno, currentVehicleIdx, Number(vehicleIdx));
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 no-print">
      <div className="bg-white dark:bg-[#111218] border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-lg max-h-[88vh] overflow-y-auto p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <PencilLine className="w-5 h-5 text-indigo-500" />
            Edit Stop
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-[10.5px] font-mono text-slate-400">{order.NPno}</p>

        <div className="space-y-1.5">
          <label className="text-[10.5px] uppercase tracking-wider text-slate-400 font-bold">Nama Pelanggan</label>
          <input
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            className="w-full text-sm font-semibold border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1c1d26] text-slate-900 dark:text-white rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {vehicles && vehicles.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-[10.5px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-orange-500" />
              Pindahkan ke Armada
            </label>
            <select
              value={vehicleIdx}
              onChange={(e) => setVehicleIdx(e.target.value)}
              className="w-full text-xs border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1c1d26] text-slate-900 dark:text-white rounded-xl p-2.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {vehicles.map((v, i) => (
                <option key={i} value={i}>
                  {i === currentVehicleIdx ? '📍 (saat ini) ' : '🚚 '}
                  {v.vehicle} — {v.driver}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-[10.5px] uppercase tracking-wider text-slate-400 font-bold">Item & Qty Dikirim</label>
          <div className="space-y-2">
            {lines.map((line, idx) => (
              <div key={idx} className="flex gap-2 items-center bg-slate-50 dark:bg-[#151720] rounded-xl p-2">
                <input
                  value={line.itemName}
                  onChange={(e) => updateLine(idx, 'itemName', e.target.value)}
                  className="flex-1 text-xs border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1c1d26] text-slate-900 dark:text-white rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <input
                  type="number"
                  min="0"
                  value={line.qty}
                  onChange={(e) => updateLine(idx, 'qty', e.target.value)}
                  className="w-16 text-center text-xs font-mono border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1c1d26] text-slate-900 dark:text-white rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <span className="text-[10px] text-slate-400 w-10 shrink-0">{order.lines[idx].uom}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Save className="w-3.5 h-3.5" />
          Simpan Perubahan
        </button>
      </div>
    </div>
  );
}
