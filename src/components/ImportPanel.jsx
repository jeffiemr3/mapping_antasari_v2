import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { parseOrdersExcel, parseOrdersCSV, parseOrdersJSON, mergeOrderLinesByPromisedDate } from '../utils/excelImport';

export default function ImportPanel({ rawLines, onChange }) {
  const inputRef = useRef(null);
  const [status, setStatus] = useState(null); // {type: 'ok'|'error', message}

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const isJSON = /\.json$/i.test(file.name);
    const isExcel = /\.xlsx$|\.xls$/i.test(file.name);

    try {
      let newLines;
      if (isExcel) {
        const buf = await file.arrayBuffer();
        newLines = parseOrdersExcel(buf);
      } else if (isJSON) {
        const text = await file.text();
        newLines = parseOrdersJSON(text);
      } else {
        const text = await file.text();
        newLines = parseOrdersCSV(text);
      }
      onChange(mergeOrderLinesByPromisedDate(rawLines, newLines));
      setStatus({ type: 'ok', message: `Berhasil memuat ${newLines.length} baris penjualan dari ${file.name}.` });
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-[10.5px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1">
        <Upload className="w-3.5 h-3.5 text-teal-500" />
        Import Data Nota (Excel / CSV / JSON)
      </label>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv,.json"
        onChange={handleFile}
        className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-[#1c1d26] file:text-slate-200 file:font-semibold hover:file:bg-[#222431] file:cursor-pointer cursor-pointer"
      />
      {status && (
        <p className={`text-[11px] ${status.type === 'ok' ? 'text-teal-400' : 'text-rose-400'}`}>{status.message}</p>
      )}
      <p className="text-[10px] text-slate-500">
        Format Excel/CSV harus mengandung kolom header <code className="text-indigo-400">Site ID</code> di baris judul tabel.
        Hanya baris bertipe pengiriman (bukan ambil sendiri di toko) yang diproses.
      </p>
    </div>
  );
}
