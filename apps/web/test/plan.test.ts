import { describe, expect, it } from 'vitest';
import { defaultHorizon, guessProxy, parsePlan, simulatePlan } from '@/lib/plan';

describe('plan de cartera', () => {
  it('reconoce con qué índice simular cada producto', () => {
    const g = (nombre: string, tipo = 'fondo' as const, isin: string | null = null) => guessProxy({ nombre, tipo, isin }).id;
    expect(g('Fidelity MSCI World Index P EUR Acc', 'fondo', 'IE00BYX5NX33')).toBe('msci_world');
    expect(g('Physical Gold USD (Acc)')).toBe('gold');
    expect(g('MSCI World Information Technology USD (Acc)')).toBe('tech_global');
    expect(g('Vanguard Emerging Markets Stock Index EUR Acc')).toBe('msci_em');
    expect(g('Vanguard Global Small-Cap Index EUR Acc')).toBe('small_caps');
    expect(g('Vanguard Global Bond Index EUR Hedged Acc')).toBe('bond_global');
    expect(g('Groupama Tresorerie NC')).toBe('cash');
    expect(guessProxy({ nombre: 'Bitcoin', tipo: 'cripto' })).toEqual({ id: 'btc', aproximado: false });
    expect(g('Vanguard FTSE All-World UCITS ETF')).toBe('msci_acwi');
    expect(g('iShares Core S&P 500')).toBe('sp500');
    expect(guessProxy({ nombre: 'Fondo raro XYZ', tipo: 'fondo' })).toEqual({ id: 'msci_world', aproximado: true });
  });

  it('horizonte por objetivo, o hasta el año meta', () => {
    expect(defaultHorizon('corto_plazo', null, 2026)).toBe(2);
    expect(defaultHorizon('medio_plazo', null, 2026)).toBe(5);
    expect(defaultHorizon('largo_plazo', null, 2026)).toBe(15);
    expect(defaultHorizon('largo_plazo', 2040, 2026)).toBe(14);
  });

  it('valida el reparto guardado', () => {
    const id = '0b2c8f8e-1111-4222-8333-444455556666';
    expect(parsePlan([{ assetId: id, pct: 60, proxy: 'msci_world' }, { assetId: 'x', pct: 40 }, { assetId: id, pct: 0 }, null])).toEqual([{ assetId: id, pct: 60, proxy: 'msci_world' }]);
    expect(parsePlan('basura')).toEqual([]);
  });

  it('simula el plan: escenarios ordenados y probabilidad de llegar a la meta', () => {
    const s = simulatePlan({ weights: { msci_world: 70, bond_global: 20, gold: 10 }, initial: 10000, monthly: 300, years: 15, goal: 100000 })!;
    expect(s.invertido).toBe(64000);
    expect(s.pesimista).toBeLessThan(s.esperado);
    expect(s.esperado).toBeLessThan(s.optimista);
    expect(s.probMeta).toBeGreaterThan(0);
    expect(s.probMeta).toBeLessThanOrEqual(1);
    const facil = simulatePlan({ weights: { msci_world: 100 }, initial: 10000, monthly: 300, years: 15, goal: 20000 })!;
    expect(facil.probMeta).toBe(1);
    const largo = simulatePlan({ weights: { btc: 100 }, initial: 1000, monthly: 0, years: 30 })!;
    expect(largo.recortado).not.toBeNull();
  });
});
