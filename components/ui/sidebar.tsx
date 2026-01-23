// components/sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

// 1. Importe TODOS os ícones do seu sitemap
import { 
  Bot, 
  Settings, 
  Package,        // Pedidos
  BarChart,       // Analytics
  ShoppingCart,   // Produtos
  LifeBuoy,
  Wallet        // Integração Pix
} from "lucide-react";

// 2. O array navLinks agora é GLOBAL
const navLinks = [
  { href: "/meus-bots", label: "Meus Bots", icon: Bot },
  { href: "/produtos", label: "Produtos", icon: ShoppingCart },
  { href: "/pedidos", label: "Pedidos", icon: Package },
  { href: "/analytics", label: "Mais Vendidos", icon: BarChart },
  { href: "/pagamentos", label: "Integração Pix", icon: Wallet },
  { href: "/settings", label: "Configurações", icon: Settings },
  { href: "/suporte", label: "Suporte", icon: LifeBuoy },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col h-full w-60 border-r p-4 bg-gray-50">
      <div className="mb-8">
        <h2 className="text-2xl font-bold">ZenBots</h2>
      </div>
      
      <div className="flex flex-col space-y-2">
        {navLinks.map((link) => {
          // Lógica para destacar o link ativo
          const isActive = pathname.startsWith(link.href);
          
          return (
            <Button
              key={link.label}
              asChild
              variant={isActive ? "secondary" : "ghost"} 
              className="justify-start"
            >
              <Link href={link.href}>
                <link.icon className="mr-2 h-4 w-4" />
                {link.label}
              </Link>
            </Button>
          );
        })}
      </div>
      
      <div className="mt-auto">
         {/* ... ícone do usuário ... */}
      </div>
    </nav>
  );
}