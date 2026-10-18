/**
 * TER (gastos corrientes) de productos habituales, para cuando el proveedor de datos no lo da
 * (EODHD no publica el TER de los fondos europeos). Fracción: 0.0012 = 0,12 %.
 *
 * Comprobado en octubre de 2026 en la web de la gestora, KIID o Finect/justETF/R4.
 * Si cambia, se actualiza aquí; cada persona puede poner además su propio TER en la ficha.
 */
export const TER_CATALOG: Record<string, { ter: number; nota?: string }> = {
  // Fondos indexados
  IE00BYX5NX33: { ter: 0.0010, nota: 'Fidelity MSCI World Index P EUR Acc (gastos corrientes 0,10 %)' },
  IE0031786696: { ter: 0.0023, nota: 'Vanguard Emerging Markets Stock Index EUR Acc' },
  IE00B42W4L06: { ter: 0.0030, nota: 'Vanguard Global Small-Cap Index EUR Acc' },
  IE00B18GC888: { ter: 0.0015, nota: 'Vanguard Global Bond Index EUR Hedged Acc' },
  FR0013314234: { ter: 0.0027, nota: 'Groupama Trésorerie NC' },
  // ETF y ETC
  IE00B4ND3602: { ter: 0.0012, nota: 'iShares Physical Gold ETC' },
  IE00BM67HT60: { ter: 0.0025, nota: 'Xtrackers MSCI World Information Technology 1C' },
  IE00BK5BQT80: { ter: 0.0014, nota: 'Vanguard FTSE All-World (Acc), 0,14 % desde el 28/07/2026' },
  IE00B4L5Y983: { ter: 0.0020, nota: 'iShares Core MSCI World (Acc)' },
  IE00B5BMR087: { ter: 0.0007, nota: 'iShares Core S&P 500 (Acc)' },
};

export function catalogTer(isin: string | null | undefined): number | null {
  return isin ? TER_CATALOG[isin]?.ter ?? null : null;
}

/** TER que se usa: el que puso la persona, el del proveedor o el del catálogo. */
export function effectiveTer(holdingTer: unknown, asset: { ter: string | number | null; isin: string | null }): number | null {
  const own = holdingTer === null || holdingTer === undefined || holdingTer === '' ? null : Number(holdingTer);
  if (own !== null && Number.isFinite(own) && own >= 0) return own;
  if (asset.ter !== null && asset.ter !== undefined && asset.ter !== '') return Number(asset.ter);
  return catalogTer(asset.isin);
}
