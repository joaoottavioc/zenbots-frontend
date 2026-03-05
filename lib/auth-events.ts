import { reportError } from "./error-reporting";

type Listener = () => void;

const listeners = new Set<Listener>();

/** Subscribe to session-expired events. Returns an unsubscribe function. */
export function onSessionExpired(handler: Listener): () => void {
  listeners.add(handler);
  return () => {
    listeners.delete(handler);
  };
}

/** Emit a session-expired event to all subscribers. */
export function emitSessionExpired(): void {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      reportError(e instanceof Error ? e : new Error(String(e)), {
        source: "auth-events",
        handler: "emitSessionExpired",
      });
    }
  });
}
