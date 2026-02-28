import { renderHook, act } from "@testing-library/react";
import { vi } from "vitest";
import { useSubmitThrottle } from "./use-submit-throttle";

describe("useSubmitThrottle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows first 3 attempts freely", () => {
    const { result } = renderHook(() => useSubmitThrottle());

    expect(result.current.recordSubmit()).toBe(true);
    expect(result.current.recordSubmit()).toBe(true);
    expect(result.current.recordSubmit()).toBe(true);
    expect(result.current.isThrottled).toBe(false);
  });

  it("throttles on 4th attempt with 2s cooldown", () => {
    const { result } = renderHook(() => useSubmitThrottle());

    result.current.recordSubmit(); // 1
    result.current.recordSubmit(); // 2
    result.current.recordSubmit(); // 3

    act(() => {
      expect(result.current.recordSubmit()).toBe(false); // 4th triggers throttle
    });

    expect(result.current.isThrottled).toBe(true);
    expect(result.current.remainingSeconds).toBeGreaterThan(0);
  });

  it("unthrottles after cooldown expires", () => {
    const { result } = renderHook(() => useSubmitThrottle());

    result.current.recordSubmit();
    result.current.recordSubmit();
    result.current.recordSubmit();

    act(() => {
      result.current.recordSubmit(); // triggers 2s cooldown
    });

    expect(result.current.isThrottled).toBe(true);

    act(() => {
      vi.advanceTimersByTime(2500);
    });

    expect(result.current.isThrottled).toBe(false);
    expect(result.current.remainingSeconds).toBe(0);
  });

  it("doubles cooldown on subsequent throttled attempts", () => {
    const { result } = renderHook(() => useSubmitThrottle());

    // Exhaust free attempts
    result.current.recordSubmit();
    result.current.recordSubmit();
    result.current.recordSubmit();

    // 4th attempt -> 2s cooldown
    act(() => {
      result.current.recordSubmit();
    });
    expect(result.current.isThrottled).toBe(true);

    // Wait for cooldown
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(result.current.isThrottled).toBe(false);

    // 5th attempt -> 4s cooldown
    act(() => {
      result.current.recordSubmit();
    });
    expect(result.current.isThrottled).toBe(true);

    // 2s should not be enough
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(result.current.isThrottled).toBe(true);

    // 4s total should be enough
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.isThrottled).toBe(false);
  });

  it("rejects submissions while throttled", () => {
    const { result } = renderHook(() => useSubmitThrottle());

    result.current.recordSubmit();
    result.current.recordSubmit();
    result.current.recordSubmit();

    act(() => {
      result.current.recordSubmit(); // triggers throttle
    });

    expect(result.current.recordSubmit()).toBe(false);
  });

  it("reset clears all state", () => {
    const { result } = renderHook(() => useSubmitThrottle());

    result.current.recordSubmit();
    result.current.recordSubmit();
    result.current.recordSubmit();

    act(() => {
      result.current.recordSubmit(); // triggers throttle
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.isThrottled).toBe(false);
    expect(result.current.remainingSeconds).toBe(0);

    // After reset, should have 3 free attempts again
    expect(result.current.recordSubmit()).toBe(true);
    expect(result.current.recordSubmit()).toBe(true);
    expect(result.current.recordSubmit()).toBe(true);
  });
});
