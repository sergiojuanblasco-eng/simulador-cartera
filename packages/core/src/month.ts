import type { ComputeResult, DailyPoint } from './types';

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Qué hizo un producto en un mes: lo que pusiste tú, lo que entró al panel y lo que hizo el mercado. */
export interface ProductMonth {
  holdingId: string;
  /** Valor al cerrar el mes anterior. */
  inicio: number;
  /** Dinero tuyo (+ aportas, − retiras). */
  aportado: number;
  /** Traspasos desde o hacia otros productos. */
  traspaso: number;
  /** Lo que ya tenías y empezaste a seguir este mes. */
  nuevo: number;
  comisiones: number;
  /** Revalorización (o caída) por el mercado. */
  mercado: number;
  /** Valor al cerrar el mes (o hoy, si es el mes en curso). */
  fin: number;
}

export interface MonthDetail {
  /** 'YYYY-MM' */
  mes: string;
  inicio: number;
  fin: number;
  aportado: number;
  nuevo: number;
  mercado: number;
  comisiones: number;
  /** Último día con datos del mes. */
  hasta: string;
  productos: ProductMonth[];
}

/** Detalle de un mes, producto a producto. null si ese mes no tiene datos. */
export function monthDetail(result: ComputeResult, mes: string): MonthDetail | null {
  const idx = result.months.findIndex((m) => m.mes === mes);
  if (idx < 0) return null;
  const m = result.months[idx]!;
  const prevFin = idx > 0 ? result.months[idx - 1]!.valorFin : 0;

  let prev: DailyPoint | undefined;
  let end: DailyPoint | undefined;
  for (const p of result.series) {
    const k = p.fecha.slice(0, 7);
    if (k < mes) prev = p;
    else if (k === mes) end = p;
    else break;
  }
  if (!end) return null;

  const ids = new Set<string>([...Object.keys(prev?.porHolding ?? {}), ...Object.keys(end.porHolding)]);
  const acc = new Map<string, { aportado: number; traspaso: number; nuevo: number; comisiones: number }>();
  for (const f of result.holdingFlows) {
    if (f.fecha.slice(0, 7) !== mes) continue;
    ids.add(f.holdingId);
    const a = acc.get(f.holdingId) ?? { aportado: 0, traspaso: 0, nuevo: 0, comisiones: 0 };
    a.aportado += f.aportado;
    a.traspaso += f.traspaso;
    a.nuevo += f.nuevo;
    a.comisiones += f.comision;
    acc.set(f.holdingId, a);
  }

  const productos: ProductMonth[] = [...ids].map((holdingId) => {
    const inicio = prev?.porHolding[holdingId] ?? 0;
    const fin = end.porHolding[holdingId] ?? 0;
    const a = acc.get(holdingId) ?? { aportado: 0, traspaso: 0, nuevo: 0, comisiones: 0 };
    return {
      holdingId,
      inicio: round2(inicio),
      aportado: round2(a.aportado),
      traspaso: round2(a.traspaso),
      nuevo: round2(a.nuevo),
      comisiones: round2(a.comisiones),
      mercado: round2(fin - inicio - a.aportado - a.traspaso - a.nuevo + a.comisiones),
      fin: round2(fin),
    };
  }).sort((a, b) => b.fin - a.fin || b.inicio - a.inicio);

  return {
    mes, inicio: prevFin, fin: m.valorFin, aportado: m.aportado, nuevo: m.nuevo, mercado: m.ganancia,
    comisiones: m.comisiones, hasta: end.fecha, productos,
  };
}

/** Cifras redondas que se celebran la primera vez que el patrimonio las supera. */
export const HITOS = [1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000, 2500000, 5000000];

export interface Milestones {
  /**
   * Hitos ya superados, con el primer día en que se superó cada uno. `alEmpezar` = se superó el día
   * en que empezaste a seguir algo que ya tenías (no es un logro de ese día: no se celebra).
   */
  logrados: { importe: number; fecha: string; alEmpezar: boolean }[];
  /** El siguiente por conseguir (null si ya están todos). */
  siguiente: { importe: number; falta: number; progreso: number } | null;
}

export function milestones(series: { fecha: string; valor: number; nuevo?: number }[], hitos: number[] = HITOS): Milestones {
  const sorted = [...hitos].sort((a, b) => a - b);
  const logrados: Milestones['logrados'] = [];
  let i = 0;
  for (const p of series) {
    while (i < sorted.length && p.valor >= sorted[i]!) {
      logrados.push({ importe: sorted[i]!, fecha: p.fecha, alEmpezar: (p.nuevo ?? 0) > 0.5 });
      i++;
    }
    if (i >= sorted.length) break;
  }
  const actual = series[series.length - 1]?.valor ?? 0;
  const next = sorted[i];
  return {
    logrados,
    siguiente: next === undefined ? null : {
      importe: next,
      falta: round2(Math.max(0, next - actual)),
      progreso: Math.max(0, Math.min(1, actual / next)),
    },
  };
}
