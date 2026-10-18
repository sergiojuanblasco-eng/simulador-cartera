import type { Metadata, Viewport } from 'next';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/plus-jakarta-sans/400.css';
import '@fontsource/plus-jakarta-sans/500.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
import './globals.css';
import { ServiceWorker } from '@/components/service-worker';
import { publicEnv } from '@/lib/env';

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.siteUrl()),
  title: { default: 'Kartera — Todas tus inversiones, en un solo sitio', template: '%s · Kartera' },
  description: 'Sigue todas tus inversiones en un solo sitio: patrimonio, rentabilidad real, comisiones y simulador de cartera con datos históricos.',
  applicationName: 'Kartera',
  appleWebApp: { capable: true, title: 'Kartera', statusBarStyle: 'default' },
  openGraph: { siteName: 'Kartera', locale: 'es_ES', type: 'website' },
};

export const viewport: Viewport = {
  themeColor: '#FBFAF8',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-dvh antialiased">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
