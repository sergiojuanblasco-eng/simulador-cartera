/**
 * Reconoce criptomonedas en extractos y productos propios.
 * Código puro (navegador y servidor).
 *
 * Trade Republic exporta las cripto con `asset_class = CRYPTO` y el ticker en `symbol`
 * (BTC, ETH…). En algunos documentos usa un pseudo-ISIN tipo XF000BTC0017.
 * Un ETP de Bitcoin (con ISIN real, p. ej. CH0454664001) NO es cripto directa:
 * cotiza como un ETF y tiene su propio precio, así que no se toca.
 */

/** Ticker → id de CoinGecko (las más habituales en brókeres europeos). */
export const CRYPTO_IDS: Record<string, string> = {
  BTC: 'bitcoin', XBT: 'bitcoin', ETH: 'ethereum', SOL: 'solana', XRP: 'ripple', ADA: 'cardano',
  DOGE: 'dogecoin', DOT: 'polkadot', LTC: 'litecoin', LINK: 'chainlink', AVAX: 'avalanche-2',
  MATIC: 'matic-network', POL: 'polygon-ecosystem-token', BNB: 'binancecoin', TRX: 'tron', XLM: 'stellar',
  BCH: 'bitcoin-cash', UNI: 'uniswap', ATOM: 'cosmos', SHIB: 'shiba-inu', ETC: 'ethereum-classic',
  ALGO: 'algorand', NEAR: 'near', AAVE: 'aave', SUI: 'sui', PEPE: 'pepe', XTZ: 'tezos', USDC: 'usd-coin',
  USDT: 'tether', TON: 'the-open-network', APT: 'aptos', ARB: 'arbitrum', OP: 'optimism', HBAR: 'hedera-hashgraph',
  ICP: 'internet-computer', FIL: 'filecoin', CRO: 'crypto-com-chain', MKR: 'maker', GRT: 'the-graph',
  EGLD: 'elrond-erd-2', MANA: 'decentraland', SAND: 'the-sandbox', INJ: 'injective-protocol', RNDR: 'render-token',
  RENDER: 'render-token', IOTA: 'iota', XMR: 'monero', EOS: 'eos', VET: 'vechain', THETA: 'theta-token',
};

/** Nombre normalizado → ticker. */
const NAMES: Record<string, string> = {
  bitcoin: 'BTC', ethereum: 'ETH', ether: 'ETH', solana: 'SOL', ripple: 'XRP', xrp: 'XRP', cardano: 'ADA',
  dogecoin: 'DOGE', polkadot: 'DOT', litecoin: 'LTC', chainlink: 'LINK', avalanche: 'AVAX', polygon: 'POL',
  'bnb': 'BNB', 'binance coin': 'BNB', tron: 'TRX', stellar: 'XLM', 'bitcoin cash': 'BCH', uniswap: 'UNI',
  cosmos: 'ATOM', 'shiba inu': 'SHIB', 'ethereum classic': 'ETC', algorand: 'ALGO', 'near protocol': 'NEAR',
  aave: 'AAVE', sui: 'SUI', pepe: 'PEPE', tezos: 'XTZ', toncoin: 'TON', aptos: 'APT', arbitrum: 'ARB',
  optimism: 'OP', hedera: 'HBAR', 'internet computer': 'ICP', filecoin: 'FIL', monero: 'XMR', iota: 'IOTA',
};

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();

/** Palabras que indican un producto cotizado (ETP/ETN/fondo) aunque se llame «Bitcoin…». */
const WRAPPER = /\b(etp|etn|etc|etf|ucits|fund|fondo|trust|shares|physical|core|index|indice|acc|dist)\b/i;

export interface CryptoHint {
  /** Ticker en mayúsculas (BTC). */
  symbol: string;
  /** Id de CoinGecko si lo conocemos. */
  coingeckoId: string | null;
}

/** Ticker de un pseudo-ISIN de Trade Republic (XF000BTC0017 → BTC). */
export function tickerFromPseudoIsin(isin: string | null | undefined): string | null {
  const m = (isin ?? '').toUpperCase().match(/^XF000([A-Z]{2,6}?)\d{2,5}$/);
  return m ? m[1]! : null;
}

/**
 * ¿Es una criptomoneda directa? Usa (por orden) la clase de activo del extracto,
 * el pseudo-ISIN, el ticker y el nombre.
 */
export function detectCrypto(p: { isin?: string | null; ticker?: string | null; nombre?: string | null; clase?: string | null }): CryptoHint | null {
  const clase = norm(p.clase ?? '');
  const isCryptoClass = /crypto|cripto/.test(clase);
  const fromIsin = tickerFromPseudoIsin(p.isin);
  // Un ISIN real (no XF000…) es un producto cotizado: nunca cripto directa.
  if (p.isin && !fromIsin && !isCryptoClass) return null;

  const ticker = (p.ticker ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const nombre = norm(p.nombre ?? '');
  const byName = NAMES[nombre] ?? NAMES[nombre.replace(/ [a-z]{2,6}$/, '')] ?? null; // «bitcoin btc»
  const nameIsTicker = /^[a-z0-9]{2,6}$/.test(nombre) && CRYPTO_IDS[nombre.toUpperCase()] ? nombre.toUpperCase() : null;

  const symbol = fromIsin ?? (ticker && (CRYPTO_IDS[ticker] || isCryptoClass) ? ticker : null) ?? byName ?? nameIsTicker;
  if (!symbol) {
    if (isCryptoClass && nombre) return { symbol: (ticker || nombre.slice(0, 10)).toUpperCase(), coingeckoId: null };
    return null;
  }
  // Por nombre solo si no parece un ETP («21Shares Bitcoin ETP»).
  if (!isCryptoClass && !fromIsin && !CRYPTO_IDS[ticker] && WRAPPER.test(p.nombre ?? '')) return null;
  return { symbol, coingeckoId: CRYPTO_IDS[symbol] ?? null };
}

/** Tipo de producto a partir de la clase de activo del extracto y del nombre. */
export function guessAssetType(p: { clase?: string | null; nombre?: string | null }):
  'fondo' | 'etf' | 'accion' | 'cripto' | 'monetario' | 'plan_pensiones' | 'efectivo' | 'otro' | null {
  const c = norm(p.clase ?? '');
  const n = norm(p.nombre ?? '');
  if (/crypto|cripto/.test(c)) return 'cripto';
  if (/stock|share|equity|accion/.test(c)) return 'accion';
  if (/bond|bono|renta fija/.test(c)) return 'otro';
  if (/pension/.test(n)) return 'plan_pensiones';
  if (/monetari|money market|liquidity|\bcash\b/.test(n) && !/etf/.test(n)) return 'monetario';
  if (/\betf\b|ucits etf|\betc\b|\betp\b/.test(n)) return 'etf';
  if (/etf|etp/.test(c)) return 'etf';
  if (/fund|fondo/.test(c)) return 'fondo';
  return null;
}
