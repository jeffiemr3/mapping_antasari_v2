# Panduan: Tampilan Operator Gudang (Kirim ke Operator)

Fitur ini menambahkan tombol **"Kirim ke Operator"** di bagian Manifest. Begini alurnya:

1. Dispatcher selesai atur alokasi armada seperti biasa di `mappingantasari.vercel.app`.
2. Klik **Kirim ke Operator** → manifest saat ini (per armada, per stop, per barang) dikunci jadi satu snapshot dan dikirim ke database.
3. Muncul **link + kode QR** untuk halaman `.../#/picker/KODE` — bagikan ke operator gudang lewat WhatsApp (ada tombol siap pakai) atau tinggal di-scan kalau operator satu ruangan.
4. Operator buka link itu di HP-nya sendiri (jaringan apa saja, tidak perlu satu WiFi) → tampilan mobile: daftar barang per armada, diurutkan per lokasi rak (kalau data lokasi gudang sudah diimport), dengan checklist yang bisa dicentang sambil jalan ambil barang.
5. Ini **satu arah / snapshot** — kalau dispatcher ubah alokasi setelahnya, klik "Kirim ke Operator" lagi untuk membuat link baru (link lama tetap berfungsi tapi datanya jadi versi lama).

Tidak perlu satu jaringan WiFi kantor karena datanya lewat internet (database kecil gratis, bukan server sendiri). Karena aplikasinya sudah online di Vercel, operator tinggal buka link seperti buka website biasa.

## 1. Buat project Firebase (sekali saja, gratis)

Firestore dipakai sebagai "kotak surat" kecil tempat manifest disimpan sementara.

1. Buka [console.firebase.google.com](https://console.firebase.google.com), login pakai akun Google (bebas akun mana saja).
2. **Add project** → beri nama bebas, mis. `mitra10-antasari-mapping`. Google Analytics boleh dimatikan (tidak perlu).
3. Di menu kiri, buka **Build → Firestore Database** → **Create database**.
   - Pilih **Production mode** (bukan Test mode — nanti rules-nya kita atur manual di langkah 3).
   - Pilih lokasi server terdekat, mis. `asia-southeast2 (Jakarta)`.
4. Di menu kiri atas, klik ikon gerigi **Project settings**. Di tab **General**, scroll ke bawah ke **Your apps** → klik ikon `</>` (Web) → beri nickname bebas (mis. "picker") → **Register app**.
5. Akan muncul blok `firebaseConfig = { apiKey: "...", authDomain: "...", ... }` — **simpan nilai-nilai ini**, dipakai di langkah 2.

## 2. Isi Environment Variables

### Untuk development lokal (`npm run dev`)
Salin `.env.example` jadi `.env.local`, isi dengan nilai dari `firebaseConfig` langkah 1, plus `VITE_APP_WRITE_TOKEN` bebas (string rahasia apa saja, catat untuk langkah 3).

### Untuk production (Vercel)
Buka project di [vercel.com](https://vercel.com/dashboard) → **Settings → Environment Variables** → tambahkan satu-satu:

| Key | Value |
|---|---|
| `VITE_FIREBASE_API_KEY` | dari firebaseConfig |
| `VITE_FIREBASE_AUTH_DOMAIN` | dari firebaseConfig |
| `VITE_FIREBASE_PROJECT_ID` | dari firebaseConfig |
| `VITE_FIREBASE_STORAGE_BUCKET` | dari firebaseConfig |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | dari firebaseConfig |
| `VITE_FIREBASE_APP_ID` | dari firebaseConfig |
| `VITE_APP_WRITE_TOKEN` | string rahasia bebas (harus SAMA dengan yang ditulis di rule langkah 3) |

Centang semua environment (Production, Preview, Development), lalu **Redeploy** project (Deployments → titik tiga pada deployment terakhir → Redeploy) supaya env baru terbaca — env variable baru TIDAK otomatis kepakai di deployment lama.

## 3. Atur Firestore Security Rules

Ini yang menentukan siapa boleh baca/tulis data. Karena aplikasi ini tanpa login (operator tinggal buka link), pembacaan memang dibuat terbuka untuk siapa saja yang tahu kode/link-nya (mirip kirim link Google Drive) — tapi **penulisan** dibatasi pakai token rahasia supaya bot yang iseng scan Firestore publik tidak bisa menulis data sampah ke situ.

Di Firebase Console → **Firestore Database → Rules**, ganti isinya jadi:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /manifests/{code} {
      allow read: if true;
      allow create: if request.resource.data.appToken == "GANTI_DENGAN_TOKEN_RAHASIA_KALIAN";
      allow update, delete: if false;
    }
  }
}
```

Ganti `GANTI_DENGAN_TOKEN_RAHASIA_KALIAN` dengan **nilai yang sama persis** dengan `VITE_APP_WRITE_TOKEN` di langkah 2. Klik **Publish**.

> Kalau nanti mau tambah keamanan lebih (mis. dispatcher login dulu), bisa upgrade ke Firebase Authentication — di luar cakupan panduan ini, tanya lagi kalau butuh.

### (Opsional) Bersihkan data lama otomatis
Manifest lama tidak perlu disimpan selamanya. Di **Firestore Database → TTL (Time-to-live) policies**, buat policy pada field `sentAt` collection `manifests` (mis. hapus otomatis setelah 30 hari). Kalau di-skip, data lama tetap aman tersimpan, cuma menumpuk pelan-pelan (masih jauh dari batas gratis untuk pemakaian toko sehari-hari).

## 4. Import data lokasi gudang (opsional, tapi sangat disarankan)

Supaya manifest yang dilihat operator menunjukkan **rak/zona pengambilan** tiap barang, bukan cuma nama barang:

1. Di aplikasi dispatcher, klik ikon **gerigi (Pengaturan)**.
2. Bagian **Import Lokasi Gudang** → upload file export **Report Stock Warehouse By Location** langsung dari sistem toko (`.xlsx`, tidak perlu diedit dulu).
3. Selesai — sekarang setiap kali "Kirim ke Operator" dipakai, tiap barang otomatis dicocokkan ke lokasi rak berdasarkan Item No (kalau ketemu). Barang yang lokasinya tidak ketemu di file tetap muncul di daftar operator, ditandai "⚠️ Lokasi belum diketahui" supaya tidak hilang begitu saja dari checklist.
4. File ini disimpan di localStorage browser dispatcher saja (sama seperti data lain) — cukup import ulang kalau berpindah device/browser, atau setiap kali ada perubahan lokasi rak yang signifikan.

## 5. Cara pakai sehari-hari (ringkas)

1. Dispatcher: import nota → Auto Mapping → rapikan alokasi seperti biasa.
2. Klik **Kirim ke Operator** di bagian Manifest.
3. Bagikan link/QR yang muncul ke operator gudang (WhatsApp / scan langsung).
4. Operator buka link di HP → pilih armada (tab atas) → mode **Ringkasan** (checklist per kode barang, diurutkan lokasi rak) atau **Per Stop** (lihat per pelanggan/alamat kalau perlu cek detail nota/komentar SLA).
5. Kalau ada perubahan alokasi setelah link dikirim, klik **Kirim ke Operator** lagi untuk kirim versi terbaru (kode baru, link baru).

## Biaya

Firestore punya kuota gratis (Spark plan) yang untuk pemakaian 1 toko (puluhan manifest/hari, dibaca beberapa operator) jauh di bawah limit gratis. Tidak perlu kartu kredit untuk mulai. Kalau suatu saat berkembang jadi banyak toko/traffic tinggi, baru perlu cek [harga Firestore](https://firebase.google.com/pricing).
