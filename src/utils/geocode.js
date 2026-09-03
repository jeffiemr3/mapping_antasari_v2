// =============================================================================
// AI Address Geocoding (Google Gemini)
// =============================================================================
// Dipanggil langsung dari browser (tanpa backend) memakai API key yang
// dimasukkan & disimpan sendiri oleh pengguna di localStorage. Prompt di
// bawah ini diambil verbatim dari bundle asli, termasuk daftar patokan
// koordinat Bandar Lampung & sekitarnya.
//
// Perlu diingat: karena key dipanggil langsung dari browser, key tersebut
// akan terlihat di tab Network devtools siapa pun yang membuka aplikasi ini
// dari perangkat yang sama. Ini cukup aman untuk pemakaian personal/internal,
// tapi kalau nanti aplikasi ini dipakai banyak orang, sebaiknya panggilan ini
// dipindah ke backend supaya key tidak terekspos ke tiap klien.

import { STORAGE_KEYS } from './storage';

const SYSTEM_PROMPT = `Anda adalah sistem pelacak koordinat logistik berpengalaman untuk wilayah Lampung, Indonesia khususnya Bandar Lampung, Pesawaran, Lampung Selatan, dan Lampung Tengah.
Tugas Anda adalah menerima alamat dan nama customer yang tidak memiliki koordinat (Latitude 0, Longitude 0), lalu melakukan pencarian lokasi/landmark terkenal berdasarkan informasi jalan atau patokan di alamat tersebut.
Kembalikan tanggapan dalam format JSON murni dengan struktur berikut:
{
  "success": true / false,
  "lat": number,
  "lng": number,
  "landmarkFound": "nama landmark/jalan utama yang ditemukan sebagai acuan",
  "explanation": "Penjelasan singkat dalam Bahasa Indonesia mengenai rute atau mengapa koordinat ini dipilih"
}

Patokan koordinat penting di Bandar Lampung:
- Mitra10 Antasari (Gudang): -5.399817, 105.285674
- Sukarame: -5.385, 105.295
- Kedaton: -5.378, 105.255
- Rajabasa: -5.367, 105.243
- Pahoman: -5.426, 105.271
- Kalianda (Lampung Selatan): -5.722, 105.612
- Gedong Tataan (Pesawaran): -5.359, 105.148
- Metro: -5.140, 105.311

Kembalikan HANYA objek JSON tersebut. Jangan berikan pembungkus markdown (seperti \`\`\`json).`;

/** Ambil Gemini API key dari localStorage, atau minta pengguna memasukkannya. */
export function getOrPromptApiKey() {
  try {
    let key = localStorage.getItem(STORAGE_KEYS.GEMINI_KEY);
    if (!key) {
      key = window.prompt(
        'Fitur ini menggunakan Google Gemini API langsung dari browser Anda (tidak ada server di aplikasi ini).\n\n' +
          'Masukkan Gemini API Key Anda (gratis di aistudio.google.com/apikey). Key hanya disimpan di browser Anda sendiri, tidak dikirim kemanapun selain ke Google.'
      );
      if (key && key.trim()) {
        localStorage.setItem(STORAGE_KEYS.GEMINI_KEY, key.trim());
        key = key.trim();
      } else {
        return null;
      }
    }
    return key;
  } catch {
    return null;
  }
}

/**
 * Minta AI menebak koordinat lat/lng terbaik untuk sebuah alamat pelanggan.
 * @param {{customer:string, address:string, address2?:string}} order
 * @param {string} apiKey
 * @returns {Promise<{success:boolean, lat:number, lng:number, landmarkFound:string, explanation:string}>}
 */
export async function geocodeAddress(order, apiKey) {
  const userPrompt = `Customer: ${order.customer}\nAlamat: ${order.address} ${order.address2 || ''}\n\nBerikan perkiraan koordinat Latitude dan Longitude terbaik berdasarkan patokan jalan atau kota tersebut.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        generationConfig: { responseMimeType: 'application/json' },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    if (response.status === 400 || response.status === 403) {
      localStorage.removeItem(STORAGE_KEYS.GEMINI_KEY);
    }
    throw new Error(`Gemini API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('AI tidak mengembalikan hasil yang valid.');

  const parsed = JSON.parse(text);
  if (!parsed.success) {
    throw new Error('AI tidak menemukan landmark yang cocok untuk alamat tersebut.');
  }
  return parsed;
}
