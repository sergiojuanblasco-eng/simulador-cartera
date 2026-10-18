import type { Metadata } from 'next';
import { ToolsPage } from '@/kartera/tools-page';

export const metadata: Metadata = {
  title: { absolute: 'Calculadora de interés compuesto · Kartera' },
  description: 'Calcula cuánto puede crecer tu dinero con aportaciones mensuales e interés compuesto. Gratis y sin registro.',
  alternates: { canonical: '/interes-compuesto' },
  openGraph: { title: 'Calculadora de interés compuesto · Kartera', url: '/interes-compuesto' },
};

export default async function InteresCompuestoPage() {
  return <ToolsPage path="/interes-compuesto" />;
}
