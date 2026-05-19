/**
 * /widget — the page that lives inside the iframe.
 *
 * URL params (set by loader.js when constructing the iframe URL):
 *   - slug: string (preferred) — resolved server-side to a bot_id via
 *           GET /chat/by-slug/{slug}.
 *   - bot_id: integer (legacy) — direct route used by older embeds.
 *
 * Exactly one of slug / bot_id is required.
 *
 * Static-export note (next.config.ts has `output: 'export'`): dynamic
 * routes like `/[slug]/page.tsx` are forbidden by Next.js in this mode.
 * For pretty URLs like `/sabor-da-serra-zenbot/`, configure a CloudFront
 * function (or equivalent CDN rewrite) that maps unknown paths to
 * `/widget/index.html?slug=<path>`. That keeps the static-export build
 * simple and pushes URL prettification to the edge.
 */

"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { ZenBotsWidget } from "@/components/widget/ZenBotsWidget";
import {
  resolveSlug,
  type SlugResolution,
} from "@/components/widget/slug-api";
import { ChatApiError } from "@/components/widget/api";

export const dynamic = "force-dynamic";

function WidgetPageInner() {
  const params = useSearchParams();
  const slug = params.get("slug");
  const botIdParam = params.get("bot_id");

  // ── State for the slug → bot_id resolution branch ──────────────────
  const [slugResolution, setSlugResolution] = useState<SlugResolution | null>(
    null,
  );
  const [slugError, setSlugError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    resolveSlug(slug)
      .then((r) => {
        if (!cancelled) setSlugResolution(r);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ChatApiError && err.status === 404) {
          setSlugError("Restaurante não encontrado.");
        } else {
          setSlugError("Não foi possível carregar o atendimento.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // ── Slug path ──────────────────────────────────────────────────────

  if (slug) {
    if (slugError) {
      return (
        <div className="flex h-full items-center justify-center p-6 text-center">
          <p className="text-sm text-gray-700">{slugError}</p>
        </div>
      );
    }
    if (!slugResolution) {
      return (
        <div className="flex h-full items-center justify-center p-6 text-center">
          <p className="text-sm text-gray-500">Carregando...</p>
        </div>
      );
    }
    if (!slugResolution.web_widget_enabled) {
      return (
        <div className="flex h-full items-center justify-center p-6 text-center">
          <p className="text-sm text-gray-700">
            Este restaurante não aceita pedidos pelo widget no momento.
          </p>
        </div>
      );
    }
    return <ZenBotsWidget botId={slugResolution.bot_id} />;
  }

  // ── Legacy bot_id path ─────────────────────────────────────────────

  const botId = botIdParam ? Number(botIdParam) : Number.NaN;
  if (!botIdParam || Number.isNaN(botId) || botId < 1) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <p className="text-sm text-gray-700">
          Widget mal configurado — parâmetro slug ou bot_id ausente.
        </p>
      </div>
    );
  }
  return <ZenBotsWidget botId={botId} />;
}

export default function WidgetPage() {
  return (
    <Suspense fallback={null}>
      <WidgetPageInner />
    </Suspense>
  );
}
