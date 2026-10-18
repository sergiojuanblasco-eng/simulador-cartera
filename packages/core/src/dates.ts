/** Utilidades de fecha sobre texto 'YYYY-MM-DD' en UTC, sin dependencias. */

const DAY_MS = 86_400_000;

export function isIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function toTime(s: string): number {
  return Date.parse(s + 'T00:00:00Z');
}

export function fromTime(t: number): string {
  return new Date(t).toISOString().slice(0, 10);
}

export function addDays(s: string, n: number): string {
  return fromTime(toTime(s) + n * DAY_MS);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((toTime(b) - toTime(a)) / DAY_MS);
}

export function monthKey(s: string): string {
  return s.slice(0, 7);
}

/** Meses entre dos claves 'YYYY-MM' (mismo mes = 0). */
export function monthsBetween(a: string, b: string): number {
  const [ya, ma] = a.split('-').map(Number) as [number, number];
  const [yb, mb] = b.split('-').map(Number) as [number, number];
  return (yb - ya) * 12 + (mb - ma);
}

export function prevMonthKey(key: string): string {
  const [y, m] = key.split('-').map(Number) as [number, number];
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
