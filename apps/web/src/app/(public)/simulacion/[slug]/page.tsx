import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import SIMS from '@/kartera/data/simulations.json';
import { isLoggedIn } from '@/kartera/session';
import { ToolsClient } from '@/kartera/tools-client';

type Sim = { slug: string; title: { es: string }; hook?: { es: string } };
const sims = SIMS as Sim[];

export function generateStaticParams() {
  return sims.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const sim = sims.find((s) => s.slug === slug);
  if (!sim) return {};
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
  return <ToolsClient path="/simulacion" slug={slug} loggedIn={await isLoggedIn()} />;
}
