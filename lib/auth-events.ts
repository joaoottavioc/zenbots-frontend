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
  listeners.forEach((fn) => fn());
}
