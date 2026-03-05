import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@sentry/react", () => ({
  init: vi.fn(),
  isInitialized: vi.fn(() => false),
  captureException: vi.fn(),
}));

import * as Sentry from "@sentry/react";
import { initErrorReporting, reportError, _resetForTesting } from "./error-reporting";

describe("error-reporting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetForTesting();
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
    vi.stubEnv("NEXT_PUBLIC_ENVIRONMENT", "");
  });

  describe("initErrorReporting", () => {
    it("does not initialize Sentry when DSN is not set", () => {
      initErrorReporting();
      expect(Sentry.init).not.toHaveBeenCalled();
    });

    it("initializes Sentry when DSN is set", () => {
      vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://test@sentry.io/123");
      vi.stubEnv("NEXT_PUBLIC_ENVIRONMENT", "dev");

      initErrorReporting();

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: "https://test@sentry.io/123",
          environment: "dev",
        })
      );
    });

    it("defaults environment to 'development' when not set", () => {
      vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://test@sentry.io/123");

      initErrorReporting();

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          environment: "development",
        })
      );
    });

    it("only initializes once (idempotent)", () => {
      vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://test@sentry.io/123");

      initErrorReporting();
      initErrorReporting();

      expect(Sentry.init).toHaveBeenCalledTimes(1);
    });
  });

  describe("reportError", () => {
    it("always logs to console.error", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const error = new Error("test error");

      reportError(error, { boundary: "global" });

      expect(consoleSpy).toHaveBeenCalledWith(
        "[ErrorReport]",
        error,
        { boundary: "global" }
      );
      consoleSpy.mockRestore();
    });

    it("sends to Sentry when initialized", () => {
      vi.mocked(Sentry.isInitialized).mockReturnValue(true);
      vi.spyOn(console, "error").mockImplementation(() => {});
      const error = new Error("sentry error");

      reportError(error, { boundary: "portal" });

      expect(Sentry.captureException).toHaveBeenCalledWith(error, {
        extra: { boundary: "portal" },
      });
    });

    it("does not call Sentry when not initialized", () => {
      vi.mocked(Sentry.isInitialized).mockReturnValue(false);
      vi.spyOn(console, "error").mockImplementation(() => {});

      reportError(new Error("no sentry"));

      expect(Sentry.captureException).not.toHaveBeenCalled();
    });
  });
});
