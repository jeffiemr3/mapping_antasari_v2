export function fmtKg(kg) {
  return kg.toLocaleString('id-ID', { maximumFractionDigits: 1 });
}

export function fmtM3(m3, decimals = 3) {
  return m3.toFixed(decimals);
}

/** "dd-mm-yyyy" -> timestamp (0 kalau format tidak valid). */
export function parseDDMMYYYY(str) {
  const parts = (str || '').split('-');
  if (parts.length !== 3) return 0;
  const [dd, mm, yyyy] = parts;
  return new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10)).getTime();
}

/** Date -> "dd-mm-yyyy" */
export function toDDMMYYYY(date) {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}
