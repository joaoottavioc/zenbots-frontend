"use client";

import { useState } from "react";
import Link from "next/link";

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-cyan-900/20 bg-[#0a0e1a]/80 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1">
          <span className="font-logo text-2xl font-bold tracking-tight text-zinc-200">
            Zen
          </span>
          <span className="font-logo text-2xl font-bold tracking-tight text-white">
            Bot
          </span>
          <span
            className="font-logo text-2xl font-bold tracking-tight text-cyan-400"
            style={{
              textShadow:
                "0 0 8px rgba(34,211,238,0.5), 0 0 24px rgba(6,182,212,0.2)",
            }}
          >
            Z
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-8 md:flex">
          <a
            href="#funcionalidades"
            className="text-sm text-zinc-400 transition-colors hover:text-cyan-400"
          >
            Funcionalidades
          </a>
          <a
            href="#como-funciona"
            className="text-sm text-zinc-400 transition-colors hover:text-cyan-400"
          >
            Como Funciona
          </a>
          <a
            href="#planos"
            className="text-sm text-zinc-400 transition-colors hover:text-cyan-400"
          >
            Planos
          </a>
          <a
            href="https://app.zenbotz.com.br/login"
            className="text-sm text-zinc-300 transition-colors hover:text-white"
          >
            Entrar
          </a>
          <a
            href="https://app.zenbotz.com.br/cadastro"
            className="rounded-lg bg-cyan-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all hover:bg-cyan-400 hover:shadow-cyan-400/30"
          >
            Começar Grátis
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          className="relative z-50 flex h-10 w-10 items-center justify-center md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menu"
        >
          <div className="flex flex-col gap-1.5">
            <span
              className={`h-0.5 w-6 bg-zinc-300 transition-all ${mobileOpen ? "translate-y-2 rotate-45" : ""}`}
            />
            <span
              className={`h-0.5 w-6 bg-zinc-300 transition-all ${mobileOpen ? "opacity-0" : ""}`}
            />
            <span
              className={`h-0.5 w-6 bg-zinc-300 transition-all ${mobileOpen ? "-translate-y-2 -rotate-45" : ""}`}
            />
          </div>
        </button>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="fixed inset-0 top-[73px] z-40 flex flex-col gap-6 bg-[#0a0e1a]/95 px-6 pt-8 backdrop-blur-xl md:hidden">
            <a
              href="#funcionalidades"
              className="text-lg text-zinc-300 hover:text-cyan-400"
              onClick={() => setMobileOpen(false)}
            >
              Funcionalidades
            </a>
            <a
              href="#como-funciona"
              className="text-lg text-zinc-300 hover:text-cyan-400"
              onClick={() => setMobileOpen(false)}
            >
              Como Funciona
            </a>
            <a
              href="#planos"
              className="text-lg text-zinc-300 hover:text-cyan-400"
              onClick={() => setMobileOpen(false)}
            >
              Planos
            </a>
            <hr className="border-cyan-900/30" />
            <a
              href="https://app.zenbotz.com.br/login"
              className="text-lg text-zinc-300 hover:text-white"
            >
              Entrar
            </a>
            <a
              href="https://app.zenbotz.com.br/cadastro"
              className="mt-2 rounded-lg bg-cyan-500 px-5 py-3 text-center text-lg font-semibold text-white shadow-lg shadow-cyan-500/25"
            >
              Começar Grátis
            </a>
          </div>
        )}
      </nav>
    </header>
  );
}
