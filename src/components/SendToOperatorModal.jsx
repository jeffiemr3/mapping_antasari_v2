import { useState } from 'react';
import QRCode from 'qrcode';
import { X, Send, Copy, Check, MessageCircle, Loader2, AlertTriangle, PackageCheck } from 'lucide-react';
import { buildManifestSnapshot, sendManifestSnapshot } from '../utils/pickerSync';
import { isFirebaseConfigured } from '../lib/firebase';

function pickerUrl(code) {
  return `${window.location.origin}/#/picker/${code}`;
}

export default function SendToOperatorModal({ onClose, drivers, assignments, ordersMap, selectedDate, warehouseLocations }) {
  const [status, setStatus] = useState('idle'); // idle | sending | done | error
  const [errorMsg, setErrorMsg] = useState('');
  const [code, setCode] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [copied, setCopied] = useState(false);

  const totalStopsToSend = drivers.reduce((sum, _v, idx) => sum + (assignments[idx]?.length ? 1 : 0), 0);

  async function handleSend() {
    setStatus('sending');
    setErrorMsg('');
    try {
      const payload = buildManifestSnapshot({ drivers, assignments, ordersMap, selectedDate, warehouseLocations });
      if (payload.vehicles.length === 0) {
        throw new Error('Belum ada nota yang teralokasi ke armada manapun. Jalankan Auto Mapping atau alokasikan manual dulu.');
      }
      const newCode = await sendManifestSnapshot(payload);
      const url = pickerUrl(newCode);
      const qr = await QRCode.toDataURL(url, { width: 260, margin: 1 });
      setCode(newCode);
      setQrDataUrl(qr);
      setStatus('done');
    } catch (err) {
      setErrorMsg(err.message || 'Gagal mengirim manifest.');
      setStatus('error');
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(pickerUrl(code)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const waText = code
    ? `Manifest pengambilan barang (${selectedDate}) sudah siap. Buka link berikut di HP untuk lihat daftar barang per armada:\n${pickerUrl(code)}`
    : '';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 no-print">
      <div className="bg-white dark:bg-[#111218] border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Send className="w-4 h-4 text-indigo-500" />
            Kirim ke Operator Gudang
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isFirebaseConfigured && (
          <div className="rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 p-3 flex gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11.5px] text-amber-800 dark:text-amber-300 leading-relaxed">
              Sinkronisasi belum di-setup di aplikasi ini (butuh konfigurasi Firebase sekali saja). Lihat{' '}
              <code className="font-mono">PANDUAN_OPERATOR_GUDANG.md</code> di repo untuk langkah-langkahnya.
            </p>
          </div>
        )}

        {status === 'idle' || status === 'error' ? (
          <div className="space-y-3">
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Ini akan mengunci manifest saat ini ({totalStopsToSend} armada dengan muatan, tanggal{' '}
              <strong className="text-slate-700 dark:text-slate-200">{selectedDate}</strong>) jadi tautan yang bisa dibuka
              operator gudang lewat HP masing-masing untuk menyiapkan barang. Perubahan alokasi setelah ini{' '}
              <strong>tidak otomatis ikut terkirim</strong> &mdash; kirim ulang kalau ada perubahan.
            </p>
            {status === 'error' && (
              <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 rounded-lg p-2.5">
                {errorMsg}
              </p>
            )}
            <button
              onClick={handleSend}
              disabled={!isFirebaseConfigured}
              className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 text-white text-sm font-bold px-4 py-3 rounded-xl flex items-center justify-center gap-2 shadow transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              Kirim Manifest Sekarang
            </button>
          </div>
        ) : status === 'sending' ? (
          <div className="py-8 flex flex-col items-center gap-2 text-slate-500 dark:text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
            <p className="text-xs">Mengirim manifest...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10 rounded-xl p-3">
              <PackageCheck className="w-5 h-5 shrink-0" />
              <p className="text-xs font-semibold">Manifest terkirim. Operator tinggal buka link/scan QR di HP-nya.</p>
            </div>

            <div className="flex justify-center">
              {qrDataUrl && <img src={qrDataUrl} alt="QR link operator" className="rounded-xl border border-slate-200 dark:border-white/10" />}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10.5px] uppercase tracking-wider text-slate-400 font-bold">Link Operator</label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={pickerUrl(code)}
                  onFocus={(e) => e.target.select()}
                  className="flex-1 text-[11px] font-mono border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#1c1d26] text-slate-700 dark:text-slate-200 rounded-lg p-2"
                />
                <button
                  onClick={handleCopy}
                  className="shrink-0 px-3 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1c1d26] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#222431] cursor-pointer"
                  title="Salin link"
                >
                  {copied ? <Check className="w-4 h-4 text-teal-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-500">
                Kode: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{code}</span>
              </p>
            </div>

            <a
              href={`https://wa.me/?text=${encodeURIComponent(waText)}`}
              target="_blank"
              rel="noreferrer"
              className="w-full bg-[#25D366] hover:brightness-95 text-white text-sm font-bold px-4 py-3 rounded-xl flex items-center justify-center gap-2 shadow transition-all active:scale-95 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              Bagikan lewat WhatsApp
            </a>

            <button
              onClick={() => {
                setStatus('idle');
                setCode(null);
                setQrDataUrl(null);
              }}
              className="w-full text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white py-1.5 cursor-pointer"
            >
              Kirim ulang (buat tautan baru)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
