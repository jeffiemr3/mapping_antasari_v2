import { useEffect, useState } from 'react';
import { loadJSON, saveJSON } from '../utils/storage';

/**
 * State React yang otomatis tersinkron ke localStorage.
 * Dipakai untuk semua data utama aplikasi (orders, fleet, allocations, dst)
 * karena aplikasi ini sengaja tetap client-only / tanpa backend.
 */
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => loadJSON(key, initialValue));

  useEffect(() => {
    saveJSON(key, value);
  }, [key, value]);

  return [value, setValue];
}
