import { describe, expect, it } from 'vitest';
import { parseEsNumber } from '@/lib/format';
import { detectCrypto, guessAssetType } from '@/lib/crypto';
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
    const out = normalizeRows([['2026-01-01', 'X', '-3', '30']], { fecha: 0, producto: 1, cantidad: 2, importe: 3, isin: -1, tipo: -1, precio: -1, comision: -1, moneda: -1, clase: -1 });
    expect(out[0]!.tipo).toBe('venta');
  });
});

describe('Trade Republic (exportación CSV de transacciones)', () => {
  const header = ['datetime', 'date', 'account_type', 'category', 'type', 'asset_class', 'name', 'symbol', 'shares', 'price', 'amount', 'fee', 'tax', 'currency',
    'original_amount', 'original_currency', 'fx_rate', 'description', 'transaction_id', 'counterparty_name', 'counterparty_iban', 'payment_reference', 'mcc_code'];
  const data = [
    ['2026-01-02T10:00:00Z', '2026-01-02', 'DEFAULT', 'TRADING', 'BUY', 'FUND', 'iShares Core MSCI World', 'IE00B4L5Y983', '2.5', '100.00', '-250.00', '-1.00', '', 'EUR'],
    ['2026-01-02T08:00:00Z', '2026-01-02', 'DEFAULT', 'TRADING', 'SAVINGS_PLAN', 'FUND', 'Vanguard FTSE All-World', 'IE00BK5BQT80', '0.8', '125.00', '-100.00', '', '', 'EUR'],
    ['2026-01-03T09:00:00Z', '2026-01-03', 'DEFAULT', 'TRADING', 'BUY', 'CRYPTO', 'Bitcoin', 'BTC', '0.001', '90000', '-90.00', '-1.00', '', 'EUR'],
    ['2026-01-04T12:00:00Z', '2026-01-04', 'DEFAULT', 'CASH', 'CARD_TRANSACTION', '', 'Mercadona', '', '', '', '-53.06', '', '', 'EUR'],
    ['2026-01-05T12:00:00Z', '2026-01-05', 'DEFAULT', 'CASH', 'CARD_ORDERING_FEE', '', '', '', '', '', '0', '-5.00', '', 'EUR'],
    ['2026-02-01T12:00:00Z', '2026-02-01', 'DEFAULT', 'TRADING', 'SELL', 'FUND', 'iShares Core MSCI World', 'IE00B4L5Y983', '-1', '110.00', '110.00', '-1.00', '', 'EUR'],
  ];

  it('extracto real (anonimizado): transferencias fuera, fondos y bitcoin dentro', () => {
    const real = [
      ['2026-10-04T18:21:42.738419Z', '2026-10-04', 'DEFAULT', 'CASH', 'TRANSFER_INSTANT_INBOUND', '', 'TITULAR', '', '', '', '6350.000000', '', '', 'EUR', '', '', '', 'Incoming transfer', 'id1', 'TITULAR', 'ES00', '', ''],
      ['2026-10-05T15:21:33.595Z', '2026-10-05', 'DEFAULT', 'TRADING', 'BUY', 'FUND', 'Physical Gold USD (Acc)', 'IE00B4ND3602', '17.3231650000', '71.4700000000', '-1238.09', '-1.00', '', 'EUR', '', '', '', 'Buy trade IE00B4ND3602', 'id2', '', '', '', ''],
      ['2026-10-05T15:23:51.779Z', '2026-10-05', 'DEFAULT', 'TRADING', 'BUY', 'CRYPTO', 'Bitcoin', 'BTC', '0.0085330000', '77228.6400000000', '-658.99', '-1.00', '', 'EUR', '', '', '', 'Buy trade XF000BTC0017 Bitcoin', 'id3', '', '', '', ''],
      ['2026-10-08T03:30:16.967Z', '2026-10-07', 'DEFAULT', 'TRADING', 'BUY', 'MUTUAL_FUND', 'Fidelity MSCI World Index P EUR Acc', 'IE00BYX5NX33', '170.9395810000', '14.6948000000', '-2511.92', '-1.00', '', 'EUR', '', '', '', 'Buy trade IE00BYX5NX33', 'id4', '', '', '', ''],
    ];
    const out = normalizeRows(real, autoMap(header, real), 2);
    expect(rowIssues(out[0]!)).toEqual(['no_inversion']);
    expect(out[1]).toMatchObject({ fecha: '2026-10-05', isin: 'IE00B4ND3602', tipo: 'compra', importe: 1238.09, cantidad: 17.323165, comision: 1 });
    expect(out[2]).toMatchObject({ ticker: 'BTC', clase: 'CRYPTO', importe: 658.99, cantidad: 0.008533 });
    expect(out[3]).toMatchObject({ fecha: '2026-10-07', isin: 'IE00BYX5NX33', importe: 2511.92 });
  });

  it('reconoce el ISIN en «symbol» y el resto de columnas sin ayuda', () => {
    const m = autoMap(header, data);
    expect(m).toMatchObject({ fecha: 1, tipo: 4, clase: 5, producto: 6, isin: 7, cantidad: 8, precio: 9, importe: 10, comision: 11, moneda: 13 });
  });

  it('normaliza compras, plan de inversión, cripto y venta; ignora los movimientos de cuenta', () => {
    const out = normalizeRows(data, autoMap(header, data), 2);
    expect(out[0]).toMatchObject({ isin: 'IE00B4L5Y983', tipo: 'compra', importe: 250, comision: 1, cantidad: 2.5 });
    expect(out[1]).toMatchObject({ tipo: 'compra', importe: 100 });
    expect(out[2]).toMatchObject({ isin: null, ticker: 'BTC', clase: 'CRYPTO', producto: 'Bitcoin', tipo: 'compra' });
    expect(rowIssues(out[2]!)).toEqual([]);
    expect(rowIssues(out[3]!)).toEqual(['no_inversion']);
    expect(rowIssues(out[4]!)).toEqual(['no_inversion']);
    expect(out[5]).toMatchObject({ tipo: 'venta', cantidad: 1, importe: 110, comision: 1 });
  });

  it('encuentra la columna del ISIN por su contenido aunque se llame raro', () => {
    const m = autoMap(['Fecha', 'Producto', 'Código', 'Importe'], [['01/01/2026', 'Fondo', 'IE00B4L5Y983', '10'], ['02/01/2026', 'Fondo', 'IE00B4L5Y983', '20']]);
    expect(m.isin).toBe(2);
  });
});

describe('cripto', () => {
  it('detecta cripto directa y no confunde los ETP', () => {
    expect(detectCrypto({ nombre: 'Bitcoin' })).toEqual({ symbol: 'BTC', coingeckoId: 'bitcoin' });
    expect(detectCrypto({ nombre: 'Bitcoin (BTC)' })?.coingeckoId).toBe('bitcoin');
    expect(detectCrypto({ isin: 'XF000BTC0017', nombre: 'Bitcoin' })?.symbol).toBe('BTC');
    expect(detectCrypto({ ticker: 'ETH', clase: 'CRYPTO', nombre: 'Ethereum' })?.coingeckoId).toBe('ethereum');
    expect(detectCrypto({ ticker: 'XYZ', clase: 'CRYPTO', nombre: 'Rara' })).toEqual({ symbol: 'XYZ', coingeckoId: null });
    expect(detectCrypto({ isin: 'CH0454664001', nombre: '21Shares Bitcoin ETP' })).toBeNull();
    expect(detectCrypto({ nombre: 'WisdomTree Physical Bitcoin' })).toBeNull();
    expect(detectCrypto({ isin: 'IE00B4L5Y983', nombre: 'iShares Core MSCI World' })).toBeNull();
    expect(detectCrypto({ nombre: 'Fidelity MSCI World' })).toBeNull();
  });

  it('deduce el tipo de producto', () => {
    expect(guessAssetType({ clase: 'STOCK', nombre: 'Apple' })).toBe('accion');
    expect(guessAssetType({ clase: 'FUND', nombre: 'iShares Core MSCI World UCITS ETF' })).toBe('etf');
    expect(guessAssetType({ clase: 'Fondo', nombre: 'Fidelity MSCI World' })).toBe('fondo');
    expect(guessAssetType({ nombre: 'Plan de pensiones Indexa' })).toBe('plan_pensiones');
    // Etiquetas reales del extracto de Trade Republic
    expect(guessAssetType({ clase: 'FUND', nombre: 'Physical Gold USD (Acc)' })).toBe('etf');
    expect(guessAssetType({ clase: 'MUTUAL_FUND', nombre: 'Vanguard Global Bond Index EUR Hedged Acc' })).toBe('fondo');
    expect(guessAssetType({ clase: 'MUTUAL_FUND', nombre: 'Groupama Tresorerie NC' })).toBe('monetario');
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
