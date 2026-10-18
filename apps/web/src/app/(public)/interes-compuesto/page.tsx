import type { Metadata } from 'next';
import { isLoggedIn } from '@/kartera/session';
import { ToolsClient } from '@/kartera/tools-client';

export const metadata: Metadata = {
  title: { absolute: 'Calculadora de interés compuesto · Kartera' },
  description: 'Calcula cuánto puede crecer tu dinero con aportaciones mensuales e interés compuesto. Gratis y sin registro.',
  alternates: { canonical: '/interes-compuesto' },
  openGraph: { title: 'Calculadora de interés compuesto · Kartera', url: '/interes-compuesto' },
};

export default async function InteresCompuestoPage() {
  return <ToolsClient path="/interes-compuesto" loggedIn={await isLoggedIn()} />;
}
