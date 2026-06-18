import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LVM Weightlifting',
  description: 'Gestao de atletas de levantamento de peso olimpico'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
