import type { MetadataRoute } from 'next';

// Installable PWA: opens fullscreen and landscape (the experience is designed landscape-first).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '60 Perry Cross | Urbania Realty',
    short_name: '60 Perry Cross',
    description: 'A Symphony Of Leisure: explore 60 Perry Cross, Bandra.',
    start_url: '/',
    scope: '/',
    display: 'fullscreen',
    display_override: ['fullscreen', 'standalone'],
    orientation: 'landscape',
    background_color: '#000000',
    theme_color: '#000000',
    icons: [
      { src: '/icon.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  };
}
