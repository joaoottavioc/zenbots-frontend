/**
 * Client-side feature flags — mirrors `app/feature_flags.py` on the backend.
 *
 * These are *signup-flow / UI-level* gates. The web widget channel
 * (Phase 2 of plan/in_browser_bots.md) lives behind its own toggle on
 * the backend (`channel_toggle.is_channel_enabled`), separate from
 * these UI flags.
 *
 * Why client-side too: when WhatsApp signup is deferred (Meta App
 * Review pending), we don't want to load the FB JS SDK at all, render
 * the "Conectar WhatsApp" CTA, or take the user through a flow that
 * will 503 at the last step. The backend gate is the *security* check;
 * this UI gate is the *experience* check.
 *
 * To flip when Meta approves: set `NEXT_PUBLIC_WHATSAPP_SIGNUP_ENABLED=1`
 * in the deployment env. Defaults closed.
 */

function readPublicBool(name: string): boolean {
  // process.env access works in Next.js for NEXT_PUBLIC_* at build time.
  // We use a Record lookup to keep TypeScript happy with dynamic keys.
  const value = (process.env as Record<string, string | undefined>)[name];
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

/** Gates the WhatsApp Embedded Signup button and any UI surface that
 *  would prompt the restaurant owner to connect a WhatsApp number.
 *  Defaults to false until Meta App Review opens public signup. */
export function isWhatsappSignupEnabled(): boolean {
  return readPublicBool("NEXT_PUBLIC_WHATSAPP_SIGNUP_ENABLED");
}
