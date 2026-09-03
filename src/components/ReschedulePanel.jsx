import { useState } from 'react';
import { CalendarClock, CheckCircle2 } from 'lucide-react';
import { DEFAULT_WAREHOUSE } from '../data/constants';

function ddmmyyyyToInputValue(ddmmyyyy) {
  const [dd, mm, yyyy] = (ddmmyyyy || '').split('-');
  if (!dd || !mm || !yyyy) return '';
  return `${yyyy}-${mm}-${dd}`;
}
function inputValueToDdmmyyyy(value) {
  const [yyyy, mm, dd] = (value || '').split('-');
  if (!dd || !mm || !yyyy) return '';
  return `${dd}-${mm}-${yyyy}`;
}

export default function ReschedulePanel({ rawLines, onRawLinesChange, ordersMap }) {
  const [open, setOpen] = useState(false);
  const [npno, setNpno] = useState('');
  const [newDate, setNewDate] = useState('');
  const [customer, setCustomer] = useState('');
  const [address, setAddress] = useState('');
  const [success, setSuccess] = useState(false);

  function submit() {
    if (!npno.trim() || !newDate) return;
    const exists = rawLines.some((l) => l.NPno === npno.trim());

    if (exists) {
      onRawLinesChange(
        rawLines.map((l) => (l.NPno === npno.trim() ? { ...l, PromisedDate: newDate } : l))
      );
    } else {
      const newLine = {
        SiteName: DEFAULT_WAREHOUSE.name,
        NPno: npno.trim(),
        OrderDate: newDate,
        PromisedDate: newDate,
        Customer: customer || 'Pelanggan (reschedule manual)',
        Address: address || '',
        Address2: '',
        Phone: '',
        Lat: 0,
        Lng: 0,
        ItemNo: '',
        ItemName: 'Item reschedule manual (belum ada detail barang)',
        QtyOutstanding: 1,
        UOM: 'UNIT',
        Comment: `Penjadwalan ulang manual ke ${newDate}`,
        NPType: 'Delivery Gudang Store (Type 1)',
      };
      onRawLinesChange([newLine, ...rawLines]);
    }
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2500);
    setNpno('');
    setNewDate('');
    setCustomer('');
    setAddress('');
  }

  const npnoExists = npno.trim() && ordersMap[npno.trim()];

  return (
    <div className="no-print">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
      >
        <CalendarClock className="w-4 h-4 text-amber-400" />
        Ubah Tanggal Pengiriman
      </button>

      {open && (
        <div className="mt-3 bg-[#151720] border border-white/5 rounded-2xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">NPno</label>
              <input
                value={npno}
                onChange={(e) => setNpno(e.target.value)}
                placeholder="MS7000..."
                className="w-full text-xs font-mono border border-white/10 bg-[#1c1d26] text-white rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                Tanggal Tujuan
              </label>
              <input
                type="date"
                value={ddmmyyyyToInputValue(newDate)}
                onChange={(e) => setNewDate(inputValueToDdmmyyyy(e.target.value))}
                className="w-full text-xs font-mono border border-white/10 bg-[#1c1d26] text-white rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {npno.trim() && !npnoExists && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                  Nama Pelanggan (baru)
                </label>
                <input
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  className="w-full text-xs border border-white/10 bg-[#1c1d26] text-white rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                  Alamat Pengiriman
                </label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full text-xs border border-white/10 bg-[#1c1d26] text-white rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          )}

          <p className="text-[10px] text-slate-500">
            {npno.trim()
              ? npnoExists
                ? 'NPno ditemukan — semua baris item nota ini akan dipindah ke tanggal tujuan.'
                : 'NPno belum ada di data — akan dibuat satu entri baru (item & berat belum diketahui, silakan lengkapi manual nanti).'
              : 'Masukkan NPno nota yang mau dipindah tanggal pengirimannya, atau NPno baru untuk entri manual.'}
          </p>

          <button
            onClick={submit}
            disabled={!npno.trim() || !newDate}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-[#1c1d26] disabled:text-slate-600 text-slate-950 font-bold text-xs py-2.5 rounded-xl cursor-pointer disabled:cursor-not-allowed"
          >
            Simpan Perubahan Tanggal
          </button>

          {success && (
            <p className="text-[11px] text-teal-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Berhasil disimpan.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
