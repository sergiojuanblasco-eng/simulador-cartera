/**
 * Plan de una cartera: reparto objetivo + aportación mensual + simulación.
 * Código puro (servidor y navegador).
 */
import type { AssetType } from '@kartera/core';
import type { PortfolioGoal } from '@/lib/db';
import SIM_ASSETS from '@/kartera/data/assets.json';
import { cP, getPortfolioAnnualReturns, getPortfolioRollingCAGR, pc } from '@/kartera/engine';

// ---------------------------------------------------------------------------- Tipos

export interface PlanItem {
  assetId: string;
  /** Porcentaje objetivo (0–100). */
  pct: number;
  /** Activo del simulador con el que se simula (msci_world, gold…). */
  proxy: string | null;
}

/** Lee y valida el reparto guardado (jsonb). */
export function parsePlan(raw: unknown): PlanItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
    .map((x) => ({
      assetId: String(x.assetId ?? ''),
      pct: Number(x.pct),
      proxy: typeof x.proxy === 'string' && PROXY_IDS.has(x.proxy) ? x.proxy : null,
    }))
    .filter((x) => /^[0-9a-f-]{36}$/i.test(x.assetId) && Number.isFinite(x.pct) && x.pct > 0 && x.pct <= 100);
}

// ---------------------------------------------------------------------------- Horizonte

/** Años de simulación según el objetivo de la cartera (o el año meta si lo hay). */
export function defaultHorizon(objetivo: PortfolioGoal, objetivoAnio: number | null, thisYear: number): number {
  if (objetivoAnio && objetivoAnio > thisYear) return Math.min(40, objetivoAnio - thisYear);
  switch (objetivo) {
    case 'colchon': return 1;
    case 'corto_plazo': return 2;
    case 'medio_plazo': return 5;
    case 'especulativo': return 5;
    case 'largo_plazo': return 15;
    case 'plan_pensiones': return 25;
    default: return 10;
  }
}

export const GOAL_HORIZON_TEXT: Record<PortfolioGoal, string> = {
  colchon: 'Dinero que debe estar disponible: mejor monetario o cuenta remunerada',
  corto_plazo: 'Menos de 3 años',
  medio_plazo: 'Entre 3 y 10 años',
  largo_plazo: 'Más de 10 años',
  especulativo: 'Sin plazo: asume que puedes perderlo',
  plan_pensiones: 'Hasta tu jubilación',
  personalizado: 'Tú decides el plazo',
};

// ---------------------------------------------------------------------------- Simulador

type SimAsset = { id: string; name: { es: string } };
export const PROXY_OPTIONS = (SIM_ASSETS as SimAsset[]).map((a) => ({ id: a.id, label: a.name.es }));
const PROXY_IDS = new Set(PROXY_OPTIONS.map((p) => p.id));
export const proxyLabel = (id: string | null) => PROXY_OPTIONS.find((p) => p.id === id)?.label ?? '—';

const KNOWN_ISIN: Record<string, string> = {
  IE00BYX5NX33: 'msci_world', IE00B4L5Y983: 'msci_world', IE00B03HCZ61: 'msci_world', IE00BFY0GT14: 'msci_world',
  LU0996182563: 'msci_world', IE00BD4TXV59: 'msci_world', IE00B0M62Q58: 'msci_world', IE00BJ0KDQ92: 'msci_world',
  IE00BK5BQT80: 'msci_acwi', IE00B3RBWM25: 'msci_acwi', IE00B6R52259: 'msci_acwi',
  IE00B5BMR087: 'sp500', IE00B3XXRP09: 'sp500', IE00BFMXXD54: 'sp500', IE0032126645: 'sp500', LU0996179007: 'sp500',
  IE00B53SZB19: 'nasdaq', IE0032077012: 'nasdaq',
  IE0031786696: 'msci_em', IE00BKM4GZ66: 'msci_em', IE00B3VVMM84: 'msci_em', LU0996177134: 'msci_em',
  IE00B42W4L06: 'small_caps', IE00BF4RFH31: 'small_caps',
  IE00BM67HT60: 'tech_global', IE00B3WJKG14: 'tech_global',
  IE00B18GC888: 'bond_global', IE00BDBRDM35: 'bond_global', IE00B3F81409: 'bond_global',
  IE00B4ND3602: 'gold', IE00B579F325: 'gold', DE000A0S9GB0: 'gold', JE00B1VS3770: 'gold',
  FR0013314234: 'cash', FR0000447823: 'cash', LU0290358497: 'cash',
};

/** Con qué activo del simulador se parece más un producto. `aproximado` = no estamos seguros. */
export function guessProxy(p: { nombre: string; isin?: string | null; tipo: AssetType }): { id: string; aproximado: boolean } {
  if (p.isin && KNOWN_ISIN[p.isin]) return { id: KNOWN_ISIN[p.isin]!, aproximado: false };
  const n = p.nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const rule = (id: string) => ({ id, aproximado: false });
  if (p.tipo === 'cripto') return /ether/.test(n) ? rule('eth') : { id: 'btc', aproximado: !/bitcoin|btc/.test(n) };
  if (p.tipo === 'efectivo' || p.tipo === 'monetario' || /monetari|money market|tresorer|tesorer|liquidit/.test(n)) return rule('cash');
  if (/\bgold\b|\boro\b/.test(n)) return rule('gold');
  if (/emerg/.test(n)) return rule('msci_em');
  if (/small.?cap|pequenas/.test(n)) return rule('small_caps');
  if (/information technology|\btecnolog|\btech\b|\bit\b/.test(n)) return rule('tech_global');
  if (/artificial intelligence|\bai\b|robot/.test(n)) return rule('ai_tech');
  if (/nasdaq/.test(n)) return rule('nasdaq');
  if (/s&p ?500|sp ?500|\bs&p\b|us 500|usa 500/.test(n)) return rule('sp500');
  if (/acwi|all.world|all country|global all cap|global stock|todo el mundo/.test(n)) return rule('msci_acwi');
  if (/treasury|tesoro (ee|usa)/.test(n)) return rule('us_bond');
  if (/bond|bono|renta fija|aggregate|govt|government|deuda|fixed income/.test(n)) return rule('bond_global');
  if (/europe|europa|stoxx|eurozone|euro area/.test(n)) return rule('stoxx600');
  if (/japan|japon/.test(n)) return rule('japan');
  if (/china/.test(n)) return rule('china');
  if (/india/.test(n)) return rule('india');
  if (/reit|real estate|inmobiliari|property/.test(n)) return rule('reits');
  if (/commodit|materias primas/.test(n)) return rule('commodities');
  if (/clean energy|energia limpia|renewable/.test(n)) return rule('clean_energy');
  if (/energy|energia/.test(n)) return rule('energy');
  if (/health|salud|pharma/.test(n)) return rule('healthcare');
  for (const [k, id] of [['apple', 'apple'], ['nvidia', 'nvidia'], ['microsoft', 'microsoft'], ['tesla', 'tesla'], ['amazon', 'amazon'],
    ['alphabet', 'google'], ['google', 'google'], ['coca', 'coca_cola'], ['meta platforms', 'meta']] as const) {
    if (n.includes(k)) return rule(id);
  }
  if (/msci world|\bworld\b|mundial|global|developed|desarrollad/.test(n)) return rule('msci_world');
  return { id: 'msci_world', aproximado: true };
}

// ---------------------------------------------------------------------------- Simulación del plan

export interface PlanSimulation {
  years: number;
  invertido: number;
  pesimista: number;
  esperado: number;
  optimista: number;
  probPerdida: number;
  /** Probabilidad histórica de llegar a la meta (0–1), si hay meta. */
  probMeta: number | null;
  ventanas: number;
  desde: number;
  hasta: number;
  /** El horizonte es más largo que la historia disponible: se usó el mayor posible. */
  recortado: number | null;
}

/** Simula el plan con los datos históricos del simulador (ventanas móviles de `years` años). */
export function simulatePlan(p: { weights: Record<string, number>; initial: number; monthly: number; years: number; goal?: number | null }): PlanSimulation | null {
  const ids = Object.keys(p.weights).filter((id) => p.weights[id]! > 0 && PROXY_IDS.has(id));
  if (!ids.length || p.years < 1) return null;
  const total = ids.reduce((a, id) => a + p.weights[id]!, 0);
  const nW = Object.fromEntries(ids.map((id) => [id, (p.weights[id]! / total) * 100]));
  const annual = getPortfolioAnnualReturns(ids, nW) as { year: number; ret: number }[];
  if (annual.length < 2) return null;
  let h = Math.round(p.years);
  let cagrs = getPortfolioRollingCAGR(annual, h) as number[];
  let recortado: number | null = null;
  if (!cagrs.length) {
    recortado = annual.length;
    h = annual.length;
    cagrs = getPortfolioRollingCAGR(annual, h) as number[];
  }
  const years = Math.round(p.years);
  const fv = (rate: number) => (cP(p.initial, p.monthly, years, rate) as { v: number }[]).at(-1)!.v;
  return {
    years,
    invertido: p.initial + p.monthly * 12 * years,
    pesimista: fv(pc(cagrs, 10)),
    esperado: fv(pc(cagrs, 50)),
    optimista: fv(pc(cagrs, 90)),
    probPerdida: cagrs.filter((c) => c < 0).length / cagrs.length,
    probMeta: p.goal && p.goal > 0 ? cagrs.filter((c) => fv(c) >= p.goal!).length / cagrs.length : null,
    ventanas: cagrs.length,
    desde: annual[0]!.year,
    hasta: annual.at(-1)!.year,
    recortado,
  };
}
