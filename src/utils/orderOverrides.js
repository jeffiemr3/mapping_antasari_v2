/**
 * Koreksi manual dispatcher (lewat popup peta): ubah nama pelanggan, nama
 * barang, atau qty yang akan dikirim untuk satu nota. Disimpan terpisah dari
 * rawLines (data mentah dari export penjualan) supaya data asli tetap utuh
 * dan bisa ditelusuri -- ini cuma lapisan "koreksi tampilan" yang ditimpa di
 * atasnya setiap kali ordersMap dibangun ulang.
 *
 * Bentuk `overrides`:
 * {
 *   [NPno]: {
 *     customer?: string,
 *     lines?: { [lineIndex]: { itemName?: string, qty?: number } }
 *   }
 * }
 */
export function applyOrderOverrides(ordersMap, overrides) {
  if (!overrides || Object.keys(overrides).length === 0) return ordersMap;

  const result = { ...ordersMap };
  Object.entries(overrides).forEach(([npno, override]) => {
    const order = result[npno];
    if (!order || !override) return;

    const next = { ...order };
    if (override.customer != null && override.customer.trim()) {
      next.customer = override.customer.trim();
    }

    if (override.lines) {
      next.lines = order.lines.map((line, idx) => {
        const lineOverride = override.lines[idx];
        if (!lineOverride) return line;
        const qty = lineOverride.qty != null ? Math.max(0, lineOverride.qty) : line.qty;
        const itemName =
          lineOverride.itemName != null && lineOverride.itemName.trim() ? lineOverride.itemName.trim() : line.itemName;
        if (qty === line.qty && itemName === line.itemName) return line;
        return {
          ...line,
          itemName,
          qty,
          weightKg: (line.unitWeightKg || 0) * qty,
          cubageM3: (line.unitCubageM3 || 0) * qty,
        };
      });
      next.totalWeightKg = next.lines.reduce((sum, l) => sum + (l.weightKg || 0), 0);
      next.totalCubageM3 = next.lines.reduce((sum, l) => sum + (l.cubageM3 || 0), 0);
    }

    result[npno] = next;
  });
  return result;
}
