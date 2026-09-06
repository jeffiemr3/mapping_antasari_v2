import { useState } from 'react';
import { X, PlusCircle, Weight, Box, Ruler, Settings } from 'lucide-react';
import { VEHICLE_TYPE_PRESETS } from '../data/constants';
import { fleetRowKey } from '../utils/allocation';

/** Hitung nomor RIT berikutnya untuk nomor polisi yang sama (RIT 1, 2, 3, ...). */
function nextRitNumber(fleetRows, plate) {
  const normalized = plate.trim().toUpperCase();
  const count = fleetRows.filter((r) => r.plate.trim().toUpperCase() === normalized).length;
  return count + 1;
}

export default function AddVehicleModal({ fleetRows, onAddVehicle, onClose, onOpenAdvancedSettings }) {
  const [type, setType] = useState('L300');
  const [plate, setPlate] = useState('');
  const [driver, setDriver] = useState('');
  const [error, setError] = useState('');

  const preset = VEHICLE_TYPE_PRESETS[type];

  function handleSubmit() {
    if (!plate.trim() || !driver.trim()) {
      setError('Nomor plat dan nama supir wajib diisi.');
      return;
    }
    const ritNumber = nextRitNumber(fleetRows, plate);
    const newRow = {
      driver: driver.trim().toUpperCase(),
      vehicle: `${type} RIT ${ritNumber}`,
      plate: plate.trim().toUpperCase(),
      ...preset,
    };
    if (fleetRows.some((r) => fleetRowKey(r) === fleetRowKey(newRow))) {
      setError('Armada dengan plat, tipe, dan RIT yang sama sudah ada.');
      return;
    }
    onAddVehicle(newRow);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 no-print">
      <div className="bg-white dark:bg-[#111218] border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-orange-500" />
            Tambah Armada
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10.5px] uppercase tracking-wider text-slate-400 font-bold">Tipe Armada</label>
          <div className="grid grid-cols-2 gap-2">
            {Object.keys(VEHICLE_TYPE_PRESETS).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`text-sm font-bold py-2.5 rounded-xl border cursor-pointer transition-colors ${
                  type === t
                    ? 'bg-orange-500 border-orange-500 text-white'
                    : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1c1d26]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#151720] rounded-xl p-2.5">
          <span className="flex items-center gap-1">
            <Weight className="w-3 h-3" /> {preset.capWeightKg.toLocaleString('id-ID')} kg
          </span>
          <span className="flex items-center gap-1">
            <Box className="w-3 h-3" /> {preset.capCubageM3.toFixed(3)} m&sup3;
          </span>
          <span className="flex items-center gap-1">
            <Ruler className="w-3 h-3" /> {preset.heightCm}x{preset.widthCm}x{preset.lengthCm} cm
          </span>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10.5px] uppercase tracking-wider text-slate-400 font-bold">Nomor Polisi</label>
          <input
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
            placeholder="BE 1234 XX"
            className="w-full text-sm font-mono font-bold uppercase border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1c1d26] text-slate-900 dark:text-white rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10.5px] uppercase tracking-wider text-slate-400 font-bold">Nama Supir</label>
          <input
            value={driver}
            onChange={(e) => setDriver(e.target.value)}
            placeholder="Nama supir"
            className="w-full text-sm font-semibold border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1c1d26] text-slate-900 dark:text-white rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>

        {error && <p className="text-[11px] text-rose-500">{error}</p>}

        <button
          onClick={handleSubmit}
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-xs py-2.5 rounded-xl cursor-pointer"
        >
          Tambah Armada
        </button>

        <button
          onClick={onOpenAdvancedSettings}
          className="w-full flex items-center justify-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
        >
          <Settings className="w-3 h-3" />
          Pengaturan lanjutan (API key, import massal, hapus armada)
        </button>
      </div>
    </div>
  );
}
