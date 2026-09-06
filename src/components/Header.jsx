import { useRef } from 'react';
import { Truck, Upload, PackagePlus, Ruler, Moon, Sun, MapPinned } from 'lucide-react';
import {
  parseOrdersExcel,
  parseOrdersCSV,
  parseOrdersJSON,
  mergeOrderLinesByPromisedDate,
  parseCustomCatalogExcel,
} from '../utils/excelImport';
import { parseWarehouseLocationExcel } from '../utils/warehouseLocations';

export default function Header({
  rawLines,
  onRawLinesChange,
  customCatalog,
  onCustomCatalogChange,
  theme,
  onToggleTheme,
  onOpenSizeWeight,
  warehouseLocations,
  onWarehouseLocationsChange,
}) {
  const ordersInputRef = useRef(null);
  const catalogInputRef = useRef(null);
  const locationInputRef = useRef(null);

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

  async function handleLocationFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const index = parseWarehouseLocationExcel(await file.arrayBuffer());
      if (!index) {
        alert("Format Excel tidak cocok. Header 'Storage Location Id' / 'Item No' tidak ditemukan.");
      } else {
        onWarehouseLocationsChange(index);
        alert(`Berhasil memuat lokasi gudang untuk ${Object.keys(index).length} kode barang.`);
      }
    } catch (err) {
      alert('Gagal membaca lokasi gudang: ' + err.message);
    } finally {
      e.target.value = '';
    }
  }

  return (
    <header className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-slate-200 dark:border-white/5 bg-white dark:bg-[#111218]">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0">
          <Truck className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="font-display font-bold text-base leading-none truncate">
            <span className="text-slate-900 dark:text-white">Muatan</span>{' '}
            <span className="text-orange-500">Dispatch Mapper</span>
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-none mt-1 truncate">
            Auto mapping logistik pengiriman &middot; Mitra10 Antasari Bandar Lampung
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible pb-1 sm:pb-0">
        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mr-1 hidden lg:inline shrink-0">
          Upload Data:
        </span>

        <input ref={ordersInputRef} type="file" accept=".xlsx,.xls,.csv,.json" onChange={handleOrdersFile} className="hidden" />
        <button
          onClick={() => ordersInputRef.current?.click()}
          className="shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1c1d26] cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
          <span className="hidden sm:inline">Penjualan</span>
        </button>

        <input ref={catalogInputRef} type="file" accept=".xlsx,.xls" onChange={handleCatalogFile} className="hidden" />
        <button
          onClick={() => catalogInputRef.current?.click()}
          className="shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1c1d26] cursor-pointer"
        >
          <PackagePlus className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
          <span className="hidden sm:inline">Master Item</span>
        </button>

        <button
          onClick={onOpenSizeWeight}
          title="Cadangan berat/box berdasarkan ukuran, dipakai kalau kode barang tidak ada di Master Item"
          className="shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1c1d26] cursor-pointer"
        >
          <Ruler className="w-3.5 h-3.5 text-orange-500 shrink-0" />
          <span className="hidden sm:inline">Master Tambahan</span>
        </button>

        <input ref={locationInputRef} type="file" accept=".xlsx,.xls" onChange={handleLocationFile} className="hidden" />
        <button
          onClick={() => locationInputRef.current?.click()}
          title="Import Report Stock Warehouse By Location, supaya tampilan operator gudang tahu rak pengambilan tiap barang"
          className="shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1c1d26] cursor-pointer"
        >
          <MapPinned className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
          <span className="hidden sm:inline">Lokasi Gudang</span>
          {warehouseLocations && (
            <span className="text-[9px] font-mono text-slate-400">({Object.keys(warehouseLocations).length})</span>
          )}
        </button>

        <button
          onClick={onToggleTheme}
          className="shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1c1d26] cursor-pointer"
        >
          {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" /> : <Moon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
          <span className="hidden sm:inline">{theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}</span>
        </button>
      </div>
    </header>
  );
}
