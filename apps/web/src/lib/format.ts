/** Formato numérico en español de España. */

/**
 * Separador de miles SIEMPRE, también con 4 cifras (6.589 €). La norma del español lo omite en
 * números de 4 cifras, pero en una app de dinero mezclar «6589 €» y «16.183 €» confunde.
 * Si el navegador no entiende `useGrouping: 'always'`, se usa el formato alemán, que es idéntico
 * al español (1.234,56 €, 12,3 %) y sí agrupa siempre.
 */
const GROUP_ALWAYS = (() => {
  try {
    return new Intl.NumberFormat('es-ES', { useGrouping: 'always' } as unknown as Intl.NumberFormatOptions).format(1234) === '1.234';
  } catch {
    return false;
  }
})();

export function nf(opts: Intl.NumberFormatOptions = {}): Intl.NumberFormat {
  return GROUP_ALWAYS
    ? new Intl.NumberFormat('es-ES', { ...opts, useGrouping: 'always' } as unknown as Intl.NumberFormatOptions)
    : new Intl.NumberFormat('de-DE', opts);
}

const eur0 = nf({ style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const eur2 = nf({ style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct0 = nf({ style: 'percent', maximumFractionDigits: 0 });
const pct1 = nf({ style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });
const pct2 = nf({ style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = nf({ maximumFractionDigits: 4 });

const numCache = new Map<string, Intl.NumberFormat>();
/** Número con separador de miles y entre `minDec` y `maxDec` decimales: 1.234,5 */
export function numEs(v: number, maxDec = 2, minDec = 0): string {
  const k = `${minDec}-${maxDec}`;
  let f = numCache.get(k);
  if (!f) { f = nf({ minimumFractionDigits: minDec, maximumFractionDigits: maxDec }); numCache.set(k, f); }
  return f.format(v);
}

export function eur(v: number, decimals: 0 | 2 = 0): string {
  return (decimals === 2 ? eur2 : eur0).format(v);
}

export function eurSigned(v: number, decimals: 0 | 2 = 0): string {
  // Sin decimales, lo que se redondea a 0 € no lleva signo
  const min = decimals === 0 ? 0.5 : 0.004;
  if (Math.abs(v) < min) return eur(0, decimals);
  const s = eur(Math.abs(v), decimals);
  return v > 0 ? `+${s}` : `−${s}`;
}

export function pct(v: number | null | undefined, decimals: 0 | 1 | 2 = 1): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  return (decimals === 2 ? pct2 : decimals === 0 ? pct0 : pct1).format(v);
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

/**
 * Pone el separador de miles a lo que alguien ha escrito en un campo («6300,5» → «6.300,5»),
 * respetando los decimales que escribió. Si no es un número, lo deja como está.
 */
export function groupEs(input: string): string {
  const raw = input.trim();
  if (!raw) return input;
  const n = parseEsNumber(raw);
  if (n === null) return input;
  const clean = raw.replace(/\s|€/g, '');
  let dec = 0;
  const comma = clean.match(/,(\d*)$/);
  if (comma) dec = comma[1]!.length;
  else if (/\.\d+$/.test(clean) && !/^-?\d{1,3}(\.\d{3})+$/.test(clean)) dec = clean.split('.').pop()!.length;
  return numEs(n, Math.min(dec, 10), Math.min(dec, 10));
}

