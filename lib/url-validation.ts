const TRUSTED_DOMAINS = [
  "mercadopago.com",
  "mercadopago.com.br",
  "mercadolibre.com",
  "mercadolibre.com.br",
];

/**
 * Validates that a redirect URL points to a trusted payment domain over HTTPS.
 * Prevents open-redirect attacks from compromised or tampered API responses.
 */
export function isTrustedRedirectUrl(url: string): boolean {
  if (!url) return false;

  try {
    const parsed = new URL(url);

    if (parsed.protocol !== "https:") return false;

    return TRUSTED_DOMAINS.some(
      (domain) =>
        parsed.hostname === domain ||
        parsed.hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}
