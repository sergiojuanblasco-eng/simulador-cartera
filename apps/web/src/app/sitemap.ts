import type { MetadataRoute } from 'next';
import SIMS from '@/kartera/data/simulations.json';
import { publicEnv } from '@/lib/env';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = publicEnv.siteUrl();
  return [
    { url: `${base}/`, priority: 1 },
    { url: `${base}/simulador-cartera`, priority: 0.9 },
    { url: `${base}/interes-compuesto`, priority: 0.8 },
    ...(SIMS as { slug: string }[]).map((s) => ({ url: `${base}/simulacion/${s.slug}`, priority: 0.8 })),
  ];
}
