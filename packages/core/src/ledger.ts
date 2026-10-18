import Decimal from 'decimal.js';
import type { CoreTx, RealizedGain, TxType } from './types';

/**
 * Libro de lotes FIFO.
 *
 * Cada compra crea un lote (participaciones + coste con comisiones + fecha).
 * Las ventas consumen los lotes más antiguos primero, como exige Hacienda.
 * Un traspaso (salida + entrada con el mismo grupoId) mueve los lotes al fondo
 * destino CONSERVANDO coste y fecha originales: no genera ganancia ni pérdida.
 */

export interface Lot {
  cantidad: Decimal;
  coste: Decimal;
  fecha: string;
}

export interface LedgerResult {
  lots: Map<string, Lot[]>;
  realized: RealizedGain[];
  warnings: string[];
}

const ORDER: Record<TxType, number> = {
  compra: 0,
  traspaso_salida: 1,
  traspaso_entrada: 2,
  venta: 3,
  comision: 4,
  dividendo: 5,
};

export function sortTxs<T extends CoreTx>(txs: T[]): T[] {
  return [...txs].sort((a, b) => {
    if (a.fecha !== b.fecha) return a.fecha < b.fecha ? -1 : 1;
    const o = ORDER[a.tipo] - ORDER[b.tipo];
    if (o !== 0) return o;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

export function dec(v: unknown): Decimal {
  if (v === null || v === undefined || v === '') return new Decimal(0);
  try {
    return new Decimal(v as Decimal.Value);
  } catch {
    return new Decimal(0);
  }
}

/** Importe de la operación convertido a EUR. */
export function toEur(importe: unknown, fxEur: unknown): Decimal {
  const fx = dec(fxEur ?? 1);
  return fx.lte(0) ? dec(importe) : dec(importe).div(fx);
}

/** Saca `qty` participaciones de los lotes por orden FIFO. Modifica `lots`. */
function consume(lots: Lot[], qty: Decimal): { taken: Lot[]; missing: Decimal } {
  const taken: Lot[] = [];
  let left = qty;
  while (left.gt(0) && lots.length > 0) {
    const lot = lots[0] as Lot;
    if (lot.cantidad.lte(left)) {
      taken.push(lot);
      left = left.minus(lot.cantidad);
      lots.shift();
    } else {
      const ratio = left.div(lot.cantidad);
      const part: Lot = { cantidad: left, coste: lot.coste.times(ratio), fecha: lot.fecha };
      taken.push(part);
      lot.cantidad = lot.cantidad.minus(left);
      lot.coste = lot.coste.minus(part.coste);
      left = new Decimal(0);
    }
  }
  return { taken, missing: left };
}

const sum = (lots: Lot[], k: 'cantidad' | 'coste') =>
  lots.reduce((acc, l) => acc.plus(l[k]), new Decimal(0));

export function runLedger(txs: CoreTx[]): LedgerResult {
  const lots = new Map<string, Lot[]>();
  const realized: RealizedGain[] = [];
  const warnings: string[] = [];
  const pending = new Map<string, { lots: Lot[]; cantidad: Decimal }>();

  const lotsOf = (h: string) => {
    let l = lots.get(h);
    if (!l) {
      l = [];
      lots.set(h, l);
    }
    return l;
  };

  for (const tx of sortTxs(txs)) {
    const qty = dec(tx.cantidad);
    const importe = toEur(tx.importe, tx.fxEur);
    const comision = toEur(tx.comision ?? 0, tx.fxEur);
    const book = lotsOf(tx.holdingId);

    switch (tx.tipo) {
      case 'compra': {
        if (qty.lte(0)) {
          warnings.push(`Compra sin participaciones (${tx.fecha}); ignorada en el coste.`);
          break;
        }
        book.push({ cantidad: qty, coste: importe.plus(comision), fecha: tx.fecha });
        break;
      }
      case 'venta':
      case 'comision': {
        if (qty.lte(0)) break;
        const { taken, missing } = consume(book, qty);
        if (missing.gt(0)) {
          warnings.push(`Se venden más participaciones de las que había (${tx.fecha}).`);
        }
        const coste = sum(taken, 'coste');
        const neto = tx.tipo === 'venta' ? importe.minus(comision) : importe;
        realized.push({
          txId: tx.id,
          holdingId: tx.holdingId,
          fecha: tx.fecha,
          importe: neto.toNumber(),
          coste: coste.toNumber(),
          ganancia: neto.minus(coste).toNumber(),
        });
        break;
      }
      case 'traspaso_salida': {
        const { taken, missing } = consume(book, qty);
        if (missing.gt(0)) warnings.push(`Traspaso de más participaciones de las que había (${tx.fecha}).`);
        if (tx.grupoId) pending.set(tx.grupoId, { lots: taken, cantidad: sum(taken, 'cantidad') });
        break;
      }
      case 'traspaso_entrada': {
        const src = tx.grupoId ? pending.get(tx.grupoId) : undefined;
        if (!src || src.cantidad.lte(0)) {
          warnings.push(`Traspaso de entrada sin salida (${tx.fecha}); se toma el importe como coste.`);
          if (qty.gt(0)) book.push({ cantidad: qty, coste: importe, fecha: tx.fecha });
          break;
        }
        // Mismos lotes (coste y fecha originales), reescalados a las participaciones del fondo destino.
        for (const l of src.lots) {
          book.push({ cantidad: qty.times(l.cantidad.div(src.cantidad)), coste: l.coste, fecha: l.fecha });
        }
        book.sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
        if (tx.grupoId) pending.delete(tx.grupoId);
        break;
      }
      case 'dividendo':
        break;
    }
  }

  for (const [grupo] of pending) warnings.push(`Traspaso incompleto (grupo ${grupo}): falta la entrada.`);
  return { lots, realized, warnings };
}

export function lotTotals(lots: Lot[] | undefined): { cantidad: Decimal; coste: Decimal } {
  if (!lots) return { cantidad: new Decimal(0), coste: new Decimal(0) };
  return { cantidad: sum(lots, 'cantidad'), coste: sum(lots, 'coste') };
}
