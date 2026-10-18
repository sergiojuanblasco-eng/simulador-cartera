import { describe, expect, it } from 'vitest';
import { parseEsNumber } from '@/lib/format';
import { autoMap, detectTipo, findHeaderRow, normalizeAiRows, normalizeRows, parseDate, rowIssues } from '@/lib/import/parse';

describe('números en español', () => {
  it.each([
    ['1.234,56', 1234.56],
    ['1234,56', 1234.56],
    ['1,234.56', 1234.56],
    ['1234.56', 1234.56],
    ['1.234', 1234],
    ['-300,00 €', -300],
    ['(45,10)', -45.1],
    ['0,0012', 0.0012],
    ['', null],
    ['abc', null],
  ])('%s → %s', (input, out) => {
    expect(parseEsNumber(input)).toBe(out);
  });
});

describe('fechas', () => {
  it.each([
    ['15/01/2026', '2026-01-15'],
    ['15-01-26', '2026-01-15'],
    ['2026-01-15', '2026-01-15'],
    ['2026-01-15 10:30:00', '2026-01-15'],
    ['31/02/2026', null],
    [46037, '2026-01-15'],
    ['', null],
  ])('%s → %s', (input, out) => {
    expect(parseDate(input)).toBe(out);
  });
});

describe('tipo de operación', () => {
  it.each([
    ['Suscripción', 'compra'],
    ['COMPRA', 'compra'],
    ['Savings plan execution', 'compra'],
    ['Reembolso', 'venta'],
    ['Sell', 'venta'],
    ['Traspaso entrada', 'traspaso_entrada'],
    ['Traspaso de salida', 'traspaso_salida'],
    ['Dividendo', 'dividendo'],
    ['Comisión custodia', 'comision'],
    ['Ingreso', null],
  ])('%s → %s', (input, out) => {
    expect(detectTipo(input)).toBe(out);
  });
});

describe('importación de un CSV típico', () => {
  const rows = [
    ['Extracto de movimientos', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['Fecha operación', 'Fondo', 'ISIN', 'Tipo de operación', 'Participaciones', 'Importe (EUR)'],
    ['15/01/2026', 'Fidelity MSCI World', 'IE00BYX5NX33', 'Suscripción', '26,70', '300,00'],
    ['15/02/2026', 'Fidelity MSCI World', 'IE00BYX5NX33', 'Suscripción', '25,90', '300,00'],
    ['01/06/2026', 'Fidelity MSCI World', 'IE00BYX5NX33', 'Reembolso', '-10', '-119,00'],
    ['12/03/2025', 'Vanguard EM', 'IE0031786696', 'TRASPASO ???', '5', '1.200,00'],
  ];

  it('encuentra la cabecera aunque haya líneas de título', () => {
    expect(findHeaderRow(rows)).toBe(2);
  });

  it('mapea las columnas automáticamente', () => {
    const m = autoMap(rows[2]!);
    expect(m).toMatchObject({ fecha: 0, producto: 1, isin: 2, tipo: 3, cantidad: 4, importe: 5, precio: -1 });
  });

  it('normaliza filas y marca las que hay que revisar', () => {
    const m = autoMap(rows[2]!);
    const out = normalizeRows(rows.slice(3), m, 4);
    expect(out).toHaveLength(4);
    expect(out[0]).toMatchObject({ fila: 4, fecha: '2026-01-15', isin: 'IE00BYX5NX33', tipo: 'compra', cantidad: 26.7, importe: 300 });
    expect(out[2]).toMatchObject({ tipo: 'venta', cantidad: 10, importe: 119 });
    expect(rowIssues(out[0]!)).toEqual([]);
    expect(rowIssues(out[3]!)).toEqual(['tipo_desconocido']);
  });

  it('sin columna de tipo, deduce compra/venta por el signo', () => {
    const out = normalizeRows([['2026-01-01', 'X', '-3', '30']], { fecha: 0, producto: 1, cantidad: 2, importe: 3, isin: -1, tipo: -1, precio: -1, comision: -1, moneda: -1 });
    expect(out[0]!.tipo).toBe('venta');
  });
});

describe('respuesta de la IA', () => {
  it('valida y normaliza', () => {
    const out = normalizeAiRows([
      { fecha: '2026-03-01', isin: 'ie00b4l5y983', producto: 'iShares Core MSCI World', tipo: 'compra', importe: 250, participaciones: 2.5 },
      { fecha: 'mañana', tipo: 'regalo', importe: 'x' },
      'basura',
    ]);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ isin: 'IE00B4L5Y983', tipo: 'compra', importe: 250, cantidad: 2.5 });
    expect(rowIssues(out[1]!)).toEqual(['sin_fecha', 'sin_importe', 'sin_producto', 'tipo_desconocido']);
  });
});
