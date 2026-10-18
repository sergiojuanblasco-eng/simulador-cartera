import type { Metadata } from 'next';
import { isLoggedIn } from '@/kartera/session';
import { ToolsClient } from '@/kartera/tools-client';

export const metadata: Metadata = {
  title: { absolute: 'Simulador de cartera de inversión con datos reales · Kartera' },
  description: 'Simula tu cartera con 31 activos reales y 36 años de datos históricos. Escenarios pesimista, esperado y optimista y probabilidad de pérdida. Gratis.',
  alternates: { canonical: '/simulador-cartera' },
  openGraph: { title: 'Simulador de cartera · Kartera', url: '/simulador-cartera' },
};

export default async function SimuladorPage() {
  return <ToolsClient path="/simulador-cartera" loggedIn={await isLoggedIn()} />;
}
