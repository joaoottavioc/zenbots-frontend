/**
 * Slug → bot_id resolution for the dynamic widget route.
 *
 * Backend contract: GET /chat/by-slug/{slug} (Phase 4 slice 1).
 * Returns {bot_id, slug, restaurant_name, web_widget_enabled} or 404.
 *
 * The widget itself uses bot_id everywhere — this is just the bootstrap
 * step that turns a customer-pasted URL like /sabor-da-serra-zenbot
 * into the integer the rest of the pipeline expects.
 */

import { ChatApiError } from "./api";

export interface SlugResolution {
  bot_id: number;
  slug: string;
  restaurant_name: string | null;
  web_widget_enabled: boolean;
}

function apiBase(): string {
  const fromEnv =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_API_BASE_URL
      : undefined;
  return fromEnv || "http://localhost:8000";
}

export async function resolveSlug(slug: string): Promise<SlugResolution> {
  const res = await fetch(
    `${apiBase()}/chat/by-slug/${encodeURIComponent(slug)}`,
  );
  if (!res.ok) {
    let detail: unknown = null;
    try {
      detail = await res.json();
    } catch {
      // ignore
    }
    throw new ChatApiError("Slug resolution failed", res.status, detail);
  }
  return res.json();
}
