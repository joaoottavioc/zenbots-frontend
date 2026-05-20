import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// process.env mutations don't always flow into the module's cached
// values when Vitest's module loader has already evaluated the module.
// We re-import via vi.resetModules() inside each test to pick up the
// freshly-set env.
describe("isWhatsappSignupEnabled", () => {
  const original = process.env.NEXT_PUBLIC_WHATSAPP_SIGNUP_ENABLED;

  beforeEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_WHATSAPP_SIGNUP_ENABLED;
  });

  afterEach(() => {
    if (original === undefined) {
      delete process.env.NEXT_PUBLIC_WHATSAPP_SIGNUP_ENABLED;
    } else {
      process.env.NEXT_PUBLIC_WHATSAPP_SIGNUP_ENABLED = original;
    }
  });

  it("returns false when the env var is unset (default-closed)", async () => {
    const mod = await import("./feature-flags");
    expect(mod.isWhatsappSignupEnabled()).toBe(false);
  });

  it.each(["1", "true", "TRUE", "yes", "on"])(
    "returns true for truthy value %s",
    async (value) => {
      process.env.NEXT_PUBLIC_WHATSAPP_SIGNUP_ENABLED = value;
      const mod = await import("./feature-flags");
      expect(mod.isWhatsappSignupEnabled()).toBe(true);
    },
  );

  it.each(["", "0", "false", "no", "off", "maybe"])(
    "returns false for falsy/garbage value %s",
    async (value) => {
      process.env.NEXT_PUBLIC_WHATSAPP_SIGNUP_ENABLED = value;
      const mod = await import("./feature-flags");
      expect(mod.isWhatsappSignupEnabled()).toBe(false);
    },
  );
});
