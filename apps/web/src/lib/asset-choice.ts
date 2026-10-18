import type { AssetType } from '@kartera/core';

/** Producto elegido en el buscador (compartido entre cliente y servidor). */
export type AssetChoice =
  | { kind: 'local'; id: string; nombre: string; detalle?: string }
  | {
      kind: 'external';
      proveedor: 'eodhd' | 'coingecko';
      proveedorId: string;
      nombre: string;
      isin: string | null;
      ticker: string | null;
      tipo: AssetType;
      moneda: string;
      detalle?: string;
    }
  | { kind: 'manual'; nombre: string; tipo: AssetType; ter: number | null; isin?: string | null };

export interface SearchResult {
  choice: AssetChoice;
  nombre: string;
  detalle: string;
}

export const ASSET_TYPE_OPTIONS: { value: AssetType; label: string }[] = [
  { value: 'fondo', label: 'Fondo de inversión' },
  { value: 'etf', label: 'ETF' },
  { value: 'accion', label: 'Acción' },
  { value: 'cripto', label: 'Cripto' },
  { value: 'monetario', label: 'Fondo monetario' },
  { value: 'plan_pensiones', label: 'Plan de pensiones' },
  { value: 'efectivo', label: 'Efectivo / cuenta remunerada' },
  { value: 'otro', label: 'Otro' },
];
