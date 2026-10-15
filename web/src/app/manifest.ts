import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CT Group KRA & KPI Management System',
    short_name: 'CT Group KRA',
    description: 'Performance evaluation system for CT Group of Institutions based on 1,000-mark framework.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1d4ed8',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
