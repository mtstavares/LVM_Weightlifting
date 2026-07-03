import type { Metadata } from 'next';
import { MotionPage } from '../components/motion-page';
import './globals.css';

const logoPath = '/brand/logo-lvm.png';
const appUrl = safeUrl(process.env.NEXT_PUBLIC_APP_URL, 'http://localhost:3000');

export const metadata: Metadata = {
  metadataBase: appUrl,
  title: 'LVM Weightlifting',
  description: 'Gestão de atletas de levantamento de peso olímpico',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: logoPath, type: 'image/png' }],
    shortcut: [{ url: logoPath, type: 'image/png' }],
    apple: [{ url: logoPath, type: 'image/png' }]
  },
  openGraph: {
    title: 'LVM Weightlifting',
    description: 'Gestão premium de atletas de levantamento de peso olímpico.',
    images: [{ url: logoPath, width: 1536, height: 1024, alt: 'LVM Weightlifting' }],
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LVM Weightlifting',
    description: 'Gestão premium de atletas de levantamento de peso olímpico.',
    images: [logoPath]
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body><MotionPage>{children}</MotionPage></body>
    </html>
  );
}

function safeUrl(value: string | undefined, fallback: string) {
  try {
    return new URL(value || fallback);
  } catch {
    return new URL(fallback);
  }
}
