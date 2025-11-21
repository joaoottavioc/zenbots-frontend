// app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Providers from './providers'; // <-- 1. IMPORTE O ARQUIVO AQUI

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ZenBots Dashboard',
  description: 'Gerencie seus bots',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers> {/* <-- 2. ENVOLVA O {children} AQUI */}
          {children}
        </Providers>
      </body>
    </html>
  );
}