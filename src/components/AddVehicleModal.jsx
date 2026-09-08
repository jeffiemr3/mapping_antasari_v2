import { useEffect, useState } from 'react';
import { X, PlusCircle, Weight, Box, Ruler, Settings, Sparkles } from 'lucide-react';
import { VEHICLE_TYPE_PRESETS } from '../data/constants';
import { fleetRowKey, normalizePlate } from '../utils/allocation';

/** Cari baris armada existing dengan plat yang SAMA (setelah dinormalisasi). */
function findByPlate(fleetRows, plate) {
  const normalized = normalizePlate(plate);
  if (!normalized) return [];
  return fleetRows.filter((r) => normalizePlate(r.plate) === normalized);
}

/** Hitung nomor RIT berikutnya untuk nomor polisi yang sama (RIT 1, 2, 3, ...),
 * plat dibandingkan setelah dinormalisasi (tanpa spasi) supaya "BE8970AMF" dan
 * "BE 8970 AMF" dianggap plat yang sama. */
function nextRitNumber(fleetRows, plate) {
  return findByPlate(fleetRows, plate).length + 1;
}

/** Dari daftar armada existing dgn plat yg sama, tebak tipe armadanya (mis. "L300
 * RIT 2" -> "L300") supaya form otomatis pilih tipe yang sama, bukan minta user
 * pilih ulang manual (rawan salah pilih beda tipe utk 1 fisik truk yang sama). */
function guessTypeFromExisting(rows) {
  if (rows.length === 0) return null;
  const baseName = (rows[0].vehicle || '').replace(/\s*RIT\s*\d+\s*$/i, '').trim().toUpperCase();
  return Object.keys(VEHICLE_TYPE_PRESETS).find((t) => t.toUpperCase() === baseName) || null;
}

export default function AddVehicleModal({ fleetRows, onAddVehicle, onClose, onOpenAdvancedSettings }) {
  const [type, setType] = useState('L300');
  const [plate, setPlate] = useState('');
  const [driver, setDriver] = useState('');
  const [error, setError] = useState('');

  const existingWithSamePlate = findByPlate(fleetRows, plate);
  const isKnownPlate = existingWithSamePlate.length > 0;
  const upcomingRit = nextRitNumber(fleetRows, plate);

  // Begitu plat yang diketik cocok sama armada yang sudah ada, otomatis
  // samakan tipe & tawarkan nama supir yang sama (truk fisiknya kan sama) -
  // tinggal dikonfirmasi/diedit, tidak perlu isi ulang dari nol.
  useEffect(() => {
    if (existingWithSamePlate.length === 0) return;
    const guessedType = guessTypeFromExisting(existingWithSamePlate);
    if (guessedType) setType(guessedType);
    if (!driver.trim()) setDriver(existingWithSamePlate[0].driver);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingWithSamePlate.length]);

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
          {isKnownPlate && (
            <p className="text-[10.5px] text-teal-600 dark:text-teal-400 font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Plat ini sudah ada ({existingWithSamePlate.length} rit) &mdash; otomatis jadi <strong>RIT {upcomingRit}</strong>
            </p>
          )}
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
