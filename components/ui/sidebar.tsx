"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";
import {
  ShoppingBag,
  Package,
  BarChart3,
  QrCode,
  Settings,
  LifeBuoy,
  Bot,
  Activity,
} from "lucide-react";

const routes = [
  { label: "Meus BotZ", icon: Bot, href: "/meus-bots", color: "text-sky-500" },
  { label: "Produtos", icon: ShoppingBag, href: "/produtos", color: "text-violet-500" },
  { label: "Pedidos", icon: Package, href: "/pedidos", color: "text-pink-700" },
  { label: "Mais Vendidos", icon: BarChart3, href: "/analytics", color: "text-orange-700" },
  { label: "Integração Pix", icon: QrCode, href: "/pagamentos", color: "text-emerald-500" },
  { label: "Configurações", icon: Settings, href: "/settings" },
  { label: "Suporte", icon: LifeBuoy, href: "/suporte" },
];

const adminRoutes = [
  { label: "Observability", icon: Activity, href: "/admin/observability", color: "text-cyan-400" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: user } = useQuery<User>({
    queryKey: ["currentUser"],
    queryFn: async () => (await api.get("/auth/me")).data,
    staleTime: 1000 * 60 * 10,
    retry: false,
  });

  const allRoutes = user?.is_admin ? [...routes, ...adminRoutes] : routes;

  return (
    <nav aria-label="Menu principal" className="w-[200px] flex flex-col h-full bg-brand-nav text-white border-r border-slate-800 relative">
      {/* Cyan aura divider — visual bridge from header logo */}
      <div
        className="absolute top-0 left-3 right-3 h-px pointer-events-none"
        style={{ background: "linear-gradient(90deg, transparent 0%, #0e7490 30%, #06b6d4 50%, #0e7490 70%, transparent 100%)" }}
      />
      <div className="px-3 pt-5 pb-2 flex-1 flex flex-col">
        <div className="space-y-1">
          {allRoutes.map((route) => (
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