import type { ComputeResult, CoreHolding, DailyPoint } from '@kartera/core';
import { addDays, distribution, monthsToGoal, TIPO_LABEL, type DistributionItem } from '@kartera/core';
import { CHART_COLORS } from '@/components/ui';

/** Series listas para las gráficas: diario el último año, semanal antes (menos datos al navegador). */
export function compactSeries<T extends { fecha: string }>(series: T[], today: string, dailyDays = 400): T[] {
  const cutoff = addDays(today, -dailyDays);
  const out: T[] = [];
  let i = 0;
  for (const p of series) {
    if (p.fecha >= cutoff || i % 7 === 0) out.push(p);
    i++;
  }
  return out;
}

export interface StackSeries {
  keys: { key: string; label: string; color: string }[];
  rows: Record<string, number | string>[];
}

/** Serie apilada por grupo (producto o tipo); agrupa en "Otros" a partir del 7.º. */
export function stackBy(series: DailyPoint[], holdings: CoreHolding[], by: 'producto' | 'tipo', today: string): StackSeries {
  const hmap = new Map(holdings.map((h) => [h.id, h]));
  const groupOf = (hid: string) => {
    const h = hmap.get(hid);
    if (!h) return { key: 'otros', label: 'Otros' };
    return by === 'producto' ? { key: h.assetId, label: h.nombre } : { key: h.tipo, label: TIPO_LABEL[h.tipo] ?? h.tipo };
  };
  const last = series[series.length - 1];
  const totals = new Map<string, { label: string; v: number }>();
  for (const [hid, v] of Object.entries(last?.porHolding ?? {})) {
    const g = groupOf(hid);
    const cur = totals.get(g.key) ?? { label: g.label, v: 0 };
    cur.v += v;
    totals.set(g.key, cur);
  }
  // Incluye grupos que existieron en el pasado aunque hoy valgan 0.
  for (const p of series) for (const hid of Object.keys(p.porHolding)) {
    const g = groupOf(hid);
    if (!totals.has(g.key)) totals.set(g.key, { label: g.label, v: 0 });
  }
  const ranked = [...totals.entries()].sort((a, b) => b[1].v - a[1].v);
  const top = ranked.slice(0, 6);
  const topKeys = new Set(top.map(([k]) => k));
  const keys = top.map(([key, t], i) => ({ key, label: t.label, color: CHART_COLORS[i % CHART_COLORS.length]! }));
  if (ranked.length > 6) keys.push({ key: 'otros', label: 'Otros', color: CHART_COLORS[7]! });

  const rows = compactSeries(series, today).map((p) => {
    const row: Record<string, number | string> = { fecha: p.fecha };
    for (const k of keys) row[k.key] = 0;
    for (const [hid, v] of Object.entries(p.porHolding)) {
      const g = groupOf(hid);
      const k = topKeys.has(g.key) ? g.key : 'otros';
      row[k] = Math.round(((row[k] as number) + v) * 100) / 100;
    }
    return row;
  });
  return { keys, rows };
}

export interface DistributionSets {
  producto: (DistributionItem & { color: string })[];
  cartera: (DistributionItem & { color: string })[];
  tipo: (DistributionItem & { color: string })[];
  cuenta: (DistributionItem & { color: string })[];
}

export function distributions(
  result: ComputeResult,
  holdings: CoreHolding[],
  labels: { carteras: Record<string, string>; cuentas: Record<string, string> },
): DistributionSets {
  const color = (items: DistributionItem[]) => items.map((d, i) => ({ ...d, color: CHART_COLORS[i % CHART_COLORS.length]! }));
  return {
    producto: color(distribution(result.positions, holdings, 'producto')),
    cartera: color(distribution(result.positions, holdings, 'cartera', labels)),
    tipo: color(distribution(result.positions, holdings, 'tipo')),
    cuenta: color(distribution(result.positions, holdings, 'cuenta', labels)),
  };
}

export function goalEta(valor: number, objetivo: number, mensual: number, today: string): string | null {
  const m = monthsToGoal(valor, objetivo, mensual, 0.05);
  if (m === null) return null;
  if (m === 0) return 'conseguido';
  const d = new Date(today + 'T00:00:00Z');
  d.setUTCMonth(d.getUTCMonth() + m);
  return d.toISOString().slice(0, 7);
}
