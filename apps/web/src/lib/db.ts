/** Filas de la base de datos tal y como llegan de Supabase (NUMERIC llega como string). */
import type { AssetType, TxType } from '@kartera/core';

export type PortfolioGoal =
  | 'largo_plazo' | 'medio_plazo' | 'corto_plazo' | 'colchon' | 'especulativo' | 'plan_pensiones' | 'personalizado';

export interface PortfolioRow {
  id: string;
  nombre: string;
  objetivo: PortfolioGoal;
  objetivo_importe: string | null;
  objetivo_anio: number | null;
  color: string | null;
  orden: number;
  archivada: boolean;
  /** Migración 0004 (puede faltar si aún no se ha ejecutado). */
  aportacion_mensual?: string | null;
  reparto_objetivo?: unknown;
}

export interface AccountRow {
  id: string;
  nombre: string;
  entidad: string | null;
}

export interface AssetRow {
  id: string;
  owner_id: string | null;
  isin: string | null;
  ticker: string | null;
  nombre: string;
  tipo: AssetType;
  moneda: string;
  ter: string | null;
  proveedor: string | null;
  proveedor_id: string | null;
  metadata: Record<string, unknown>;
}

export interface HoldingRow {
  id: string;
  portfolio_id: string;
  account_id: string;
  asset_id: string;
  /** Clase de activo elegida por la persona (migración 0005; puede faltar). */
  clase?: string | null;
  /** TER puesto por la persona (migración 0006; puede faltar). */
  ter?: string | null;
  /** Comisión fija al año en EUR: custodia, mantenimiento… (migración 0008; puede faltar). */
  comision_fija?: string | null;
  asset: AssetRow;
}

/** Valor anotado a mano (migración 0007; la tabla puede faltar). */
export interface ValuationRow {
  id: string;
  holding_id: string;
  fecha: string;
  valor: string;
  aportado: string | null;
  notas: string | null;
}

/** Producto con valor anotado a mano (cuenta, plan de pensiones, depósito…). */
export const isValorAnotado = (asset: Pick<AssetRow, 'proveedor'>) => asset.proveedor === 'anotado';

export interface TxRow {
  id: string;
  holding_id: string;
  tipo: TxType;
  fecha: string;
  cantidad: string;
  precio: string | null;
  importe: string;
  comision: string;
  moneda: string;
  fx_eur: string;
  grupo_id: string | null;
  notas: string | null;
  created_at: string;
}

export const GOAL_LABEL: Record<PortfolioGoal, string> = {
  largo_plazo: 'Largo plazo',
  medio_plazo: 'Medio plazo',
  corto_plazo: 'Corto plazo',
  colchon: 'Colchón',
  especulativo: 'Especulativo',
  plan_pensiones: 'Plan de pensiones',
  personalizado: 'Personalizada',
};

export const GOAL_PRESETS: { objetivo: PortfolioGoal; nombre: string }[] = [
  { objetivo: 'largo_plazo', nombre: 'Largo plazo' },
  { objetivo: 'medio_plazo', nombre: 'Medio plazo' },
  { objetivo: 'corto_plazo', nombre: 'Corto plazo' },
  { objetivo: 'colchon', nombre: 'Colchón' },
  { objetivo: 'especulativo', nombre: 'Especulativo' },
  { objetivo: 'plan_pensiones', nombre: 'Plan de pensiones' },
];

export const BROKERS = ['MyInvestor', 'Trade Republic', 'Banco', 'Exchange cripto', 'Otro'];
