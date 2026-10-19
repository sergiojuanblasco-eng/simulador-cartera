import type { AssetType } from '@kartera/core';
import type { PortfolioGoal } from '@/lib/db';

/** Lo que se puede llevar con su valor anotado a mano. */
export type SaldoKind = 'cuenta' | 'plan' | 'deposito' | 'otro';

export const SALDO_KINDS: {
  kind: SaldoKind;
  tipo: AssetType;
  label: string;
  sub: string;
  /** ¿Tiene sentido preguntar cuánto llevas aportado? (una cuenta no rinde: no) */
  pideAportado: boolean;
  ejemplo: string;
  /** Cartera que más encaja, si la tienes. */
  carteras: PortfolioGoal[];
}[] = [
  { kind: 'cuenta', tipo: 'efectivo', label: 'Cuenta bancaria', sub: 'Tu colchón o el dinero que tienes en el banco', pideAportado: false, ejemplo: 'Cuenta BBVA', carteras: ['colchon', 'corto_plazo'] },
  { kind: 'plan', tipo: 'plan_pensiones', label: 'Plan de pensiones', sub: 'El del banco o el de tu empresa', pideAportado: true, ejemplo: 'Plan de pensiones del banco', carteras: ['plan_pensiones', 'largo_plazo'] },
  { kind: 'deposito', tipo: 'deposito', label: 'Depósito', sub: 'Dinero a plazo fijo con un interés', pideAportado: true, ejemplo: 'Depósito 12 meses', carteras: ['corto_plazo', 'colchon', 'medio_plazo'] },
  { kind: 'otro', tipo: 'otro', label: 'Otro', sub: 'Seguro de ahorro, fondo sin precio en internet…', pideAportado: true, ejemplo: 'Seguro de ahorro', carteras: ['medio_plazo', 'largo_plazo'] },
];

export const kindOf = (tipo: AssetType): SaldoKind =>
  SALDO_KINDS.find((k) => k.tipo === tipo)?.kind ?? 'otro';

export const pideAportado = (tipo: AssetType) => tipo !== 'efectivo';
