# Panduan: Tampilan Operator Gudang (Kirim ke Operator)

Fitur ini menambahkan tombol **"Kirim ke Operator"** di bagian Manifest. Begini alurnya:

1. Dispatcher selesai atur alokasi armada seperti biasa di `mappingantasari.vercel.app`.
2. Klik **Kirim ke Operator** → manifest saat ini (per armada, per stop, per barang) dikunci jadi satu snapshot dan dikirim ke database.
3. Muncul **link + kode QR** untuk halaman `.../#/picker/KODE` — bagikan ke operator gudang lewat WhatsApp (ada tombol siap pakai) atau tinggal di-scan kalau operator satu ruangan.
4. Operator buka link itu di HP-nya sendiri (jaringan apa saja, tidak perlu satu WiFi) → tampilan mobile: daftar barang per armada, diurutkan per lokasi rak (kalau data lokasi gudang sudah diimport), dengan checklist yang bisa dicentang sambil jalan ambil barang.
5. Ini **satu arah / snapshot** — kalau dispatcher ubah alokasi setelahnya, klik "Kirim ke Operator" lagi untuk membuat link baru (link lama tetap berfungsi tapi datanya jadi versi lama).

Datanya lewat internet (Firebase Realtime Database, gratis untuk skala ini), jadi operator tidak perlu satu jaringan WiFi kantor — tinggal buka link seperti buka website biasa.

## Status project Firebase kalian

Project **akurasi-mitra10** sudah dibuat dan sudah pakai **Realtime Database**
(`https://akurasi-mitra10-default-rtdb.firebaseio.com`). Kode aplikasi ini
sudah disesuaikan untuk itu — tinggal 2 langkah lagi: **atur Security Rules**
(wajib) dan **isi environment variable di Vercel** (wajib untuk versi online).

## 1. Atur Realtime Database Security Rules (WAJIB, sekali saja)

Tanpa ini, siapa pun/bot yang tahu nama project Firebase bisa membaca ATAU
menulis data manifest kalian secara bebas.

1. Buka [console.firebase.google.com](https://console.firebase.google.com) → pilih project **akurasi-mitra10**.
2. Menu kiri **Build → Realtime Database → tab Rules**.
3. Ganti isinya jadi persis ini, lalu klik **Publish**:

```json
{
  "rules": {
    "manifests": {
      "$code": {
        ".read": true,
        ".write": "!data.exists() && newData.child('appToken').val() === 'v1dzx2GU6dm2_Leyyi1NEL86LmhWSy1u'"
      }
    }
  }
}
```

Penjelasan singkat:
- **Baca (`.read: true`)** dibuka untuk siapa saja yang tahu link/kode manifest-nya (mirip kirim link Google Drive) — supaya operator tidak perlu login segala.
- **Tulis** hanya boleh kalau (a) kode itu belum pernah dipakai sebelumnya (`!data.exists()`, jadi manifest yang sudah terkirim tidak bisa ditimpa/diubah orang lain), DAN (b) menyertakan `appToken` yang sama persis dengan yang tertanam di aplikasi (`v1dzx2GU6dm2_Leyyi1NEL86LmhWSy1u` — nilai ini sudah saya isikan otomatis di file `.env.local` project kalian, dan itu juga yang perlu kalian isi di Environment Variables Vercel pada langkah 2). Ini mencegah bot yang asal coba-coba nulis ke Firebase publik.

> Kalau suatu saat mau ganti token rahasia ini (disarankan sebelum repo di-push ke GitHub **publik**), ganti nilainya di sini DAN di `VITE_APP_WRITE_TOKEN` (env lokal & Vercel) secara bersamaan — kalau beda, fitur kirim manifest akan gagal terus.

## 2. Isi Environment Variables

### Development lokal (`npm run dev`)
Sudah otomatis terisi di file **`.env.local`** yang saya sertakan di project ini — tidak perlu ngapa-ngapain, langsung `npm install && npm run dev` juga sudah tersambung ke Firebase kalian. File ini sengaja tidak ikut ke Git (ada di `.gitignore` lewat pola `*.local`) supaya key tidak nyasar ke riwayat commit publik.

### Production (Vercel)
Buka project di [vercel.com](https://vercel.com/dashboard) → **Settings → Environment Variables** → tambahkan (centang semua environment: Production, Preview, Development):

| Key | Value |
|---|---|
| `VITE_FIREBASE_API_KEY` | `AIzaSyBXdX71IPsv7AvMYTJUUnIvyb3PRPRUmx8` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `akurasi-mitra10.firebaseapp.com` |
| `VITE_FIREBASE_DATABASE_URL` | `https://akurasi-mitra10-default-rtdb.firebaseio.com` |
| `VITE_FIREBASE_PROJECT_ID` | `akurasi-mitra10` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `akurasi-mitra10.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `451811488658` |
| `VITE_FIREBASE_APP_ID` | `1:451811488658:web:68f1776af4fff3cc75074b` |
| `VITE_APP_WRITE_TOKEN` | `v1dzx2GU6dm2_Leyyi1NEL86LmhWSy1u` |

Setelah diisi semua, **Redeploy** project (Deployments → titik tiga pada deployment terakhir → Redeploy) supaya env baru terbaca — env variable baru TIDAK otomatis kepakai di deployment lama.

## 3. Import data lokasi gudang (opsional, tapi sangat disarankan)

Supaya manifest yang dilihat operator menunjukkan **rak/zona pengambilan** tiap barang, bukan cuma nama barang:

1. Di aplikasi dispatcher, klik ikon **gerigi (Pengaturan)**.
2. Bagian **Import Lokasi Gudang** → upload file export **Report Stock Warehouse By Location** langsung dari sistem toko (`.xlsx`, tidak perlu diedit dulu).
3. Selesai — sekarang setiap kali "Kirim ke Operator" dipakai, tiap barang otomatis dicocokkan ke lokasi rak berdasarkan Item No (kalau ketemu). Barang yang lokasinya tidak ketemu di file tetap muncul di daftar operator, ditandai "⚠️ Lokasi belum diketahui" supaya tidak hilang begitu saja dari checklist.
4. File ini disimpan di localStorage browser dispatcher saja (sama seperti data lain) — cukup import ulang kalau berpindah device/browser, atau setiap kali ada perubahan lokasi rak yang signifikan.

## 4. Cara pakai sehari-hari (ringkas)

1. Dispatcher: import nota → Auto Mapping → rapikan alokasi seperti biasa.
2. Klik **Kirim ke Operator** di bagian Manifest.
3. Bagikan link/QR yang muncul ke operator gudang (WhatsApp / scan langsung).
4. Operator buka link di HP → pilih armada (tab atas) → mode **Ringkasan** (checklist per kode barang, diurutkan lokasi rak) atau **Per Stop** (lihat per pelanggan/alamat kalau perlu cek detail nota/komentar SLA).
5. Kalau ada perubahan alokasi setelah link dikirim, klik **Kirim ke Operator** lagi untuk kirim versi terbaru (kode baru, link baru).

## Biaya & batasan

Realtime Database punya kuota gratis (Spark plan) yang untuk pemakaian 1 toko (puluhan manifest/hari, dibaca beberapa operator) jauh di bawah limit gratis (1GB penyimpanan, 10GB transfer/bulan). Tidak perlu kartu kredit untuk mulai.

RTDB tidak punya fitur auto-hapus data lama bawaan seperti Firestore TTL — manifest lama akan tetap tersimpan (tidak masalah untuk skala ini, cuma menumpuk pelan-pelan). Kalau nanti mau bersih-bersih berkala, paling gampang lewat tab **Data** di Firebase Console, hapus manual node `manifests/KODE` yang sudah lama tidak dipakai.
