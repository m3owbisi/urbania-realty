import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '60 Perry Cross | Urbania Realty',
  applicationName: '60 Perry Cross',
  appleWebApp: { capable: true, title: '60 Perry Cross', statusBarStyle: 'black-translucent' },
  formatDetection: { telephone: false },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#000000' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
