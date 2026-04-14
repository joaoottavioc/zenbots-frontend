import type { Metadata } from "next";
import { Inter, Outfit, Space_Grotesk, Caveat } from "next/font/google";
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

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
  display: "swap",
  weight: ["500", "700"],
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
      <body className={`${inter.variable} ${outfit.variable} ${spaceGrotesk.variable} ${caveat.variable} font-sans bg-background text-foreground`}>
        {/* O Providers cuida do React Query e do Toaster */}
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}