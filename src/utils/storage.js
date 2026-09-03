// Semua data aplikasi ini tersimpan di localStorage browser (client-only,
// tidak ada backend/server). Prefix "m10_" dipakai konsisten supaya mudah
// dikenali di devtools, mengikuti konvensi yang ditemukan di bundle asli
// (mis. "m10_gemini_key").

export const STORAGE_KEYS = {
  GEMINI_KEY: 'm10_gemini_key',
  ORDERS: 'm10_orders',
  FLEET: 'm10_fleet',
  ALLOCATIONS: 'm10_allocations',
  WAREHOUSE: 'm10_warehouse',
};

export function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
