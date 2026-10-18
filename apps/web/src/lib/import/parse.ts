/**
 * Normalización de extractos de brókeres (CSV/Excel) a operaciones de Kartera.
 * Código puro: se usa en el navegador (vista previa) y en el servidor (validación final).
 */
import type { TxType } from '@kartera/core';
import { parseEsNumber } from '@/lib/format';

export const FIELDS = ['fecha', 'isin', 'producto', 'tipo', 'importe', 'cantidad', 'precio', 'comision', 'moneda', 'clase'] as const;
export type Field = (typeof FIELDS)[number];
export type Mapping = Record<Field, number>;

export const FIELD_LABEL: Record<Field, string> = {
  fecha: 'Fecha',
  isin: 'ISIN',
  producto: 'Producto / nombre',
  tipo: 'Tipo de operación',
  importe: 'Importe',
  cantidad: 'Participaciones',
  precio: 'Precio',
  comision: 'Comisión',
  moneda: 'Moneda',
  clase: 'Clase de activo',
};

export interface NormalizedRow {
  fila: number;
  fecha: string | null;
  isin: string | null;
  producto: string | null;
  tipo: TxType | null;
  tipoTexto: string;
  importe: number | null;
  cantidad: number | null;
  precio: number | null;
  comision: number | null;
  moneda: string | null;
  /** Clase de activo del extracto (FUND, STOCK, CRYPTO…), si viene. */
  clase?: string | null;
  /** Símbolo cuando no es un ISIN (BTC, ETH, AAPL…). */
  ticker?: string | null;
  /** Movimiento de cuenta que no es una inversión (pago con tarjeta, transferencia, intereses…). */
  noInversion?: boolean;
}

const strip = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
/** Para cabeceras y tipos: además, «asset_class» = «asset class». */
const stripH = (s: string) => strip(s.replace(/_/g, ' '));
const ISIN_RE = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;

const SYNONYMS: Record<Field, string[]> = {
  fecha: ['fecha', 'fecha operacion', 'fecha de operacion', 'fecha valor', 'fecha contratacion', 'date', 'trade date', 'datum', 'booking date'],
  isin: ['isin', 'codigo isin', 'isin code', 'cod. isin', 'symbol', 'simbolo', 'isin/wkn', 'wkn/isin'],
  producto: ['producto', 'nombre', 'fondo', 'nombre del fondo', 'descripcion', 'instrumento', 'activo', 'valor', 'name', 'security', 'title', 'asset', 'instrument'],
  tipo: ['tipo', 'tipo operacion', 'tipo de operacion', 'operacion', 'movimiento', 'concepto', 'type', 'transaction type', 'side', 'action'],
  importe: ['importe', 'importe total', 'importe neto', 'importe bruto', 'efectivo', 'valor efectivo', 'importe (eur)', 'importe eur', 'amount', 'total', 'net amount'],
  cantidad: ['participaciones', 'n participaciones', 'numero de participaciones', 'titulos', 'acciones', 'cantidad', 'unidades', 'shares', 'quantity', 'units'],
  precio: ['precio', 'valor liquidativo', 'precio unitario', 'precio por participacion', 'price', 'nav', 'cotizacion', 'share price'],
  comision: ['comision', 'comisiones', 'gastos', 'fee', 'fees', 'commission'],
  moneda: ['moneda', 'divisa', 'currency'],
  clase: ['asset class', 'clase de activo', 'clase activo', 'tipo de activo', 'tipo de producto', 'asset type', 'product type', 'instrument type'],
};

/** Detecta qué columna corresponde a cada campo a partir de las cabeceras. */
export function autoMap(headers: string[], dataRows: unknown[][] = []): Mapping {
  const h = headers.map((x) => stripH(String(x ?? '')));
  const used = new Set<number>();
  const map = Object.fromEntries(FIELDS.map((f) => [f, -1])) as Mapping;
  // 1) coincidencia exacta, 2) la cabecera contiene el sinónimo
  for (const pass of ['exact', 'contains'] as const) {
    for (const f of FIELDS) {
      if (map[f] >= 0) continue;
      for (const syn of SYNONYMS[f]) {
        const idx = h.findIndex((x, i) => !used.has(i) && (pass === 'exact' ? x === syn : x.includes(syn)));
        if (idx >= 0) {
          map[f] = idx;
          used.add(idx);
          break;
        }
      }
    }
  }
  return dataRows.length ? refineIsin(map, headers.length, dataRows) : map;
}

/** Proporción de celdas (no vacías) de una columna que son ISIN. */
function isinRatio(rows: unknown[][], col: number): number {
  let n = 0;
  let ok = 0;
  for (const r of rows.slice(0, 200)) {
    const v = text(r?.[col]).toUpperCase().replace(/\s/g, '');
    if (!v) continue;
    n++;
    if (ISIN_RE.test(v)) ok++;
  }
  return n ? ok / n : 0;
}

/**
 * Si la columna del ISIN no se reconoce por el nombre (o no tiene ISINs),
 * se busca por el contenido: la columna libre donde la mayoría de valores son ISIN.
 */
export function refineIsin(map: Mapping, nCols: number, rows: unknown[][]): Mapping {
  if (map.isin >= 0 && isinRatio(rows, map.isin) >= 0.3) return map;
  const used = new Set(FIELDS.filter((f) => f !== 'isin').map((f) => map[f]).filter((i) => i >= 0));
  let best = -1;
  let bestRatio = 0.6;
  for (let c = 0; c < nCols; c++) {
    if (used.has(c)) continue;
    const r = isinRatio(rows, c);
    if (r >= bestRatio) { best = c; bestRatio = r; }
  }
  return best >= 0 ? { ...map, isin: best } : map;
}

/** Busca la fila de cabeceras (los extractos a veces traen líneas de título antes). */
export function findHeaderRow(rows: unknown[][]): number {
  let best = 0;
  let bestScore = -1;
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const m = autoMap((rows[i] ?? []).map((c) => String(c ?? '')));
    const score = FIELDS.filter((f) => m[f] >= 0).length;
    if (score > bestScore) {
      best = i;
      bestScore = score;
    }
  }
  return best;
}

export function parseDate(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return new Date(Date.UTC(v.getFullYear(), v.getMonth(), v.getDate())).toISOString().slice(0, 10);
  }
  if (typeof v === 'number' && v > 20000 && v < 80000) {
    // Fecha serial de Excel
    return new Date(Date.UTC(1899, 11, 30) + v * 86_400_000).toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  let y: number, mo: number, d: number;
  if (m) {
    y = Number(m[1]); mo = Number(m[2]); d = Number(m[3]);
  } else {
    m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
    if (!m) return null;
    d = Number(m[1]); mo = Number(m[2]); y = Number(m[3]);
    if (y < 100) y += y >= 70 ? 1900 : 2000;
  }
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const iso = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const check = new Date(iso + 'T00:00:00Z');
  return check.toISOString().slice(0, 10) === iso ? iso : null;
}

/** Traduce el texto del extracto al tipo de operación. null si no se reconoce. */
export function detectTipo(text: string): TxType | null {
  const s = stripH(text);
  if (!s) return null;
  if (s.includes('traspaso') || s.includes('transfer')) {
    if (/entrada|recibido|in\b|incoming/.test(s)) return 'traspaso_entrada';
    if (/salida|enviado|out\b|outgoing/.test(s)) return 'traspaso_salida';
    return null;
  }
  if (/dividend|distribuci|cupon/.test(s)) return 'dividendo';
  if (/comision|\bfee|custodia|gastos/.test(s)) return 'comision';
  if (/venta|reembolso|rescate|\bsell|\bsale|verkauf/.test(s)) return 'venta';
  if (/compra|suscripci|aportaci|\bbuy|purchase|plan de inversion|plan de ahorro|savings plan|sparplan|kauf|round ?up|redondeo/.test(s)) return 'compra';
  return null;
}

const cell = (row: unknown[], i: number) => (i >= 0 ? row[i] : undefined);
const text = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim());
const num = (v: unknown) => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  return parseEsNumber(text(v));
};

/** Convierte las filas de datos (sin cabecera) a operaciones normalizadas. */
export function normalizeRows(rows: unknown[][], mapping: Mapping, firstRowNumber = 2): NormalizedRow[] {
  const out: NormalizedRow[] = [];
  rows.forEach((row, idx) => {
    if (!row || row.every((c) => text(c) === '')) return;
    const isinRaw = text(cell(row, mapping.isin)).toUpperCase().replace(/\s/g, '');
    const tipoTexto = text(cell(row, mapping.tipo));
    const importe = num(cell(row, mapping.importe));
    const cantidad = num(cell(row, mapping.cantidad));
    const precio = num(cell(row, mapping.precio));
    const comision = num(cell(row, mapping.comision));
    let tipo = detectTipo(tipoTexto);
    // Sin columna de tipo (o «orden ejecutada»): el signo lo dice (+ participaciones = compra).
    const generic = mapping.tipo < 0 || /trade|order|execut|ejecuci|orden/.test(stripH(tipoTexto));
    if (!tipo && generic) {
      if (cantidad !== null && cantidad !== 0) tipo = cantidad > 0 ? 'compra' : 'venta';
      else if (mapping.tipo >= 0 && importe !== null && importe !== 0) tipo = importe < 0 ? 'compra' : 'venta';
    }
    const isin = ISIN_RE.test(isinRaw) ? isinRaw : null;
    const clase = mapping.clase >= 0 ? text(cell(row, mapping.clase)) || null : null;
    // Extractos con «clase de activo» (Trade Republic): sin clase ni ISIN es un movimiento de cuenta.
    const noInversion = mapping.clase >= 0 && !clase && !isin;
    let imp = importe !== null ? Math.abs(importe) : null;
    if (imp === null && cantidad !== null && precio !== null) imp = Math.abs(cantidad * precio);
    out.push({
      fila: firstRowNumber + idx,
      fecha: parseDate(cell(row, mapping.fecha)),
      isin,
      producto: text(cell(row, mapping.producto)) || null,
      tipo,
      tipoTexto,
      importe: imp,
      cantidad: cantidad !== null ? Math.abs(cantidad) : null,
      precio: precio !== null ? Math.abs(precio) : null,
      comision: comision !== null ? Math.abs(comision) : null,
      moneda: (text(cell(row, mapping.moneda)).toUpperCase().match(/^[A-Z]{3}$/)?.[0]) ?? null,
      clase,
      ticker: !isin && /^[A-Z0-9.]{1,12}$/.test(isinRaw) ? isinRaw : null,
      ...(noInversion ? { noInversion: true } : {}),
    });
  });
  return out;
}

export type RowIssue = 'no_inversion' | 'sin_fecha' | 'sin_importe' | 'sin_producto' | 'tipo_desconocido';

export function rowIssues(r: NormalizedRow): RowIssue[] {
  if (r.noInversion) return ['no_inversion'];
  const issues: RowIssue[] = [];
  if (!r.fecha) issues.push('sin_fecha');
  if (!r.importe || r.importe <= 0) issues.push('sin_importe');
  if (!r.isin && !r.producto) issues.push('sin_producto');
  if (!r.tipo) issues.push('tipo_desconocido');
  return issues;
}

export const ISSUE_LABEL: Record<RowIssue, string> = {
  no_inversion: 'movimiento de cuenta, no es una inversión',
  sin_fecha: 'sin fecha válida',
  sin_importe: 'sin importe',
  sin_producto: 'sin producto ni ISIN',
  tipo_desconocido: 'tipo de operación desconocido',
};

/** Clave del producto para agrupar filas. */
export function productKey(r: Pick<NormalizedRow, 'isin' | 'producto'>): string {
  return r.isin ? `isin:${r.isin}` : `nombre:${strip(r.producto ?? '')}`;
}

/** Convierte la respuesta JSON de la IA a filas normalizadas. */
export function normalizeAiRows(items: unknown[]): NormalizedRow[] {
  const TIPOS: TxType[] = ['compra', 'venta', 'traspaso_entrada', 'traspaso_salida', 'dividendo', 'comision'];
  return items.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object').map((o, i) => {
    const t = String(o.tipo ?? '');
    const isin = String(o.isin ?? '').toUpperCase();
    const n = (k: string) => { const v = num(o[k]); return v === null ? null : Math.abs(v); };
    return {
      fila: i + 1,
      fecha: parseDate(o.fecha),
      isin: ISIN_RE.test(isin) ? isin : null,
      producto: text(o.producto) || null,
      tipo: (TIPOS as string[]).includes(t) ? (t as TxType) : detectTipo(t),
      tipoTexto: t,
      importe: n('importe'),
      cantidad: n('participaciones') ?? n('cantidad'),
      precio: n('precio'),
      comision: n('comision'),
      moneda: (String(o.moneda ?? '').toUpperCase().match(/^[A-Z]{3}$/)?.[0]) ?? null,
    };
  });
}
