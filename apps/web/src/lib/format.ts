/** Formato numérico en español de España. */

const eur0 = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const eur2 = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct1 = new Intl.NumberFormat('es-ES', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });
const pct2 = new Intl.NumberFormat('es-ES', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 4 });

export function eur(v: number, decimals: 0 | 2 = 0): string {
  return (decimals === 2 ? eur2 : eur0).format(v);
}

export function eurSigned(v: number, decimals: 0 | 2 = 0): string {
  const s = eur(Math.abs(v), decimals);
  return v > 0.004 ? `+${s}` : v < -0.004 ? `−${s}` : s;
}

export function pct(v: number | null | undefined, decimals: 1 | 2 = 1): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  return (decimals === 2 ? pct2 : pct1).format(v);
}

export function pctSigned(v: number | null | undefined, decimals: 1 | 2 = 1): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  const s = pct(Math.abs(v), decimals);
  return v > 0.00005 ? `+${s}` : v < -0.00005 ? `−${s}` : s;
}

export function qty(v: number): string {
  return num.format(v);
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function fechaCorta(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${Number(d)} ${MESES[Number(m) - 1]} ${y}`;
}

export function mesCorto(isoOrKey: string): string {
  const [y, m] = isoOrKey.split('-');
  return `${MESES[Number(m) - 1]} ${y?.slice(2)}`;
}

export function mesLargo(key: string): string {
  const nombres = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const [y, m] = key.split('-');
  return `${nombres[Number(m) - 1]} ${y}`;
}

/** Fecha de hoy en Madrid como 'YYYY-MM-DD'. */
export function hoyMadrid(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date());
}

/** Convierte texto en español ("1.234,56" o "1234.56") a número. */
export function parseEsNumber(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === 'number') return Number.isFinite(input) ? input : null;
  let s = input.trim().replace(/\s|€|\$|EUR|USD/gi, '');
  if (!s) return null;
  const neg = /^-|^\(.*\)$|^−/.test(s);
  s = s.replace(/^[-−(]|\)$/g, '');
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  if (lastDot >= 0 && lastComma >= 0) {
    s = lastComma > lastDot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (lastComma >= 0) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (lastDot >= 0 && /^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, '');
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return neg ? -n : n;
}
