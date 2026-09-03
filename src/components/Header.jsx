import { Truck, Settings } from 'lucide-react';

export default function Header({ onOpenSettings }) {
  return (
    <header className="no-print flex items-center justify-between px-5 py-3 border-b border-white/5 bg-[#111218]">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
          <Truck className="w-4.5 h-4.5 text-slate-950" />
        </div>
        <div>
          <h1 className="font-display font-bold text-sm text-white leading-none">Muatan</h1>
          <p className="text-[10px] text-slate-500 leading-none mt-0.5">Dispatch &amp; Auto Mapping</p>
        </div>
      </div>
      <button
        onClick={onOpenSettings}
        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#1c1d26] transition-colors cursor-pointer"
        title="Pengaturan"
      >
        <Settings className="w-4.5 h-4.5" />
      </button>
    </header>
  );
}
