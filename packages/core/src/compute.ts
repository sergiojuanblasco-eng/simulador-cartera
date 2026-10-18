import Decimal from 'decimal.js';
import { addDays, monthKey, monthsBetween, prevMonthKey } from './dates';
import { dec, lotTotals, runLedger, sortTxs, toEur } from './ledger';
import { PriceSeries } from './prices';
import type {
  ComputeInput, ComputeResult, CoreHolding, CoreTx, DailyPoint, Metrics, MonthSummary,
  PositionResult, YearReturn,
} from './types';
import { xirr } from './xirr';

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Signo con el que una operación cambia las participaciones. */
function qtySign(tx: CoreTx): number {
  switch (tx.tipo) {
    case 'compra':
    case 'traspaso_entrada':
      return 1;
    case 'venta':
    case 'traspaso_salida':
    case 'comision':
      return -1;
    default:
      return 0;
  }
}

/**
 * Flujo externo de la operación en EUR desde el punto de vista de la cartera
 * (+ entra dinero nuevo, − sale dinero hacia el bolsillo del usuario).
 * Los traspasos son internos salvo que su pareja quede fuera del ámbito analizado.
 */
function externalFlow(tx: CoreTx, internal: boolean): Decimal {
  const importe = toEur(tx.importe, tx.fxEur);
  const comision = toEur(tx.comision ?? 0, tx.fxEur);
  switch (tx.tipo) {
    case 'compra':
      return importe.plus(comision);
    case 'venta':
      return importe.minus(comision).neg();
    case 'dividendo':
      return importe.neg();
    case 'traspaso_salida':
      return internal ? new Decimal(0) : importe.neg();
    case 'traspaso_entrada':
      return internal ? new Decimal(0) : importe;
    default:
      return new Decimal(0);
  }
}

/** Comisión pagada en la operación (EUR): la de compra/venta, o el importe si es un cargo de comisión. */
function txFee(tx: CoreTx): Decimal {
  if (tx.tipo === 'comision') return toEur(tx.importe, tx.fxEur).plus(toEur(tx.comision ?? 0, tx.fxEur));
  if (tx.tipo === 'dividendo') return new Decimal(0);
  return toEur(tx.comision ?? 0, tx.fxEur);
}

class Pricer {
  private readonly market = new Map<string, PriceSeries>();
  private readonly implied = new Map<string, PriceSeries>();
  private readonly fx = new Map<string, PriceSeries>();
  readonly warnings = new Set<string>();

  constructor(private readonly input: ComputeInput, private readonly holdings: Map<string, CoreHolding>) {
    for (const [assetId, pts] of Object.entries(input.prices)) this.market.set(assetId, new PriceSeries(pts));
    for (const [cur, pts] of Object.entries(input.fx ?? {})) this.fx.set(cur.toUpperCase(), new PriceSeries(pts));

    // Precio implícito de cada operación (importe / participaciones), en EUR:
    // sirve de respaldo cuando el proveedor no tiene precio para esa fecha.
    const byHolding = new Map<string, { fecha: string; precio: number }[]>();
    for (const tx of input.txs) {
      const q = dec(tx.cantidad);
      if (q.lte(0) || tx.tipo === 'dividendo' || tx.tipo === 'comision') continue;
      const p = toEur(tx.importe, tx.fxEur).div(q).toNumber();
      if (!(p > 0)) continue;
      const arr = byHolding.get(tx.holdingId) ?? [];
      arr.push({ fecha: tx.fecha, precio: p });
      byHolding.set(tx.holdingId, arr);
    }
    for (const [h, pts] of byHolding) this.implied.set(h, new PriceSeries(pts));
  }

  /** Función de precio en EUR para recorrer días en orden creciente. */
  cursorFor(holdingId: string): (fecha: string) => number | null {
    const h = this.holdings.get(holdingId);
    if (!h) return () => null;
    const market = this.market.get(h.assetId)?.cursor();
    const implied = this.implied.get(holdingId)?.cursor();
    const cur = h.moneda.toUpperCase();
    const fx = cur === 'EUR' ? null : this.fx.get(cur)?.cursor();
    const isCash = h.tipo === 'efectivo';
    return (fecha: string) => {
      const imp = implied ? implied(fecha) : null;
      const m = market ? market(fecha) : null;
      if (m !== null) {
        if (cur === 'EUR') return m;
        const rate = fx ? fx(fecha) : null;
        if (rate) return m / rate;
        this.warnings.add(`Falta el tipo de cambio ${cur}/EUR: se usa el precio de tus operaciones.`);
        return imp;
      }
      if (isCash) return 1;
      return imp;
    };
  }

  /** Último precio conocido en EUR para una fecha concreta. */
  on(holdingId: string, fecha: string): { precio: number; fecha: string | null } {
    const h = this.holdings.get(holdingId);
    if (!h) return { precio: 0, fecha: null };
    const m = this.market.get(h.assetId)?.on(fecha);
    const cur = h.moneda.toUpperCase();
    if (m) {
      if (cur === 'EUR') return m;
      const rate = this.fx.get(cur)?.on(fecha);
      if (rate) return { precio: m.precio / rate.precio, fecha: m.fecha };
    }
    if (h.tipo === 'efectivo') return { precio: 1, fecha };
    const imp = this.implied.get(holdingId)?.on(fecha);
    return imp ?? { precio: 0, fecha: null };
  }
}

function emptyMetrics(): Metrics {
  return {
    valor: 0, aportado: 0, ganancia: 0, gananciaPct: null, tir: null, maxDrawdown: 0,
    aportacionMediaMensual: 0, racha: 0, terMedio: null, costeAnual: 0, costeMensual: 0,
    mesActual: { aportado: 0, ganancia: 0, comisiones: 0 }, rentabilidadAnual: [],
    comisionesPagadas: 0, comisionesPorAnio: [],
  };
}

export function computePortfolio(input: ComputeInput): ComputeResult {
  const holdings = new Map(input.holdings.map((h) => [h.id, h]));
  const scope = new Set(input.scope ?? input.holdings.map((h) => h.id));
  const allTxs = sortTxs(input.txs.filter((t) => holdings.has(t.holdingId) && t.fecha <= input.today));
  const txs = allTxs.filter((t) => scope.has(t.holdingId));

  const ledger = runLedger(allTxs);
  const pricer = new Pricer({ ...input, txs: allTxs }, holdings);
  const warnings = new Set<string>(ledger.warnings);

  if (txs.length === 0) {
    return { series: [], positions: [], realized: [], months: [], metrics: emptyMetrics(), flows: [], warnings: [...warnings] };
  }

  // ¿Qué traspasos son internos al ámbito? (todas sus patas dentro)
  const groupHoldings = new Map<string, Set<string>>();
  for (const t of allTxs) {
    if (!t.grupoId) continue;
    const s = groupHoldings.get(t.grupoId) ?? new Set<string>();
    s.add(t.holdingId);
    groupHoldings.set(t.grupoId, s);
  }
  const isInternal = (t: CoreTx) => {
    if (!t.grupoId) return false;
    const hs = groupHoldings.get(t.grupoId);
    return !!hs && hs.size > 1 && [...hs].every((h) => scope.has(h));
  };

  // Flujos externos por día
  const flowByDay = new Map<string, Decimal>();
  for (const t of txs) {
    const f = externalFlow(t, isInternal(t));
    if (f.isZero()) continue;
    flowByDay.set(t.fecha, (flowByDay.get(t.fecha) ?? new Decimal(0)).plus(f));
  }

  // Comisiones pagadas por día y por posición
  const feeByDay = new Map<string, Decimal>();
  const feeByHolding = new Map<string, Decimal>();
  for (const t of txs) {
    const f = txFee(t);
    if (f.isZero()) continue;
    feeByDay.set(t.fecha, (feeByDay.get(t.fecha) ?? new Decimal(0)).plus(f));
    feeByHolding.set(t.holdingId, (feeByHolding.get(t.holdingId) ?? new Decimal(0)).plus(f));
  }

  // Serie diaria
  const start = txs[0]!.fecha;
  const scopeIds = [...scope].filter((id) => holdings.has(id));
  const cursors = new Map(scopeIds.map((id) => [id, pricer.cursorFor(id)]));
  const qty = new Map<string, Decimal>(scopeIds.map((id) => [id, new Decimal(0)]));
  const series: DailyPoint[] = [];
  let aportado = new Decimal(0);
  let txIdx = 0;
  let index = 1;
  let peak = 1;
  let maxDrawdown = 0;
  let prevValor = 0;
  const indexByDay: { fecha: string; index: number }[] = [];

  for (let d = start; d <= input.today; d = addDays(d, 1)) {
    while (txIdx < txs.length && txs[txIdx]!.fecha === d) {
      const t = txs[txIdx]!;
      const s = qtySign(t);
      if (s !== 0) qty.set(t.holdingId, (qty.get(t.holdingId) ?? new Decimal(0)).plus(dec(t.cantidad).times(s)));
      txIdx++;
    }
    const flujo = flowByDay.get(d) ?? new Decimal(0);
    aportado = aportado.plus(flujo);

    let valor = 0;
    const porHolding: Record<string, number> = {};
    for (const id of scopeIds) {
      const price = cursors.get(id)!(d);
      const q = qty.get(id)!.toNumber();
      if (q === 0) continue;
      if (price === null) {
        warnings.add(`Sin precio para "${holdings.get(id)?.nombre}" en algunas fechas.`);
        continue;
      }
      const v = q * price;
      porHolding[id] = round2(v);
      valor += v;
    }

    // Índice de rentabilidad ponderada en el tiempo (TWR): aísla el efecto de aportar/retirar.
    const f = flujo.toNumber();
    if (prevValor > 0.005) {
      const r = Math.max(0, (valor - f) / prevValor);
      index *= r;
      if (index > peak) peak = index;
      const dd = index / peak - 1;
      if (dd < maxDrawdown) maxDrawdown = dd;
    }
    prevValor = valor;
    indexByDay.push({ fecha: d, index });

    series.push({
      fecha: d, valor: round2(valor), aportado: round2(aportado.toNumber()), flujo: round2(f),
      comision: round2((feeByDay.get(d) ?? new Decimal(0)).toNumber()), porHolding,
    });
  }

  // Posiciones vivas (FIFO)
  const positions: PositionResult[] = scopeIds.map((id) => {
    const { cantidad, coste } = lotTotals(ledger.lots.get(id));
    const { precio, fecha } = pricer.on(id, input.today);
    const valor = cantidad.times(precio).toNumber();
    const c = coste.toNumber();
    const qn = cantidad.toNumber();
    return {
      holdingId: id,
      cantidad: qn,
      precio,
      fechaPrecio: fecha,
      valor: round2(valor),
      coste: round2(c),
      ganancia: round2(valor - c),
      gananciaPct: c > 0 ? (valor - c) / c : null,
      precioMedio: qn > 0 ? c / qn : null,
      comisiones: round2((feeByHolding.get(id) ?? new Decimal(0)).toNumber()),
    };
  });

  const last = series[series.length - 1]!;
  const valor = last.valor;
  const aport = last.aportado;
  const flows = [...flowByDay.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([fecha, v]) => ({ fecha, importe: round2(v.toNumber()) }));

  // TIR: el inversor pone dinero (−), recibe dinero (+) y al final "recibe" el valor actual.
  const tir = xirr([
    ...flows.map((f) => ({ fecha: f.fecha, importe: -f.importe })),
    { fecha: input.today, importe: valor },
  ]);

  // Aportación media mensual y racha (solo compras: dinero nuevo)
  const compras = txs.filter((t) => t.tipo === 'compra');
  const currentMonth = monthKey(input.today);
  let aportacionMediaMensual = 0;
  let racha = 0;
  if (compras.length > 0) {
    const totalCompras = compras.reduce((acc, t) => acc.plus(externalFlow(t, false)), new Decimal(0));
    const months = monthsBetween(monthKey(compras[0]!.fecha), currentMonth) + 1;
    aportacionMediaMensual = round2(totalCompras.div(Math.max(1, months)).toNumber());
    const meses = new Set(compras.map((t) => monthKey(t.fecha)));
    let m = meses.has(currentMonth) ? currentMonth : prevMonthKey(currentMonth);
    while (meses.has(m)) {
      racha++;
      m = prevMonthKey(m);
    }
  }

  // Comisiones: TER medio ponderado y coste estimado
  let valorConTer = 0;
  let costeAnual = 0;
  for (const p of positions) {
    const ter = holdings.get(p.holdingId)?.ter;
    if (ter === null || ter === undefined || p.valor <= 0) continue;
    valorConTer += p.valor;
    costeAnual += p.valor * Number(ter);
  }
  const totalPos = positions.reduce((a, p) => a + Math.max(0, p.valor), 0);

  // Resumen mensual
  const months: MonthSummary[] = [];
  let prevFin = 0;
  let cur: MonthSummary | null = null;
  for (const p of series) {
    const k = monthKey(p.fecha);
    if (!cur || cur.mes !== k) {
      if (cur) {
        cur.ganancia = round2(cur.valorFin - prevFin - cur.aportado + cur.comisiones);
        prevFin = cur.valorFin;
        months.push(cur);
      }
      cur = { mes: k, aportado: 0, ganancia: 0, comisiones: 0, valorFin: 0 };
    }
    cur.aportado = round2(cur.aportado + p.flujo);
    cur.comisiones = round2(cur.comisiones + p.comision);
    cur.valorFin = p.valor;
  }
  if (cur) {
    // Mercado = cambio de valor − dinero nuevo + comisiones (las comisiones no son mercado)
    cur.ganancia = round2(cur.valorFin - prevFin - cur.aportado + cur.comisiones);
    months.push(cur);
  }
  const lastMonth = months[months.length - 1];
  const mesActual = lastMonth && lastMonth.mes === currentMonth
    ? { aportado: lastMonth.aportado, ganancia: lastMonth.ganancia, comisiones: lastMonth.comisiones }
    : { aportado: 0, ganancia: 0, comisiones: 0 };

  const feesByYear = new Map<number, number>();
  let feesTotal = 0;
  for (const [d, f] of feeByDay) {
    const y = Number(d.slice(0, 4));
    feesByYear.set(y, round2((feesByYear.get(y) ?? 0) + f.toNumber()));
    feesTotal += f.toNumber();
  }

  // Rentabilidad por año natural (TWR)
  const rentabilidadAnual: YearReturn[] = [];
  const endOfYear = new Map<number, number>();
  for (const { fecha, index: idx } of indexByDay) endOfYear.set(Number(fecha.slice(0, 4)), idx);
  const firstYear = Number(start.slice(0, 4));
  for (const [anio, idx] of [...endOfYear.entries()].sort(([a], [b]) => a - b)) {
    const prev = endOfYear.get(anio - 1) ?? 1;
    const parcial = (anio === firstYear && !start.endsWith('-01-01')) ||
      (anio === Number(input.today.slice(0, 4)) && !input.today.endsWith('-12-31'));
    rentabilidadAnual.push({ anio, rentabilidad: prev > 0 ? idx / prev - 1 : 0, parcial });
  }

  for (const w of pricer.warnings) warnings.add(w);

  return {
    series,
    positions,
    realized: ledger.realized.filter((r) => scope.has(r.holdingId)),
    months,
    flows,
    warnings: [...warnings],
    metrics: {
      valor,
      aportado: aport,
      ganancia: round2(valor - aport),
      gananciaPct: aport > 0 ? (valor - aport) / aport : null,
      tir,
      maxDrawdown,
      aportacionMediaMensual,
      racha,
      terMedio: valorConTer > 0 && totalPos > 0 ? costeAnual / valorConTer : null,
      costeAnual: round2(costeAnual),
      costeMensual: round2(costeAnual / 12),
      mesActual,
      rentabilidadAnual,
      comisionesPagadas: round2(feesTotal),
      comisionesPorAnio: [...feesByYear.entries()].sort(([a], [b]) => a - b).map(([anio, importe]) => ({ anio, importe })),
    },
  };
}
