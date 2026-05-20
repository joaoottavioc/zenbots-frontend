/**
 * useRecorder — thin wrapper around MediaRecorder for the widget mic button.
 *
 * Responsibilities:
 *   - Request the microphone via getUserMedia exactly when the user
 *     presses the mic button. Permission is held only for the duration
 *     of the recording, not the whole widget session.
 *   - Negotiate a MIME type supported by the current browser. Chrome /
 *     Firefox prefer `audio/webm;codecs=opus`, Safari needs `audio/mp4`.
 *   - Track elapsed time and auto-stop at MAX_RECORDING_MS so the
 *     upload stays well under the backend's 2 MB ceiling.
 *   - Expose a small state machine the UI can render directly.
 *
 * The hook does NOT handle the upload — it just produces a Blob. The
 * caller (ZenBotsWidget) is responsible for posting it to the backend.
 *
 * Browser compatibility: MediaRecorder is available in Chrome 49+,
 * Firefox 30+, Safari 14.1+, Edge 79+. iOS Safari < 14.3 has no
 * MediaRecorder; callers should gate the mic button on
 * `typeof MediaRecorder !== "undefined"`.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Hard cap on a single recording. The backend rejects payloads above
 *  2 MB; at opus 32kbps that's ~520s, so 90s is a comfortable safety
 *  margin and avoids customer-facing surprises. */
export const MAX_RECORDING_MS = 90_000;

/** State machine the UI mirrors. `idle` is the resting state; `error`
 *  is recoverable (just call `start` again). */
export type RecorderStatus =
  | "idle"
  | "requesting-permission"
  | "recording"
  | "stopping"
  | "error";

interface UseRecorderReturn {
  status: RecorderStatus;
  /** ms since recording started — drives the on-screen counter. */
  elapsedMs: number;
  /** Specific error message if status === "error". */
  errorMessage: string | null;
  /** Whether MediaRecorder is supported at all. Surface to the UI so the
   *  mic button can hide on browsers that can't record. */
  supported: boolean;
  /** Begin recording. No-op if already recording. */
  start: () => Promise<void>;
  /** Stop and resolve with the recorded Blob. Resolves null on error
   *  paths (cancel, permission denied, no chunks). */
  stop: () => Promise<Blob | null>;
  /** Discard the in-progress recording without producing a Blob. */
  cancel: () => void;
}

/** Pick the first MIME the browser actually supports. Falls back to the
 *  default (empty string) if none match — the browser will then choose. */
function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const t of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(t)) return t;
    } catch {
      // Some Safari versions throw on unsupported MIME — keep going.
    }
  }
  return "";
}

export function useRecorder(): UseRecorderReturn {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number>(0);
  const stopResolveRef = useRef<((blob: Blob | null) => void) | null>(null);
  const cancelledRef = useRef<boolean>(false);

  // Read once on first render. `supported` doesn't change at runtime.
  const supported =
    typeof window !== "undefined" && typeof MediaRecorder !== "undefined";

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    recorderRef.current = null;
    chunksRef.current = [];
    startedAtRef.current = 0;
  }, []);

  const stop = useCallback(async (): Promise<Blob | null> => {
    if (!recorderRef.current || status !== "recording") {
      return null;
    }
    setStatus("stopping");
    return new Promise<Blob | null>((resolve) => {
      stopResolveRef.current = resolve;
      recorderRef.current?.stop();
    });
  }, [status]);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    } else {
      cleanup();
      setStatus("idle");
      setElapsedMs(0);
    }
  }, [cleanup]);

  const start = useCallback(async () => {
    if (!supported) {
      setErrorMessage("Gravação de áudio não é suportada neste navegador.");
      setStatus("error");
      return;
    }
    if (status === "recording" || status === "requesting-permission") return;

    setErrorMessage(null);
    setStatus("requesting-permission");
    cancelledRef.current = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      // Constructing MediaRecorder with an empty mimeType lets the
      // browser pick — safe fallback.
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const wasCancelled = cancelledRef.current;
        const blob =
          chunksRef.current.length > 0 && !wasCancelled
            ? new Blob(chunksRef.current, {
                type: recorder.mimeType || "audio/webm",
              })
            : null;
        cleanup();
        setStatus("idle");
        setElapsedMs(0);
        stopResolveRef.current?.(blob);
        stopResolveRef.current = null;
      };

      // Auto-stop at the safety cap. The UI also surfaces the counter
      // so the user sees the limit coming.
      timerRef.current = setInterval(() => {
        const ms = Date.now() - startedAtRef.current;
        setElapsedMs(ms);
        if (ms >= MAX_RECORDING_MS && recorder.state !== "inactive") {
          recorder.stop();
        }
      }, 200);

      startedAtRef.current = Date.now();
      recorder.start();
      setStatus("recording");
      setElapsedMs(0);
    } catch (err) {
      cleanup();
      const denied =
        err instanceof DOMException &&
        (err.name === "NotAllowedError" || err.name === "SecurityError");
      setErrorMessage(
        denied
          ? "Permita o microfone para gravar mensagens de voz."
          : "Não foi possível acessar o microfone.",
      );
      setStatus("error");
    }
  }, [cleanup, status, supported]);

  // Make sure we never leak a stream if the component unmounts mid-recording.
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return {
    status,
    elapsedMs,
    errorMessage,
    supported,
    start,
    stop,
    cancel,
  };
}
