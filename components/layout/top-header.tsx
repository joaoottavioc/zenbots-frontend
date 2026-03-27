"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Bot, ShoppingBag, Package, BarChart3, QrCode, Settings, LifeBuoy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { UserNav } from "@/components/ui/user-nav";
import { Logo } from "@/components/ui/logo";
import { CircuitBg } from "@/components/ui/circuit-bg";

const mobileRoutes = [
  { label: "Meus BotZ", icon: Bot, href: "/meus-bots", color: "text-sky-500" },
  { label: "Produtos", icon: ShoppingBag, href: "/produtos", color: "text-violet-500" },
  { label: "Pedidos", icon: Package, href: "/pedidos", color: "text-pink-700" },
  { label: "Mais Vendidos", icon: BarChart3, href: "/analytics", color: "text-orange-700" },
  { label: "Integração Pix", icon: QrCode, href: "/pagamentos", color: "text-emerald-500" },
  { label: "Configurações", icon: Settings, href: "/settings" },
  { label: "Suporte", icon: LifeBuoy, href: "/suporte" },
];

export function TopHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="relative h-16 flex items-center px-6 z-40 bg-brand-nav border-b border-slate-700/60">

      {/* Logo — desktop only, matches sidebar width */}
      <div className="hidden md:flex items-center w-[200px] -ml-6 pl-2 h-full relative z-20 shrink-0">
        <Logo collapsed={false} />
        {/* Vertical separator */}
        <div
          className="absolute right-0 top-2 bottom-2 w-px pointer-events-none"
          style={{ background: "linear-gradient(180deg, transparent 0%, #0e7490 30%, #06b6d4 50%, #0e7490 70%, transparent 100%)" }}
        />
      </div>

      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden relative z-10 text-white hover:bg-white/10"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile navigation sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[280px] bg-brand-nav border-slate-700/60 p-0">
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>

          <div className="relative h-24 flex items-start justify-center pt-3 mb-4">
            <Logo />
            <div
              className="absolute bottom-0 left-3 right-3 h-px"
              style={{ background: "linear-gradient(90deg, transparent 0%, #0e7490 30%, #06b6d4 50%, #0e7490 70%, transparent 100%)" }}
            />
          </div>

          <nav className="px-3 space-y-1">
            {mobileRoutes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                onClick={() => setMobileOpen(false)}
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
          </nav>
        </SheetContent>
      </Sheet>

      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] pointer-events-none"
        style={{ background: "linear-gradient(90deg, transparent 0%, #06b6d4 30%, #22d3ee 50%, #06b6d4 70%, transparent 100%)" }}
      />

      {/* Bottom glow border */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: "linear-gradient(90deg, transparent 0%, #0e7490 30%, #06b6d4 50%, #0e7490 70%, transparent 100%)" }}
      />

      {/* Circuit artwork */}
      <CircuitBg />

      {/* Flex spacer */}
      <div className="flex-1 relative z-10" />

      {/* Right: user nav */}
      <div className="relative z-10">
        <UserNav />
      </div>
    </header>
  );
}
