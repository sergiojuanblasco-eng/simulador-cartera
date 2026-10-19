/**
 * Clase de activo de cada producto (renta variable, renta fija, monetario…).
 * Se deduce sola y cada persona puede corregirla en la ficha (se guarda en su posición).
 */
import { CLASE_LABEL, CLASES, type AssetType, type Clase } from '@kartera/core';
import { guessProxy } from '@/lib/plan';

export const CLASE_OPTIONS = CLASES.map((c) => ({ value: c, label: CLASE_LABEL[c]! }));
export const isClase = (v: unknown): v is Clase => typeof v === 'string' && (CLASES as readonly string[]).includes(v);

const PROXY_CLASE: Record<string, Clase> = {
  us_bond: 'rf', bond_global: 'rf', cash: 'monetario', gold: 'materias_primas', commodities: 'materias_primas',
  btc: 'cripto', eth: 'cripto', reits: 'inmobiliario',
};

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Clase de activo deducida del nombre, el ISIN y el vehículo. */
export function detectClase(a: { nombre: string; isin?: string | null; tipo: AssetType }): Clase {
  const n = norm(a.nombre);
  if (a.tipo === 'cripto') return 'cripto';
  if (a.tipo === 'efectivo' || a.tipo === 'monetario' || a.tipo === 'deposito') return 'monetario';
  if (/mixto|mixed|balanced|equilibrad|multi.?asset|multiactivo|lifestrategy|life strategy|perfilad|\b\d{2}\s?\/\s?\d{2}\b/.test(n)) return 'mixto';
  if (/socimi|inmobiliari|real estate|\breit/.test(n)) return 'inmobiliario';
  if (a.tipo === 'accion') return 'rv';
  if (a.tipo === 'plan_pensiones') {
    if (/renta variable|acciones|equity|bolsa|global stock|msci|s&p/.test(n)) return 'rv';
    if (/renta fija|bonos|bond|deuda/.test(n)) return 'rf';
    return 'mixto';
  }
  const proxy = guessProxy({ nombre: a.nombre, isin: a.isin ?? null, tipo: a.tipo });
  return PROXY_CLASE[proxy.id] ?? (proxy.aproximado ? 'otros' : 'rv');
}

/** Clase efectiva: la que eligió la persona o, si no, la deducida. */
export function claseOf(holdingClase: unknown, asset: { nombre: string; isin?: string | null; tipo: AssetType }): Clase {
  return isClase(holdingClase) ? holdingClase : detectClase(asset);
}
