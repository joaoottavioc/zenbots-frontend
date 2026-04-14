import { useState, useCallback, useRef, useEffect } from "react";

const FREE_ATTEMPTS = 3;
const BASE_COOLDOWN_MS = 2000;
const MAX_COOLDOWN_MS = 30000;

interface SubmitThrottle {
  /** Whether the user is currently throttled. */
  isThrottled: boolean;
  /** Seconds remaining until the cooldown expires. 0 when not throttled. */
  remainingSeconds: number;
  /** Call this on every submit attempt. Returns true if allowed, false if throttled. */
  recordSubmit: () => boolean;
  /** Reset the throttle state (call on successful submission). */
  reset: () => void;
}

/**
 * Client-side rate-limiter for auth forms.
 * Allows `FREE_ATTEMPTS` free submissions, then enforces exponential backoff
 * (2s → 4s → 8s … capped at 30s).
 */
export function useSubmitThrottle(): SubmitThrottle {
  const [isThrottled, setIsThrottled] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const attemptsRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const startCooldown = useCallback(
    (ms: number) => {
      clearTimer();
      const end = Date.now() + ms;
      setIsThrottled(true);
      setRemainingSeconds(Math.ceil(ms / 1000));

      timerRef.current = setInterval(() => {
        const left = Math.max(0, end - Date.now());
        setRemainingSeconds(Math.ceil(left / 1000));
        if (left <= 0) {
          clearTimer();
          setIsThrottled(false);
        }
      }, 250);
    },
    [clearTimer]
  );

  const recordSubmit = useCallback((): boolean => {
    if (isThrottled) return false;
    attemptsRef.current += 1;
    if (attemptsRef.current > FREE_ATTEMPTS) {
      const exponent = attemptsRef.current - FREE_ATTEMPTS - 1;
      const cooldown = Math.min(BASE_COOLDOWN_MS * 2 ** exponent, MAX_COOLDOWN_MS);
      startCooldown(cooldown);
      return false;
    }
    return true;
  }, [isThrottled, startCooldown]);

  const reset = useCallback(() => {
    attemptsRef.current = 0;
    setIsThrottled(false);
    setRemainingSeconds(0);
    clearTimer();
  }, [clearTimer]);

  return { isThrottled, remainingSeconds, recordSubmit, reset };
}
