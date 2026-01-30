import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import Providers from "./providers"; // Importamos o seu arquivo providers
import "./globals.css";

// Configuração das Fontes
const inter = Inter({ 
  subsets: ["latin"], 
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({ 
  subsets: ["latin"], 
  variable: "--font-outfit",
  display: "swap",
});

// Metadados (SEO) - Agora funciona porque não tem "use client" neste arquivo
export const metadata: Metadata = {
  title: "ZenBotZ - Automação Inteligente",
  description: "Gerencie seu delivery com tranquilidade.",
  icons: {
    icon: "/logo-zenbotz.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} ${outfit.variable} font-sans bg-slate-50 text-slate-900`}>
        {/* O Providers cuida do React Query e do Toaster */}
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}