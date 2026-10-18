import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Kartera',
    short_name: 'Kartera',
    description: 'Todas tus inversiones, en un solo sitio.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FBFAF8',
    theme_color: '#FBFAF8',
    lang: 'es',
    id: '/',
    scope: '/',
    categories: ['finance'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
