# Muatan — Dispatch & Auto Mapping

Alat perencanaan rute pengiriman untuk **Mitra10 Antasari** (Bandar Lampung): import nota penjualan, kelompokkan alamat pelanggan jadi titik stop, alokasikan otomatis ke armada berdasarkan kapasitas berat & volume, lalu tampilkan & cetak rutenya.

> **Catatan asal-usul project ini.** Kode di repo ini adalah **rekonstruksi**, ditulis ulang dari nol berdasarkan bundle hasil build (`Muatan_Dispatch_Mapper_V_1_1_lebar_1600px.html`, ±720KB satu file) yang tersisa dari versi sebelumnya — source code aslinya sudah tidak ada. Logika inti (algoritma alokasi, format import, prompt AI) diambil **persis** dari hasil bongkar-pasang bundle tersebut, sehingga perilakunya seharusnya sangat mirip dengan versi lama. Bagian yang murni tampilan (susunan komponen, sebagian styling) adalah keputusan desain baru, bukan replikasi 1:1. Lihat bagian [Known gaps](#known-gaps--hal-yang-perlu-dicek) di bawah.

## Fitur

- **Import nota** dari Excel/CSV/JSON (kolom mengikuti format export sistem toko: `Site ID`, `NPno`, `Customer Name`, `Sell To Address`, `Item No`, `Outstanding Qty Base`, dst). Hanya baris bertipe pengiriman (`Delivery Gudang Store...` / `Cash & Delivery via Gudang Store`) yang diproses.
- **Agregasi otomatis per nota**: berat & volume dihitung dari katalog produk (`weight_gr` / `cubage_cm3` dikali qty). 276 SKU bawaan sudah termasuk (bisa ditambah/ditimpa lewat import katalog kustom di menu Pengaturan).
- **Deteksi nota "Amsen"**: nota berkomentar mengandung kata "amsen" otomatis dikecualikan dari auto-mapping, harus dialokasikan manual.
- **Auto Mapping**: algoritma clustering (union-find berdasarkan nama/no. HP pelanggan) + greedy nearest-neighbor multi-armada (Haversine) + 2-opt route refinement + pembuatan "Rit" (trip) tambahan otomatis kalau kapasitas dasar armada sudah penuh. Detail lengkap ada di `src/utils/allocation.js`.
- **AI Geocoding**: untuk nota tanpa koordinat, minta Google Gemini menebak lat/lng berdasarkan alamat & patokan landmark Bandar Lampung. Butuh API key Gemini sendiri (gratis di [aistudio.google.com/apikey](https://aistudio.google.com/apikey)), disimpan di browser saja.
- **Peta interaktif** (Leaflet) menampilkan rute tiap armada dengan warna berbeda, bisa fokus ke satu armada.
- **Alokasi manual** & pemindahan stop antar-armada.
- **Reschedule**: pindahkan tanggal pengiriman nota yang sudah ada, atau catat entri reschedule baru.
- **Cetak rute** per armada (mode cetak menyembunyikan elemen non-esensial).
- **Prioritas Rit 1** (SLA waktu): nota dengan komentar mengandung "rit 1", "sebelum jam", "maximal jam", "max jam", atau "maks" otomatis (1) diusahakan masuk ke armada yang jalan RIT 1 lebih dulu daripada rit lainnya, dan (2) dijadikan stop paling awal dalam rute rit tersebut — meskipun secara geografis bukan yang terdekat. Ditandai badge merah "⏰ PRIORITAS RIT 1" di panel Belum Teralokasi maupun di Manifest (layar & cetak).
- **Master Tambahan** (cadangan berat/box berdasarkan ukuran): kalau kode barang di sebuah nota tidak ditemukan di Master Item, aplikasi coba baca ukuran dari nama barangnya (mis. "...70X70CM...") dan pakai berat/box dari tabel referensi ini (bisa diedit, upload/download Excel sendiri). Kubikasi tetap tidak diketahui lewat jalur ini karena tabelnya cuma punya data berat.
- **Nota tergabung otomatis** (satu pelanggan, satu drop): kalau ada beberapa nota (NPno berbeda) dengan nama pelanggan ATAU nomor HP yang sama, manifest akan menampilkannya sebagai **satu baris/stop** (bukan dipisah per nota) — ditandai badge "📦 N NOTA - 1 DROP". Memindahkan atau mengeluarkan (reschedule) salah satu otomatis memindahkan/mengeluarkan semuanya sekaligus, supaya tidak ada bagian yang tertinggal terkirim terpisah.
- **Pesanan 1 pelanggan melebihi kapasitas satu mobil**: ditangani 2 cara sekaligus —
  1. **Otomatis (antar-nota)**: kalau total gabungan semua nota 1 pelanggan melebihi kapasitas armada terbesar, sistem otomatis membagi nota-notanya ke beberapa mobil berbeda (tiap nota tetap utuh, tidak dipotong) alih-alih macet di "Belum Teralokasi".
  2. **Manual (dalam 1 nota)**: kalau SATU nota sendirian sudah melebihi kapasitas mobil manapun (kasus yang tidak bisa dibagi otomatis), nota itu ditandai "⚠️ Melebihi kapasitas mobil manapun" di panel Belum Teralokasi, dengan tombol **"Pecah Nota"** — bagi qty per item jadi 2-6 bagian (default rata, bisa diedit manual), jadi beberapa nota baru (`NPno-A`, `NPno-B`, ...) yang masing-masing bisa dialokasikan ke mobil berbeda.
- **100% client-side** — tidak ada backend. Semua data tersimpan di `localStorage` browser.

## Menjalankan secara lokal

```bash
npm install
npm run dev       # dev server, http://localhost:5173
npm run build     # build produksi ke folder dist/
npm run preview   # preview hasil build
```

Node.js 20+ direkomendasikan.

## Struktur project

```
src/
  components/     Komponen UI (Header, ImportPanel, ControlPanel, VehicleCard, MapView, dst.)
  hooks/          useLocalStorage, useOrders (agregasi + filter tanggal)
  utils/
    allocation.js   Algoritma clustering + auto-allocate + 2-opt (inti aplikasi)
    excelImport.js  Parser Excel/CSV/JSON untuk nota, armada, dan katalog
    geocode.js      Pemanggilan Gemini API untuk AI geocoding
    storage.js      Konstanta key localStorage + helper get/set
    format.js       Helper format angka & tanggal
  data/
    fleetSeed.json      Data armada default (diekstrak dari bundle asli)
    productCatalog.json Katalog 276 SKU default (diekstrak dari bundle asli)
    constants.js        Koordinat gudang default, palet warna rute
  App.jsx         Perakitan seluruh state & komponen
```

## ⚠️ Catatan penting sebelum push ke GitHub publik

`src/data/fleetSeed.json` berisi **nama supir asli & nomor polisi asli** (KHOIRI, HAPIPI, FEBRI, dst.), dan `productCatalog.json` berisi data SKU internal toko. Ini data operasional nyata yang ikut ter-bundle di file HTML lama, dan saya bawa apa adanya ke sini supaya aplikasinya tetap berfungsi persis seperti sebelumnya secara default.

Sebelum repo ini dipush ke GitHub sebagai **repo publik**, pertimbangkan salah satu dari:
1. Jadikan repo **private** di GitHub (paling simpel), atau
2. Ganti isi `fleetSeed.json` jadi data contoh/dummy, dan biarkan data asli diimport lewat menu Pengaturan saat aplikasi dipakai (tidak ikut ter-commit ke git).

## Riwayat revisi tampilan

Versi pertama repo ini (commit awal) direkonstruksi murni dari membaca kode JS terminifikasi — hasilnya salah tema (dipukul rata gelap, padahal aslinya terang dengan toggle opsional) dan melewatkan beberapa bagian (dashboard statistik, grid kartu armada, tabel manifest detail per-armada dengan logika LIFO "Muat ke-N"). Revisi berikutnya dibuat setelah me-render file HTML asli secara visual (screenshot) dan membandingkan langsung, sehingga jauh lebih akurat: tema terang default + toggle mode gelap, layout horizontal, dashboard 5-statistik, grid kartu armada, tabel pengecualian "Amsen" terpisah, panel "Belum Teralokasi" dengan pencarian, dan section Manifest lengkap (tabel per-armada, urutan muat LIFO, pindah armada per-baris, tanda tangan cetak).

## Known gaps / hal yang perlu dicek

Karena direkonstruksi tanpa source asli, beberapa detail berikut adalah **penyederhanaan atau asumsi saya** — cek ulang kalau ada perilaku yang terasa beda dari versi sebelumnya:

- **Kalender & date-picker**: versi asli punya kalender kustom dengan penanda tanggal yang punya PDD (Promised Delivery Date). Di sini disederhanakan jadi `<input type="date">` bawaan browser.
- **Rute cluster 2-opt**: fungsi `optimize2Opt` di `allocation.js` adalah rekonstruksi logic 2-opt yang saya baca dari kode terminifikasi — teruji berjalan & masuk akal, tapi belum dibandingkan langsung dengan output versi lama.
- **Ada satu potongan kode di bundle asli** berupa pengecualian manual hardcoded untuk tanggal spesifik "16-07-2026" dengan daftar NPno tertentu per driver — ini kelihatannya sisa debug/koreksi manual dari pemakaian nyata, BUKAN fitur umum, jadi sengaja **tidak** direplikasi di sini.
- Styling & layout adalah interpretasi ulang (tema gelap, warna, font sama seperti asli — IBM Plex + Space Grotesk, aksen amber/teal/indigo) — bukan replikasi piksel-demi-piksel.

## Rencana lanjutan yang mungkin berguna

- Pindahkan panggilan Gemini API ke backend kecil kalau nanti dipakai multi-user (supaya API key tidak terekspos di browser tiap orang).
- Tambah backend + database kalau butuh sinkron multi-device / multi-user (saat ini sengaja tetap client-only sesuai permintaan).
- Custom date-picker dengan penanda PDD seperti versi asli.
