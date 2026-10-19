import { PriceSeries } from './prices';
import type { CoreHolding, DailyPoint, PositionResult, PricePoint } from './types';

/**
 * "What-if": ¿cuánto tendrías si cada euro que aportaste (en las mismas fechas)
 * lo hubieras metido en el índice de referencia? Las retiradas venden índice.
 * `benchmark` en EUR.
 */
export function whatIf(
  flows: { fecha: string; importe: number }[],
  benchmark: PricePoint[],
  dates: string[],
): { valor: number; serie: { fecha: string; valor: number }[] } | null {
  const ps = new PriceSeries(benchmark);
  if (ps.size === 0 || flows.length === 0) return null;
  const sorted = [...flows].sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  let units = 0;
  let i = 0;
  const serie: { fecha: string; valor: number }[] = [];
  // Si el índice no tiene precio antes de la primera aportación, se usa su primer precio.
  const firstPrice = ps.first ? ps.on(ps.first)!.precio : 0;
  for (const d of dates) {
    while (i < sorted.length && sorted[i]!.fecha <= d) {
      const f = sorted[i]!;
      const p = ps.on(f.fecha)?.precio ?? firstPrice;
      if (p > 0) units += f.importe / p;
      i++;
    }
    const p = ps.on(d)?.precio ?? firstPrice;
    serie.push({ fecha: d, valor: Math.round(Math.max(0, units) * p * 100) / 100 });
  }
  return { valor: serie[serie.length - 1]?.valor ?? 0, serie };
}

export type GroupKey = 'producto' | 'cartera' | 'clase' | 'tipo' | 'cuenta';

export interface DistributionItem {
  key: string;
  label: string;
  valor: number;
  pct: number;
}

/** Reparto del valor actual por producto, cartera, clase de activo, vehículo (tipo) o bróker. */
export function distribution(
  positions: PositionResult[],
  holdings: CoreHolding[],
  by: GroupKey,
  labels: { carteras?: Record<string, string>; cuentas?: Record<string, string> } = {},
): DistributionItem[] {
  const hmap = new Map(holdings.map((h) => [h.id, h]));
  const acc = new Map<string, { label: string; valor: number }>();
  for (const p of positions) {
    if (p.valor <= 0) continue;
    const h = hmap.get(p.holdingId);
    if (!h) continue;
    let key: string;
    let label: string;
    switch (by) {
      case 'producto':
        key = h.assetId;
        label = h.nombre;
        break;
      case 'cartera':
        key = h.portfolioId;
        label = labels.carteras?.[h.portfolioId] ?? 'Cartera';
        break;
      case 'clase':
        key = h.clase && CLASE_LABEL[h.clase] ? h.clase : 'otros';
        label = CLASE_LABEL[key]!;
        break;
      case 'tipo':
        key = vehiculoOf(h.tipo);
        label = TIPO_LABEL[key] ?? key;
        break;
      case 'cuenta':
        key = h.accountId;
        label = labels.cuentas?.[h.accountId] ?? 'Cuenta';
        break;
    }
    const cur = acc.get(key) ?? { label, valor: 0 };
    cur.valor += p.valor;
    acc.set(key, cur);
  }
  const total = [...acc.values()].reduce((a, b) => a + b.valor, 0);
  return [...acc.entries()]
    .map(([key, v]) => ({ key, label: v.label, valor: Math.round(v.valor * 100) / 100, pct: total > 0 ? v.valor / total : 0 }))
    .sort((a, b) => b.valor - a.valor);
}

/** Vehículo (cómo está empaquetada la inversión). Un fondo monetario es un fondo. */
export function vehiculoOf(tipo: string): string {
  return tipo === 'monetario' ? 'fondo' : tipo;
}

export const TIPO_LABEL: Record<string, string> = {
  fondo: 'Fondos',
  etf: 'ETF / ETC',
  accion: 'Acciones',
  cripto: 'Cripto directa',
  monetario: 'Fondos',
  plan_pensiones: 'Planes de pensiones',
  efectivo: 'Cuentas y efectivo',
  deposito: 'Depósitos',
  otro: 'Otros',
};

/** Clase de activo: qué riesgo tiene la inversión. */
export const CLASES = ['rv', 'rf', 'monetario', 'materias_primas', 'cripto', 'inmobiliario', 'mixto', 'otros'] as const;
export type Clase = (typeof CLASES)[number];

export const CLASE_LABEL: Record<string, string> = {
  rv: 'Renta variable',
  rf: 'Renta fija',
  monetario: 'Monetario',
  materias_primas: 'Materias primas',
  cripto: 'Cripto',
  inmobiliario: 'Inmobiliario',
  mixto: 'Mixto',
  otros: 'Otros',
};

/** Reduce una serie larga a ~maxPoints puntos (conserva siempre el último). */
export function downsample<T>(arr: T[], maxPoints = 400): T[] {
  if (arr.length <= maxPoints) return arr;
  const step = Math.ceil(arr.length / maxPoints);
  const out: T[] = [];
  for (let i = 0; i < arr.length; i += step) out.push(arr[i] as T);
  if (out[out.length - 1] !== arr[arr.length - 1]) out.push(arr[arr.length - 1] as T);
  return out;
}

/**
 * Meses hasta alcanzar un objetivo aportando `mensual` al mes con una
 * rentabilidad anual supuesta. null si no se alcanza en 100 años.
 */
export function monthsToGoal(valor: number, objetivo: number, mensual: number, rentAnual = 0.05): number | null {
  if (valor >= objetivo) return 0;
  const r = Math.pow(1 + rentAnual, 1 / 12) - 1;
  let v = valor;
  for (let m = 1; m <= 1200; m++) {
    v = v * (1 + r) + mensual;
    if (v >= objetivo) return m;
  }
  return null;
}

/** Interés compuesto con aportación mensual: serie anual de valor y aportado. */
export function compoundInterest(inicial: number, mensual: number, rentAnual: number, anios: number) {
  const r = Math.pow(1 + rentAnual, 1 / 12) - 1;
  let v = inicial;
  let aportado = inicial;
  const out = [{ anio: 0, valor: inicial, aportado }];
  for (let m = 1; m <= anios * 12; m++) {
    v = v * (1 + r) + mensual;
    aportado += mensual;
    if (m % 12 === 0) out.push({ anio: m / 12, valor: Math.round(v), aportado: Math.round(aportado) });
  }
  return out;
}

/** Recorta la serie a un periodo ('1M','6M','1A','3A','Todo'). */
export function sliceByPeriod(series: DailyPoint[], period: string, today: string): DailyPoint[] {
  const days: Record<string, number> = { '1M': 31, '6M': 183, '1A': 365, '3A': 1096 };
  const n = days[period];
  if (!n) return series;
  const from = new Date(Date.parse(today + 'T00:00:00Z') - n * 86_400_000).toISOString().slice(0, 10);
  return series.filter((p) => p.fecha >= from);
}
