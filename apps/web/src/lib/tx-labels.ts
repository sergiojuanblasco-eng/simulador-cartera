import type { TxType } from '@kartera/core';

export const TX_LABEL: Record<TxType, string> = {
  compra: 'Aportación',
  venta: 'Retirada',
  traspaso_salida: 'Traspaso (salida)',
  traspaso_entrada: 'Traspaso (entrada)',
  dividendo: 'Dividendo',
  comision: 'Comisión',
};

export const TX_TONE: Record<TxType, string> = {
  compra: 'bg-brand-soft text-brand-dark',
  venta: 'bg-warn-bg text-warn-ink',
  traspaso_salida: 'bg-teal-soft text-teal-ink',
  traspaso_entrada: 'bg-teal-soft text-teal-ink',
  dividendo: 'bg-teal-soft text-teal-ink',
  comision: 'bg-subtle text-muted-2',
};
