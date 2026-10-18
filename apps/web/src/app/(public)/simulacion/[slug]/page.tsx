import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import SIMS from '@/kartera/data/simulations.json';
import { filledSim } from '@/kartera/engine';
import { ToolsPage } from '@/kartera/tools-page';

type Sim = { slug: string; title: { es: string }; hook?: { es: string } };
const sims = SIMS as Sim[];

// Dinámica: con sesión se muestra dentro del menú de la app.
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const raw = sims.find((s) => s.slug === slug);
  if (!raw) return {};
  const sim = filledSim(raw) as Sim;
  const description = (sim.hook?.es ?? '').replace(/\s+/g, ' ').slice(0, 160);
  return {
    title: { absolute: `${sim.title.es} · Kartera` },
    description,
    alternates: { canonical: `/simulacion/${slug}` },
    openGraph: { title: sim.title.es, description, url: `/simulacion/${slug}` },
  };
}

export default async function SimulacionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!sims.some((s) => s.slug === slug)) notFound();
  return <ToolsPage path="/simulacion" slug={slug} />;
}
