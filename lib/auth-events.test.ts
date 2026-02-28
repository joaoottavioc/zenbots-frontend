import { vi } from "vitest";
import { onSessionExpired, emitSessionExpired } from "./auth-events";

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
});
