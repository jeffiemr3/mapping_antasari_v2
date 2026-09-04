import { useState } from 'react';
import { X, Scissors, Plus, Minus, AlertTriangle } from 'lucide-react';
import { computeEvenSplit } from '../utils/splitNota';

export default function SplitNotaModal({ order, onClose, onConfirm }) {
  const [numParts, setNumParts] = useState(2);
  const [quantities, setQuantities] = useState(() =>
    order.lines.map((line) => computeEvenSplit(line.qty, 2))
  );

  function changeParts(newNumParts) {
    if (newNumParts < 2 || newNumParts > 6) return;
    setNumParts(newNumParts);
    setQuantities(order.lines.map((line) => computeEvenSplit(line.qty, newNumParts)));
  }

  function updateQty(lineIdx, partIdx, value) {
    const parsed = Math.max(0, parseInt(value, 10) || 0);
    setQuantities((prev) => {
      const next = prev.map((row) => [...row]);
      next[lineIdx][partIdx] = parsed;
      return next;
    });
  }

  const rowSums = order.lines.map((_, lineIdx) => quantities[lineIdx].reduce((a, b) => a + b, 0));
  const allValid = order.lines.every((line, lineIdx) => rowSums[lineIdx] === line.qty);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 no-print">
      <div className="bg-white dark:bg-[#111218] border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-2xl max-h-[88vh] overflow-y-auto p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Scissors className="w-5 h-5 text-orange-500" />
            Pecah Nota {order.NPno}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-3 flex gap-2">
          <AlertTriangle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-600 dark:text-slate-300">
            Nota ini akan diganti jadi {numParts} nota baru ({order.NPno}-A, {order.NPno}-B, ...), masing-masing bisa
            dialokasikan ke armada yang berbeda. Pelanggan, alamat, dan koordinat tetap sama untuk semua bagian.
          </p>
        </div>

        <div className="flex items-center justify-between">
          <label className="text-[10.5px] uppercase tracking-wider text-slate-400 font-bold">Jumlah Bagian</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => changeParts(numParts - 1)}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-[#1c1d26] text-slate-600 dark:text-slate-300 cursor-pointer disabled:opacity-40"
              disabled={numParts <= 2}
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono font-bold text-sm w-6 text-center">{numParts}</span>
            <button
              onClick={() => changeParts(numParts + 1)}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-[#1c1d26] text-slate-600 dark:text-slate-300 cursor-pointer disabled:opacity-40"
              disabled={numParts >= 6}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/5">
          <table className="w-full text-xs text-slate-700 dark:text-slate-300">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#151720] border-b border-slate-200 dark:border-white/5 text-left font-bold text-slate-600 dark:text-slate-300">
                <th className="p-2.5">Item</th>
                <th className="p-2.5 text-right">Total Qty</th>
                {Array.from({ length: numParts }, (_, i) => (
                  <th key={i} className="p-2.5 text-center">
                    Bagian {String.fromCharCode(65 + i)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {order.lines.map((line, lineIdx) => (
                <tr key={lineIdx}>
                  <td className="p-2.5">
                    {line.itemName} <span className="text-slate-400">({line.uom})</span>
                  </td>
                  <td className="p-2.5 text-right font-mono font-bold">{line.qty}</td>
                  {Array.from({ length: numParts }, (_, partIdx) => (
                    <td key={partIdx} className="p-2 text-center">
                      <input
                        type="number"
                        min="0"
                        value={quantities[lineIdx][partIdx]}
                        onChange={(e) => updateQty(lineIdx, partIdx, e.target.value)}
                        className="w-16 text-center text-xs font-mono border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1c1d26] text-slate-900 dark:text-white rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!allValid && (
          <p className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            Jumlah tiap baris harus pas sama dengan Total Qty aslinya sebelum bisa disimpan.
          </p>
        )}

        <button
          onClick={() => onConfirm(quantities)}
          disabled={!allValid}
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 text-white font-bold text-xs py-2.5 rounded-xl cursor-pointer disabled:cursor-not-allowed"
        >
          Pecah Jadi {numParts} Nota
        </button>
      </div>
    </div>
  );
}
