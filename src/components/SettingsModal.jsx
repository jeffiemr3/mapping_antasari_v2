import { useRef, useState } from 'react';
import { X, KeyRound, Truck, PackagePlus } from 'lucide-react';
import { STORAGE_KEYS } from '../utils/storage';
import { parseFleetExcel, parseFleetDelimited, parseCustomCatalogExcel } from '../utils/excelImport';

export default function SettingsModal({ onClose, fleetRows, onFleetChange, customCatalog, onCustomCatalogChange }) {
  const [apiKey, setApiKey] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.GEMINI_KEY) || '';
    } catch {
      return '';
    }
  });
  const [fleetStatus, setFleetStatus] = useState(null);
  const [catalogStatus, setCatalogStatus] = useState(null);
  const fleetInputRef = useRef(null);
  const catalogInputRef = useRef(null);

  function saveApiKey() {
    try {
      if (apiKey.trim()) localStorage.setItem(STORAGE_KEYS.GEMINI_KEY, apiKey.trim());
      else localStorage.removeItem(STORAGE_KEYS.GEMINI_KEY);
    } catch {
      /* ignore */
    }
  }

  async function handleFleetFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      let rows;
      if (/\.xlsx$|\.xls$/i.test(file.name)) {
        rows = parseFleetExcel(await file.arrayBuffer());
      } else {
        rows = parseFleetDelimited(await file.text());
      }
      if (rows.length === 0) {
        setFleetStatus({ type: 'error', message: "Header 'Driver' tidak ditemukan di file." });
      } else {
        onFleetChange(rows);
        setFleetStatus({ type: 'ok', message: `Berhasil memuat ${rows.length} baris armada.` });
      }
    } catch (err) {
      setFleetStatus({ type: 'error', message: err.message });
    } finally {
      if (fleetInputRef.current) fleetInputRef.current.value = '';
    }
  }

  async function handleCatalogFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = parseCustomCatalogExcel(await file.arrayBuffer());
      if (!parsed) {
        setCatalogStatus({ type: 'error', message: "Header 'Item No' tidak ditemukan di file." });
      } else {
        onCustomCatalogChange({ ...customCatalog, ...parsed });
        setCatalogStatus({ type: 'ok', message: `Berhasil memuat ${Object.keys(parsed).length} item katalog.` });
      }
    } catch (err) {
      setCatalogStatus({ type: 'error', message: err.message });
    } finally {
      if (catalogInputRef.current) catalogInputRef.current.value = '';
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 no-print">
      <div className="bg-[#111218] border border-white/10 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-5 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-white">Pengaturan</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-[10.5px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1">
            <KeyRound className="w-3.5 h-3.5 text-teal-500" />
            Gemini API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            onBlur={saveApiKey}
            placeholder="AIza..."
            className="w-full text-xs font-mono border border-white/10 bg-[#1c1d26] text-white rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          <p className="text-[10px] text-slate-500">
            Dipakai untuk fitur AI Geocode (menebak koordinat dari alamat). Gratis di{' '}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-indigo-400 hover:underline"
            >
              aistudio.google.com/apikey
            </a>
            . Key hanya disimpan di browser Anda sendiri, tidak dikirim ke server lain selain Google.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-[10.5px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1">
            <Truck className="w-3.5 h-3.5 text-teal-500" />
            Import Armada / Supir (Excel / CSV / TXT)
          </label>
          <input
            ref={fleetInputRef}
            type="file"
            accept=".xlsx,.xls,.csv,.txt"
            onChange={handleFleetFile}
            className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-[#1c1d26] file:text-slate-200 file:font-semibold hover:file:bg-[#222431] file:cursor-pointer cursor-pointer"
          />
          {fleetStatus && (
            <p className={`text-[11px] ${fleetStatus.type === 'ok' ? 'text-teal-400' : 'text-rose-400'}`}>
              {fleetStatus.message}
            </p>
          )}
          <p className="text-[10px] text-slate-500">
            Kolom: Driver, Vehicle, nomor polisi, Height, Width, Length (cm), Weight (gram), Cubage (cm&sup3;). Saat ini{' '}
            {fleetRows.length} baris armada tersimpan.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-[10.5px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1">
            <PackagePlus className="w-3.5 h-3.5 text-teal-500" />
            Import Katalog Produk Kustom (opsional)
          </label>
          <input
            ref={catalogInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleCatalogFile}
            className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-[#1c1d26] file:text-slate-200 file:font-semibold hover:file:bg-[#222431] file:cursor-pointer cursor-pointer"
          />
          {catalogStatus && (
            <p className={`text-[11px] ${catalogStatus.type === 'ok' ? 'text-teal-400' : 'text-rose-400'}`}>
              {catalogStatus.message}
            </p>
          )}
          <p className="text-[10px] text-slate-500">
            Menambah/menimpa katalog bawaan ({Object.keys(customCatalog).length} item kustom tersimpan). Kolom perlu berisi
            "Item No", "Item Name", dan kolom yang namanya mengandung "Weight" &amp; "Cubage".
          </p>
        </div>
      </div>
    </div>
  );
}
