"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  BarChart3,
  QrCode,
  Settings,
  LifeBuoy,
  Bot
} from "lucide-react";
import { Logo } from "@/components/ui/logo";

const routes = [
  { label: "Meus BotZ", icon: Bot, href: "/meus-bots", color: "text-sky-500" }, // Cor Neon
  { label: "Produtos", icon: ShoppingBag, href: "/produtos", color: "text-violet-500" },
  { label: "Pedidos", icon: Package, href: "/pedidos", color: "text-pink-700" },
  { label: "Mais Vendidos", icon: BarChart3, href: "/analytics", color: "text-orange-700" },
  { label: "Integração Pix", icon: QrCode, href: "/pagamentos", color: "text-emerald-500" },
  { label: "Configurações", icon: Settings, href: "/settings" },
  { label: "Suporte", icon: LifeBuoy, href: "/suporte" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav aria-label="Menu principal" className="space-y-4 py-4 flex flex-col h-full bg-brand-nav text-white border-r border-slate-800">
      
      <div className="px-3 py-2 flex-1 flex flex-col">
        
        {/* LOGO (Mantive simples pois já temos o icone no Header Global) */}
        <div className="relative h-24 flex items-start justify-center pt-3 mb-8">
          <Logo />
          {/* Cyan glow divider — matches topbar circuit aesthetic */}
          <div
            className="absolute bottom-0 left-3 right-3 h-px"
            style={{ background: "linear-gradient(90deg, transparent 0%, #0e7490 30%, #06b6d4 50%, #0e7490 70%, transparent 100%)" }}
          />
        </div>

        {/* MENU DE NAVEGAÇÃO */}
        <div className="space-y-1">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition",
                pathname === route.href ? "text-white bg-white/10" : "text-zinc-400"
              )}
            >
              <div className="flex items-center flex-1">
                <route.icon className={cn("h-5 w-5 mr-3", route.color)} />
                {route.label}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}