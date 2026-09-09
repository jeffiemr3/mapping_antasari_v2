import { useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, ChevronUp, ChevronDown, Search } from 'lucide-react';
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
  const [open, setOpen] = useState(true);
  const [npno, setNpno] = useState('');
  const [newDate, setNewDate] = useState('');
  const [customer, setCustomer] = useState('');
  const [address, setAddress] = useState('');
  const [success, setSuccess] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Saran nota yang cocok sambil diketik - dicari dari NPno ATAU nama
  // pelanggan, supaya gampang nemu nota yang benar tanpa harus hafal/ketik
  // nomor lengkapnya.
  const suggestions = useMemo(() => {
    const query = npno.trim().toLowerCase();
    if (!query) return [];
    return Object.values(ordersMap)
      .filter((o) => o.NPno.toLowerCase().includes(query) || o.customer.toLowerCase().includes(query))
      .slice(0, 8);
  }, [npno, ordersMap]);

  function pickSuggestion(order) {
    setNpno(order.NPno);
    setShowSuggestions(false);
  }

  function submit() {
    if (!npno.trim() || !newDate) return;
    const exists = rawLines.some((l) => l.NPno === npno.trim());

    if (exists) {
      onRawLinesChange(rawLines.map((l) => (l.NPno === npno.trim() ? { ...l, PromisedDate: newDate } : l)));
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
    <div className="no-print bg-white dark:bg-[#111218] border border-slate-200 dark:border-white/5 rounded-2xl p-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-xs font-bold text-orange-600 dark:text-amber-400 hover:opacity-80 cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <CalendarClock className="w-4 h-4" />
          ATUR JADWAL NOTA / LATE SHIPMENT
        </span>
        <span className="flex items-center gap-1 text-slate-400 font-semibold normal-case">
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {open ? 'Sembunyikan' : 'Tampilkan'}
        </span>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1 relative">
              <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Nomor Nota (NPno)</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  value={npno}
                  onChange={(e) => {
                    setNpno(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  placeholder="Ketik NPno atau nama pelanggan…"
                  className="w-full text-xs font-mono border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1c1d26] text-slate-900 dark:text-white rounded-xl p-2.5 pl-8 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-20 top-full mt-1 w-full bg-white dark:bg-[#1c1d26] border border-slate-200 dark:border-white/10 rounded-xl shadow-lg overflow-hidden max-h-56 overflow-y-auto">
                  {suggestions.map((o) => (
                    <button
                      key={o.NPno}
                      type="button"
                      onMouseDown={() => pickSuggestion(o)}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-[#222431] cursor-pointer border-b border-slate-100 dark:border-white/5 last:border-0"
                    >
                      <p className="text-[11px] font-mono font-bold text-slate-900 dark:text-white">{o.NPno}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {o.customer} &middot; Promised: {o.promisedDate || '-'}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Pilih Tanggal Tujuan</label>
              <input
                type="date"
                value={ddmmyyyyToInputValue(newDate)}
                onChange={(e) => setNewDate(inputValueToDdmmyyyy(e.target.value))}
                className="w-full text-xs font-mono border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1c1d26] text-slate-900 dark:text-white rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
          </div>

          {npno.trim() && !npnoExists && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Nama Pelanggan (baru)</label>
                <input
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  className="w-full text-xs border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1c1d26] text-slate-900 dark:text-white rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Alamat Pengiriman</label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full text-xs border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1c1d26] text-slate-900 dark:text-white rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
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
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold text-xs py-2.5 rounded-xl cursor-pointer disabled:cursor-not-allowed"
          >
            Simpan Perubahan Tanggal
          </button>

          {success && (
            <p className="text-[11px] text-teal-600 dark:text-teal-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Berhasil disimpan.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
