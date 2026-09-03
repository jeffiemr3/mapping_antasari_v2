import { useRef } from 'react';
import { Truck, Upload, PackagePlus, Moon, Sun } from 'lucide-react';
import {
  parseOrdersExcel,
  parseOrdersCSV,
  parseOrdersJSON,
  mergeOrderLinesByPromisedDate,
  parseCustomCatalogExcel,
} from '../utils/excelImport';

export default function Header({ rawLines, onRawLinesChange, customCatalog, onCustomCatalogChange, theme, onToggleTheme }) {
  const ordersInputRef = useRef(null);
  const catalogInputRef = useRef(null);

  async function handleOrdersFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      let newLines;
      if (/\.xlsx$|\.xls$/i.test(file.name)) {
        newLines = parseOrdersExcel(await file.arrayBuffer());
      } else if (/\.json$/i.test(file.name)) {
        newLines = parseOrdersJSON(await file.text());
      } else {
        newLines = parseOrdersCSV(await file.text());
      }
      onRawLinesChange(mergeOrderLinesByPromisedDate(rawLines, newLines));
      alert(`Berhasil memuat ${newLines.length} baris penjualan dari ${file.name}.`);
    } catch (err) {
      alert('Gagal mengurai file: ' + err.message);
    } finally {
      e.target.value = '';
    }
  }

  async function handleCatalogFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = parseCustomCatalogExcel(await file.arrayBuffer());
      if (!parsed) {
        alert("Format Excel tidak cocok. Header 'Item No' tidak ditemukan.");
      } else {
        onCustomCatalogChange({ ...customCatalog, ...parsed });
        alert(`Berhasil memuat ${Object.keys(parsed).length} item master.`);
      }
    } catch (err) {
      alert('Gagal membaca master item: ' + err.message);
    } finally {
      e.target.value = '';
    }
  }

  return (
    <header className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3 border-b border-slate-200 dark:border-white/5 bg-white dark:bg-[#111218]">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0">
          <Truck className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-display font-bold text-base leading-none">
            <span className="text-slate-900 dark:text-white">Muatan</span>{' '}
            <span className="text-orange-500">Dispatch Mapper</span>
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-none mt-1">
            Auto mapping logistik pengiriman &middot; Mitra10 Antasari Bandar Lampung
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mr-1 hidden md:inline">
          Upload Data:
        </span>

        <input ref={ordersInputRef} type="file" accept=".xlsx,.xls,.csv,.json" onChange={handleOrdersFile} className="hidden" />
        <button
          onClick={() => ordersInputRef.current?.click()}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1c1d26] cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          Penjualan
        </button>

        <input ref={catalogInputRef} type="file" accept=".xlsx,.xls" onChange={handleCatalogFile} className="hidden" />
        <button
          onClick={() => catalogInputRef.current?.click()}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1c1d26] cursor-pointer"
        >
          <PackagePlus className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          Master Item
        </button>

        <button
          onClick={onToggleTheme}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1c1d26] cursor-pointer"
        >
          {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-500" />}
          {theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
        </button>
      </div>
    </header>
  );
}
