import { useRef, useState } from 'react';
import { X, Ruler, Plus, Trash2, Download, Upload, Info } from 'lucide-react';
import { normalizeSizeToken, parseSizeWeightExcel, downloadSizeWeightExcel } from '../utils/sizeWeight';

const KLASIFIKASI_OPTIONS = ['UK. STANDAR', 'UK. BESAR', 'BIG SLAB'];

export default function SizeWeightModal({ onClose, rows, onRowsChange }) {
  const [ukuran, setUkuran] = useState('');
  const [klasifikasi, setKlasifikasi] = useState(KLASIFIKASI_OPTIONS[0]);
  const [beratKg, setBeratKg] = useState('');
  const [status, setStatus] = useState(null);
  const fileInputRef = useRef(null);

  function addRow() {
    const normalized = normalizeSizeToken(ukuran);
    const berat = parseFloat(beratKg);
    if (!normalized || !berat || berat <= 0) {
      setStatus({ type: 'error', message: 'Isi ukuran (mis. 70X70) dan berat/box yang valid dulu.' });
      return;
    }
    const withoutDuplicate = rows.filter((r) => normalizeSizeToken(r.ukuran) !== normalized);
    onRowsChange([...withoutDuplicate, { ukuran: normalized, klasifikasi, beratKg: berat }]);
    setUkuran('');
    setBeratKg('');
    setStatus(null);
  }

  function removeRow(idx) {
    onRowsChange(rows.filter((_, i) => i !== idx));
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseSizeWeightExcel(await file.arrayBuffer());
      // Baris baru menimpa ukuran yang sama, sisanya digabung.
      const parsedSizes = new Set(parsed.map((r) => r.ukuran));
      const merged = rows.filter((r) => !parsedSizes.has(normalizeSizeToken(r.ukuran))).concat(parsed);
      onRowsChange(merged);
      setStatus({ type: 'ok', message: `Berhasil memuat ${parsed.length} baris dari ${file.name}.` });
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      e.target.value = '';
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 no-print">
      <div className="bg-white dark:bg-[#111218] border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-2xl max-h-[88vh] overflow-y-auto p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Ruler className="w-5 h-5 text-orange-500" />
            Master Tambahan &mdash; Berat per Ukuran
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-3 flex gap-2">
          <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-600 dark:text-slate-300">
            Dipakai sebagai cadangan: kalau kode barang di sebuah nota tidak ditemukan di <strong>Master Item</strong>,
            aplikasi akan coba baca ukuran dari nama barangnya (mis. &quot;...70X70CM...&quot;) dan pakai berat/box dari
            tabel ini. Kubikasi/volume tetap tidak diketahui lewat jalur ini (tabel ini cuma punya data berat).
          </p>
        </div>

        <div className="flex items-center justify-between">
          <label className="text-[10.5px] uppercase tracking-wider text-slate-400 font-bold">
            Klasifikasi Sizing &amp; Berat
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => downloadSizeWeightExcel(rows)}
              className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1c1d26] cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download Excel
            </button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleUpload} className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1c1d26] cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Excel
            </button>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end bg-slate-50 dark:bg-[#151720] rounded-xl p-3">
          <div className="space-y-1">
            <label className="text-[9.5px] uppercase tracking-wider text-slate-400 font-bold">Ukuran (misal: 70X70)</label>
            <input
              value={ukuran}
              onChange={(e) => setUkuran(e.target.value)}
              placeholder="70X70"
              className="w-full text-xs font-mono border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1c1d26] text-slate-900 dark:text-white rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9.5px] uppercase tracking-wider text-slate-400 font-bold">Klasifikasi</label>
            <select
              value={klasifikasi}
              onChange={(e) => setKlasifikasi(e.target.value)}
              className="w-full text-xs border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1c1d26] text-slate-900 dark:text-white rounded-lg p-2 cursor-pointer focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              {KLASIFIKASI_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9.5px] uppercase tracking-wider text-slate-400 font-bold">Berat / Box (KG)</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={beratKg}
              onChange={(e) => setBeratKg(e.target.value)}
              placeholder="20"
              className="w-full text-xs font-mono border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1c1d26] text-slate-900 dark:text-white rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>
          <button
            onClick={addRow}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg p-2 cursor-pointer shrink-0"
            title="Tambah baris"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {status && (
          <p className={`text-[11px] ${status.type === 'ok' ? 'text-teal-600 dark:text-teal-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {status.message}
          </p>
        )}

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/5">
          <table className="w-full text-xs text-slate-700 dark:text-slate-300">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#151720] border-b border-slate-200 dark:border-white/5 text-left font-bold text-slate-600 dark:text-slate-300">
                <th className="p-2.5">Ukuran</th>
                <th className="p-2.5">Klasifikasi</th>
                <th className="p-2.5 text-right">Berat (kg)</th>
                <th className="p-2.5 w-12 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-slate-400 italic">
                    Belum ada data. Tambah baris di atas atau upload Excel.
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-[#151720]/40">
                    <td className="p-2.5 font-mono font-bold text-slate-900 dark:text-white">{row.ukuran}</td>
                    <td className="p-2.5 text-slate-500 dark:text-slate-400">{row.klasifikasi}</td>
                    <td className="p-2.5 text-right font-mono font-semibold text-blue-600 dark:text-blue-400">
                      {row.beratKg}
                    </td>
                    <td className="p-2.5 text-center">
                      <button
                        onClick={() => removeRow(idx)}
                        className="text-rose-500 hover:text-rose-600 cursor-pointer"
                        title="Hapus baris"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-xs py-2.5 rounded-xl cursor-pointer"
        >
          Simpan &amp; Tutup
        </button>
      </div>
    </div>
  );
}
