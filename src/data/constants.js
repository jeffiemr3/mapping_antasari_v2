// Koordinat default gudang (Mitra10 Antasari, Bandar Lampung). Bisa diubah
// dari panel pengaturan tanpa mengedit kode.
export const DEFAULT_WAREHOUSE = {
  name: 'MITRA10 ANTASARI',
  lat: -5.399817,
  lng: 105.285674,
};

// Profil kapasitas standar per tipe armada (referensi dari data pabrikan/armada
// yang sudah ada). Dipakai supaya nambah armada baru tidak perlu isi ukuran manual.
export const VEHICLE_TYPE_PRESETS = {
  L300: { capWeightKg: 2500, capCubageM3: 1.2028, heightCm: 31, widthCm: 160, lengthCm: 242 },
  NKEL: { capWeightKg: 3500, capCubageM3: 8.959, heightCm: 170, widthCm: 170, lengthCm: 310 },
};

// Palet warna untuk membedakan rute tiap armada di peta.
export const ROUTE_COLORS = [
  '#F2A93B',
  '#1E7F76',
  '#3B82F6',
  '#EF4444',
  '#8B5CF6',
  '#10B981',
  '#EC4899',
  '#F59E0B',
];
