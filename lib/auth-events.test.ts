import { vi } from "vitest";
import { onSessionExpired, emitSessionExpired } from "./auth-events";

vi.mock("./error-reporting", () => ({
  reportError: vi.fn(),
}));

import { reportError } from "./error-reporting";

describe("auth-events", () => {
  it("calls subscribed handlers on emitSessionExpired", () => {
    const handler = vi.fn();
    onSessionExpired(handler);

    emitSessionExpired();

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("supports multiple subscribers", () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    onSessionExpired(h1);
    onSessionExpired(h2);

    emitSessionExpired();

    expect(h1).toHaveBeenCalledTimes(1);
    expect(h2).toHaveBeenCalledTimes(1);
  });

  it("unsubscribe stops future calls", () => {
    const handler = vi.fn();
    const unsub = onSessionExpired(handler);

    unsub();
    emitSessionExpired();

    expect(handler).not.toHaveBeenCalled();
  });

  it("continues executing remaining listeners when one throws", () => {
    const h1 = vi.fn();
    const throwing = vi.fn(() => {
      throw new Error("boom");
    });
    const h3 = vi.fn();

    onSessionExpired(h1);
    onSessionExpired(throwing);
    onSessionExpired(h3);

    emitSessionExpired();

    expect(h1).toHaveBeenCalledTimes(1);
    expect(throwing).toHaveBeenCalledTimes(1);
    expect(h3).toHaveBeenCalledTimes(1);
  });

  it("reports the error from failing listener via reportError", () => {
    const error = new Error("handler failed");
    onSessionExpired(() => {
      throw error;
    });

    emitSessionExpired();

    expect(reportError).toHaveBeenCalledWith(error, {
      source: "auth-events",
      handler: "emitSessionExpired",
    });
  });
});
