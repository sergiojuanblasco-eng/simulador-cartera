import { describe, expect, it } from 'vitest';
import { fillFacts, simFacts } from '@/kartera/engine';
import SIMS from '@/kartera/data/simulations.json';

type Txt = { es: string; en: string };
const texts = (o: unknown): string[] => {
  if (!o || typeof o !== 'object') return [];
  if ('es' in (o as Txt) && typeof (o as Txt).es === 'string') return [(o as Txt).es, (o as Txt).en];
  return Object.values(o as Record<string, unknown>).flatMap(texts);
};

describe('simulaciones SEO', () => {
  for (const sim of SIMS as { slug: string }[]) {
    it(`${sim.slug}: los textos usan cifras del propio simulador`, () => {
      const facts = simFacts(sim);
      expect(facts).not.toBeNull();
      if (process.env.SHOW_FACTS) console.log(sim.slug, facts);
      for (const t of texts(sim)) {
        const filled = fillFacts(t, facts);
        expect(filled, `marcador sin rellenar en ${sim.slug}`).not.toMatch(/\{[a-z0-9_]+\}/);
      }
    });
  }
});
