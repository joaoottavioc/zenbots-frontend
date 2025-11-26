// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
// 👇 1. ADICIONE ESTE IMPORT
import { Toaster } from "@/components/ui/toaster"; 

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ZenBots Dashboard", // Aproveitei para ajustar o título
  description: "Gerencie seus bots",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          {children}
        </Providers>
        
        {/* 👇 2. ADICIONE O COMPONENTE AQUI (ANTES DE FECHAR O BODY) */}
        <Toaster /> 
      </body>
    </html>
  );
}