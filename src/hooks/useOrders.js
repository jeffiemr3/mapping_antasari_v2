import { useMemo } from 'react';
import { aggregateOrderLines } from '../utils/excelImport';
import { parseDDMMYYYY } from '../utils/format';
import defaultCatalog from '../data/productCatalog.json';

/**
 * Gabungkan baris nota mentah + katalog produk (default + kustom) menjadi
 * peta order teragregasi per NPno, dan daftar NPno yang relevan untuk
 * tanggal yang dipilih (mode kumulatif atau tanggal persis).
 */
export function useOrders({ rawLines, customCatalog, selectedDate, cumulativeMode }) {
  const catalog = useMemo(() => ({ ...defaultCatalog, ...customCatalog }), [customCatalog]);

  const ordersMap = useMemo(() => aggregateOrderLines(rawLines, catalog), [rawLines, catalog]);

  const orderIdsForDate = useMemo(() => {
    if (!selectedDate) return [];
    const target = parseDDMMYYYY(selectedDate);
    return Object.keys(ordersMap).filter((id) => {
      const order = ordersMap[id];
      if (!order.promisedDate) return false;
      const t = parseDDMMYYYY(order.promisedDate);
      return cumulativeMode ? t <= target : order.promisedDate === selectedDate;
    });
  }, [ordersMap, selectedDate, cumulativeMode]);

  const promisedDatesWithData = useMemo(() => {
    const set = new Set();
    Object.values(ordersMap).forEach((o) => {
      if (o.promisedDate) set.add(o.promisedDate);
    });
    return set;
  }, [ordersMap]);

  return { catalog, ordersMap, orderIdsForDate, promisedDatesWithData };
}
