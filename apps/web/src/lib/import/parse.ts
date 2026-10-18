/**
 * Normalización de extractos de brókeres (CSV/Excel) a operaciones de Kartera.
 * Código puro: se usa en el navegador (vista previa) y en el servidor (validación final).
 */
import type { TxType } from '@kartera/core';
import { parseEsNumber } from '@/lib/format';

export const FIELDS = ['fecha', 'isin', 'producto', 'tipo', 'importe', 'cantidad', 'precio', 'comision', 'moneda'] as const;
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
}

const strip = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

const SYNONYMS: Record<Field, string[]> = {
  fecha: ['fecha', 'fecha operacion', 'fecha de operacion', 'fecha valor', 'fecha contratacion', 'date', 'trade date', 'datum', 'booking date'],
  isin: ['isin', 'codigo isin', 'isin code', 'cod. isin'],
  producto: ['producto', 'nombre', 'fondo', 'nombre del fondo', 'descripcion', 'instrumento', 'activo', 'valor', 'name', 'security', 'title', 'asset', 'instrument'],
  tipo: ['tipo', 'tipo operacion', 'tipo de operacion', 'operacion', 'movimiento', 'concepto', 'type', 'transaction type', 'side', 'action'],
  importe: ['importe', 'importe total', 'importe neto', 'importe bruto', 'efectivo', 'valor efectivo', 'importe (eur)', 'importe eur', 'amount', 'total', 'net amount'],
  cantidad: ['participaciones', 'n participaciones', 'numero de participaciones', 'titulos', 'acciones', 'cantidad', 'unidades', 'shares', 'quantity', 'units'],
  precio: ['precio', 'valor liquidativo', 'precio unitario', 'precio por participacion', 'price', 'nav', 'cotizacion', 'share price'],
  comision: ['comision', 'comisiones', 'gastos', 'fee', 'fees', 'commission'],
  moneda: ['moneda', 'divisa', 'currency'],
};

/** Detecta qué columna corresponde a cada campo a partir de las cabeceras. */
export function autoMap(headers: string[]): Mapping {
  const h = headers.map((x) => strip(String(x ?? '')));
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
  return map;
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
  const s = strip(text);
  if (!s) return null;
  if (s.includes('traspaso') || s.includes('transfer')) {
    if (/entrada|recibido|in\b|incoming/.test(s)) return 'traspaso_entrada';
    if (/salida|enviado|out\b|outgoing/.test(s)) return 'traspaso_salida';
    return null;
  }
  if (/dividend|distribuci|cupon/.test(s)) return 'dividendo';
  if (/comision|\bfee|custodia|gastos/.test(s)) return 'comision';
  if (/venta|reembolso|rescate|\bsell|\bsale|verkauf/.test(s)) return 'venta';
  if (/compra|suscripci|aportaci|\bbuy|purchase|plan de inversion|plan de ahorro|savings plan|sparplan|kauf/.test(s)) return 'compra';
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
    // Sin columna de tipo: el signo de las participaciones lo dice (+ compra, − venta).
    if (!tipo && mapping.tipo < 0 && cantidad !== null && cantidad !== 0) tipo = cantidad > 0 ? 'compra' : 'venta';
    let imp = importe !== null ? Math.abs(importe) : null;
    if (imp === null && cantidad !== null && precio !== null) imp = Math.abs(cantidad * precio);
    out.push({
      fila: firstRowNumber + idx,
      fecha: parseDate(cell(row, mapping.fecha)),
      isin: /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(isinRaw) ? isinRaw : null,
      producto: text(cell(row, mapping.producto)) || null,
      tipo,
      tipoTexto,
      importe: imp,
      cantidad: cantidad !== null ? Math.abs(cantidad) : null,
      precio: precio !== null ? Math.abs(precio) : null,
      comision: comision !== null ? Math.abs(comision) : null,
      moneda: (text(cell(row, mapping.moneda)).toUpperCase().match(/^[A-Z]{3}$/)?.[0]) ?? null,
    });
  });
  return out;
}

export type RowIssue = 'sin_fecha' | 'sin_importe' | 'sin_producto' | 'tipo_desconocido';

export function rowIssues(r: NormalizedRow): RowIssue[] {
  const issues: RowIssue[] = [];
  if (!r.fecha) issues.push('sin_fecha');
  if (!r.importe || r.importe <= 0) issues.push('sin_importe');
  if (!r.isin && !r.producto) issues.push('sin_producto');
  if (!r.tipo) issues.push('tipo_desconocido');
  return issues;
}

export const ISSUE_LABEL: Record<RowIssue, string> = {
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
      isin: /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(isin) ? isin : null,
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
