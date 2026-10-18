import { daysBetween } from './dates';

export interface CashFlow {
  fecha: string;
  /** Desde el punto de vista del inversor: − dinero que sale de su bolsillo, + dinero que recibe. */
  importe: number;
}

const MIN_DAYS = 90;

/**
 * TIR anualizada con fechas irregulares (equivalente a XIRR de Excel).
 *
 * Método: Newton-Raphson y, si no converge, bisección (más lenta pero segura).
 * Devuelve null si no tiene sentido calcularla: menos de 90 días de historia
 * (anualizar periodos cortos da cifras engañosas), sin flujos de los dos signos,
 * o sin solución en el rango [-99,99 %, +1000 %].
 */
export function xirr(flows: CashFlow[], opts: { minDays?: number } = {}): number | null {
  const fs = flows.filter((f) => Number.isFinite(f.importe) && f.importe !== 0);
  if (fs.length < 2) return null;
  if (!fs.some((f) => f.importe < 0) || !fs.some((f) => f.importe > 0)) return null;

  const t0 = fs.reduce((min, f) => (f.fecha < min ? f.fecha : min), fs[0]!.fecha);
  const tMax = fs.reduce((max, f) => (f.fecha > max ? f.fecha : max), fs[0]!.fecha);
  if (daysBetween(t0, tMax) < (opts.minDays ?? MIN_DAYS)) return null;

  const years = fs.map((f) => daysBetween(t0, f.fecha) / 365);
  const amounts = fs.map((f) => f.importe);

  const npv = (r: number) => {
    let s = 0;
    for (let i = 0; i < amounts.length; i++) s += (amounts[i] as number) / Math.pow(1 + r, years[i] as number);
    return s;
  };
  const dnpv = (r: number) => {
    let s = 0;
    for (let i = 0; i < amounts.length; i++) {
      const y = years[i] as number;
      s += (-y * (amounts[i] as number)) / Math.pow(1 + r, y + 1);
    }
    return s;
  };

  // 1) Newton desde varios puntos de partida
  for (const guess of [0.1, 0, 0.5, -0.5]) {
    let r = guess;
    for (let i = 0; i < 100; i++) {
      const f = npv(r);
      const d = dnpv(r);
      if (!Number.isFinite(f) || !Number.isFinite(d) || d === 0) break;
      const next = r - f / d;
      if (next <= -0.9999 || !Number.isFinite(next)) break;
      if (Math.abs(next - r) < 1e-10) return next;
      r = next;
    }
  }

  // 2) Bisección
  let lo = -0.9999;
  let hi = 10;
  let flo = npv(lo);
  const fhi = npv(hi);
  if (!Number.isFinite(flo) || !Number.isFinite(fhi) || flo * fhi > 0) return null;
  for (let i = 0; i < 300; i++) {
    const mid = (lo + hi) / 2;
    const fm = npv(mid);
    if (Math.abs(fm) < 1e-9 || hi - lo < 1e-12) return mid;
    if (flo * fm < 0) {
      hi = mid;
    } else {
      lo = mid;
      flo = fm;
    }
  }
  return (lo + hi) / 2;
}
