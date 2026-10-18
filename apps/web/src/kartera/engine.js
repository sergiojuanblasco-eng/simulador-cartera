/**
 * Motor del simulador de Kartera (rentabilidades históricas por ventanas móviles).
 * Extraído de Tools.jsx para poder usarlo también en el servidor y en tests.
 */
import ASSETS from "./data/assets.json";
import R from "./data/returns.json";

export function gY(id){const d=R[id];return d?Object.keys(d).map(Number).sort((a,b)=>a-b):[];}
export function pc(a,p){if(!a.length)return null;const i=(p/100)*(a.length-1);const l=Math.floor(i),h=Math.ceil(i);return l===h?a[l]:a[l]+(a[h]-a[l])*(i-l);}
export function cP(ini,mo,yrs,rate){const mr=rate/100/12;const d=[{y:0,v:ini,inv:ini}];let v=ini,inv=ini;for(let y=1;y<=yrs;y++){for(let m=0;m<12;m++){v=v*(1+mr)+mo;inv+=mo;}d.push({y,v,inv});}return d;}

export function capExtremeReturn(ret, asset) {
  if (!asset.uf) return ret;
  let r = ret;
  if (r > 100) r = 65 + (r - 100) * 0.1;
  else if (r > 50) r = 50 + (r - 50) * 0.3;
  return r;
}

export function getPortfolioAnnualReturns(selectedIds, normalizedWeights) {
  const allYearsSet = new Set();
  selectedIds.forEach(id => gY(id).forEach(y => allYearsSet.add(y)));
  const allYears = [...allYearsSet].sort((a, b) => a - b);
  if (allYears.length === 0) return [];
  return allYears.map(year => {
    const available = selectedIds.filter(id => R[id] && R[id][year] !== undefined);
    if (available.length === 0) return null;
    const totalAvailWeight = available.reduce((s, id) => s + (normalizedWeights[id] || 0), 0);
    if (totalAvailWeight === 0) return null;
    let portRet = 0;
    available.forEach(id => {
      const reW = (normalizedWeights[id] || 0) / totalAvailWeight;
      const asset = ASSETS.find(a => a.id === id);
      let r = R[id][year];
      if (asset) r = capExtremeReturn(r, asset);
      portRet += reW * r;
    });
    return { year, ret: portRet };
  }).filter(Boolean);
}

export function getPortfolioRollingCAGR(annualReturns, horizon) {
  if (horizon < 1 || annualReturns.length < horizon) return [];
  const cagrs = [];
  for (let i = 0; i <= annualReturns.length - horizon; i++) {
    let cum = 1;
    for (let j = 0; j < horizon; j++) cum *= (1 + annualReturns[i + j].ret / 100);
    cagrs.push((Math.pow(cum, 1 / horizon) - 1) * 100);
  }
  return cagrs.sort((a, b) => a - b);
}

export function computePortfolioScenarios(selectedIds, normalizedWeights, horizon) {
  const activeIds = selectedIds.filter(id => (normalizedWeights[id] || 0) > 0);
  if (activeIds.length === 0) return null;
  const annualRets = getPortfolioAnnualReturns(activeIds, normalizedWeights);
  const numYears = annualRets.length;
  if (numYears < 2) return null;

  // Try requested horizon first; if not enough, find max usable horizon
  let usedHorizon = horizon;
  let rollingCAGRs = getPortfolioRollingCAGR(annualRets, horizon);
  let projected = false;

  if (rollingCAGRs.length === 0) {
    // Find largest horizon that gives at least 1 window
    for (let h = numYears; h >= 1; h--) {
      const test = getPortfolioRollingCAGR(annualRets, h);
      if (test.length > 0) { rollingCAGRs = test; usedHorizon = h; projected = true; break; }
    }
    if (rollingCAGRs.length === 0) return null;
  }

  const rawP = pc(rollingCAGRs, 10), rawE = pc(rollingCAGRs, 50), rawO = pc(rollingCAGRs, 90);
  const negCount = rollingCAGRs.filter(c => c < 0).length;
  const rawProbLoss = negCount / rollingCAGRs.length;
  const probLossDisplay = rawProbLoss === 0 ? "< 1%" : Math.round(rawProbLoss * 100) + "%";
  const probLossNum = Math.round(rawProbLoss * 100);

  const p10val = pc(rollingCAGRs, 10), p90val = pc(rollingCAGRs, 90);
  const pessCount = rollingCAGRs.filter(c => c <= p10val).length;
  const optCount = rollingCAGRs.filter(c => c >= p90val).length;
  const probPess = Math.round((pessCount / rollingCAGRs.length) * 100);
  const probOpt = Math.round((optCount / rollingCAGRs.length) * 100);

  return {
    p: rawP, e: rawE, o: rawO,
    probLossDisplay, probLossNum,
    probPess, probEsp: 100 - probPess - probOpt, probOpt,
    worstCase: rollingCAGRs[0],
    dataYears: numYears,
    rollingCount: rollingCAGRs.length,
    fewWindows: rollingCAGRs.length < 10,
    projected, usedHorizon,
  };
}


/**
 * Datos de una simulación (cartera + importes + horizonte) para rellenar los textos:
 * así los textos nunca contradicen lo que calcula el simulador.
 */
export function simFacts(cfg) {
  const ids = cfg.assets.map((a) => a.id);
  const total = cfg.assets.reduce((s, a) => s + a.weight, 0) || 1;
  const nW = Object.fromEntries(cfg.assets.map((a) => [a.id, (a.weight / total) * 100]));
  const sc = computePortfolioScenarios(ids, nW, cfg.horizon);
  if (!sc) return null;
  const annual = getPortfolioAnnualReturns(ids, nW);
  const worstYear = annual.reduce((w, y) => (y.ret < w.ret ? y : w), annual[0]);
  const fin = (rate) => cP(cfg.initial, cfg.monthly, cfg.horizon, rate).at(-1).v;
  const invertido = cfg.initial + cfg.monthly * 12 * cfg.horizon;
  const round1000 = (n) => Math.round(n / 1000) * 1000;
  const fmtEur = (n) => n.toLocaleString("es-ES") + " €";
  const fmtPct = (n) => (n >= 0 ? "+" : "") + n.toFixed(1).replace(".", ",") + " %";
  const years = annual.map((y) => y.year);
  const facts = {
    inicial: fmtEur(cfg.initial),
    mensual: fmtEur(cfg.monthly),
    invertido: fmtEur(invertido),
    pesimista_eur: fmtEur(round1000(fin(sc.p))),
    esperado_eur: fmtEur(round1000(fin(sc.e))),
    optimista_eur: fmtEur(round1000(fin(sc.o))),
    pesimista_pct: fmtPct(sc.p),
    esperado_pct: fmtPct(sc.e),
    optimista_pct: fmtPct(sc.o),
    prob_perdida: sc.probLossDisplay.replace("%", " %"),
    peor_ventana_pct: fmtPct(sc.worstCase),
    peor_anio_pct: fmtPct(worstYear.ret),
    peor_anio: String(worstYear.year),
    horizonte: String(cfg.horizon),
    desde: String(years[0]),
    hasta: String(years.at(-1)),
    ventanas: String(sc.rollingCount),
  };
  for (const y of annual) facts["ret_" + y.year] = fmtPct(y.ret);

  // Datos de cada activo de la cartera (rentabilidad anual compuesta, peor año, etc.)
  const cagr = (id, from, to) => {
    const d = R[id];
    let c = 1, n = 0;
    for (let y = from; y <= to; y++) if (d[y] !== undefined) { c *= 1 + d[y] / 100; n++; }
    return n ? (Math.pow(c, 1 / n) - 1) * 100 : 0;
  };
  for (const id of ids) {
    const ys = gY(id);
    if (!ys.length) continue;
    const first = ys[0], last = ys.at(-1);
    facts["desde_" + id] = String(first);
    facts["cagr_" + id] = fmtPct(cagr(id, first, last));
    facts["cagr15_" + id] = fmtPct(cagr(id, last - 14, last));
    facts["cagr_2000s_" + id] = fmtPct(cagr(id, 2000, 2009));
    const worst = ys.reduce((w, y) => (R[id][y] < R[id][w] ? y : w), first);
    facts["peor_" + id] = fmtPct(R[id][worst]);
    facts["peor_anio_" + id] = String(worst);
    for (const y of ys) facts["ret_" + y + "_" + id] = fmtPct(R[id][y]);
  }

  // Cartera de comparación (p. ej. la misma sin Bitcoin): claves con prefijo "sin_"
  if (cfg.compare) {
    const c = simFacts({ ...cfg, assets: cfg.compare, compare: undefined });
    if (c) for (const k of ["pesimista_pct", "esperado_pct", "optimista_pct", "prob_perdida", "pesimista_eur", "esperado_eur", "optimista_eur"]) facts["sin_" + k] = c[k];
  }
  return facts;
}

/** Sustituye {clave} por su valor en un texto. */
export function fillFacts(text, facts) {
  if (!text || !facts) return text;
  return text.replace(/\{([a-z0-9_]+)\}/g, (m, k) => (k in facts ? facts[k] : m));
}

/** Rellena todos los textos {es, en} de un objeto (p. ej. una simulación) con sus cifras. */
export function fillDeep(obj, facts) {
  if (typeof obj === "string") return fillFacts(obj, facts);
  if (Array.isArray(obj)) return obj.map((x) => fillDeep(x, facts));
  if (obj && typeof obj === "object") return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, fillDeep(v, facts)]));
  return obj;
}

/** Simulación con los textos ya rellenos con las cifras del simulador. */
export function filledSim(sim) {
  return sim ? fillDeep(sim, simFacts(sim)) : sim;
}
