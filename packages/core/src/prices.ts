import type { PricePoint } from './types';

/**
 * Serie de precios con búsqueda "último precio conocido en o antes de la fecha"
 * (los fines de semana y festivos heredan el último cierre).
 */
export class PriceSeries {
  private readonly fechas: string[];
  private readonly precios: number[];

  constructor(points: PricePoint[] = []) {
    const sorted = points
      .map((p) => ({ fecha: p.fecha, precio: Number(p.precio) }))
      .filter((p) => Number.isFinite(p.precio) && p.precio > 0)
      .sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
    this.fechas = sorted.map((p) => p.fecha);
    this.precios = sorted.map((p) => p.precio);
  }

  get size(): number {
    return this.fechas.length;
  }

  get first(): string | null {
    return this.fechas[0] ?? null;
  }

  /** Índice del último punto con fecha <= `fecha`, o -1. Búsqueda binaria. */
  private indexOn(fecha: string): number {
    let lo = 0;
    let hi = this.fechas.length - 1;
    let ans = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if ((this.fechas[mid] as string) <= fecha) {
        ans = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return ans;
  }

  on(fecha: string): { precio: number; fecha: string } | null {
    const i = this.indexOn(fecha);
    if (i < 0) return null;
    return { precio: this.precios[i] as number, fecha: this.fechas[i] as string };
  }

  /** Cursor para recorrer fechas en orden creciente en O(n) total. */
  cursor(): (fecha: string) => number | null {
    let i = -1;
    return (fecha: string) => {
      while (i + 1 < this.fechas.length && (this.fechas[i + 1] as string) <= fecha) i++;
      return i >= 0 ? (this.precios[i] as number) : null;
    };
  }
}
