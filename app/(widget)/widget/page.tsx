/**
 * /widget — the page that lives inside the iframe.
 *
 * URL params (set by loader.js when constructing the iframe URL):
 *   - bot_id: integer; required
 *
 * Theme + welcome message come from the backend's POST /chat/{botId}/session
 * handshake. The widget reads them from the iframe URL only as a hint
 * to render before the server response arrives (deferred to a future
 * polish slice — v1 just calls /session on mount).
 */

"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { ZenBotsWidget } from "@/components/widget/ZenBotsWidget";

export const dynamic = "force-dynamic";

function WidgetPageInner() {
  const params = useSearchParams();
  const raw = params.get("bot_id");
  const botId = raw ? Number(raw) : Number.NaN;

  if (!raw || Number.isNaN(botId) || botId < 1) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <p className="text-sm text-gray-700">
          Widget mal configurado — parâmetro bot_id ausente ou inválido.
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
