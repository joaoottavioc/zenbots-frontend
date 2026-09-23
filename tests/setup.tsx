import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Auto-cleanup after each test
afterEach(() => {
  cleanup();
});

// --- Mock next/navigation ---
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// --- Mock next/image ---
vi.mock('next/image', () => ({
  default: ({ fill, priority, ...rest }: Record<string, unknown>) => {
    void fill; void priority;
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt="" {...(rest as React.ImgHTMLAttributes<HTMLImageElement>)} />;
  },
}));

// --- Mock next/link ---
vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// --- localStorage spy-based mock ---
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// --- sessionStorage spy-based mock ---
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  };
})();

Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

// --- window.location mock ---
Object.defineProperty(window, 'location', {
  value: {
    ...window.location,
    href: 'http://localhost:3000',
    assign: vi.fn(),
    replace: vi.fn(),
    reload: vi.fn(),
  },
  writable: true,
});

// --- navigator.clipboard mock ---
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
  },
  writable: true,
  configurable: true,
});

// --- window.print mock ---
window.print = vi.fn();

// --- Audio constructor mock ---
window.Audio = vi.fn(function (this: Record<string, unknown>) {
  this.play = vi.fn().mockResolvedValue(undefined);
  this.pause = vi.fn();
  this.load = vi.fn();
  this.addEventListener = vi.fn();
  this.removeEventListener = vi.fn();
}) as unknown as typeof Audio;

// --- window.open mock ---
window.open = vi.fn();

// --- EventSource mock ---
class MockEventSource {
  url: string;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  readyState = 0;
  close = vi.fn();

  constructor(url: string) {
    this.url = url;
  }

  simulateMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  simulateOpen() {
    this.readyState = 1;
    this.onopen?.();
  }

  simulateError() {
    this.onerror?.();
  }
}

(globalThis as unknown as { EventSource: typeof MockEventSource }).EventSource = MockEventSource;

// --- ResizeObserver mock (not implemented by jsdom) ---
class MockResizeObserver {
  callback: () => void;
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();

  constructor(callback: () => void) {
    this.callback = callback;
  }
}

(globalThis as unknown as { ResizeObserver: typeof MockResizeObserver }).ResizeObserver =
  MockResizeObserver;

// --- BroadcastChannel mock ---
const broadcastChannels = new Map<string, Set<MockBroadcastChannel>>();

class MockBroadcastChannel {
  name: string;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  close = vi.fn(() => {
    broadcastChannels.get(this.name)?.delete(this);
  });

  constructor(name: string) {
    this.name = name;
    if (!broadcastChannels.has(name)) {
      broadcastChannels.set(name, new Set());
    }
    broadcastChannels.get(name)!.add(this);
  }

  postMessage(data: unknown) {
    const channels = broadcastChannels.get(this.name);
    if (!channels) return;
    for (const ch of channels) {
      if (ch !== this && ch.onmessage) {
        ch.onmessage({ data });
      }
    }
  }
}

(globalThis as unknown as { BroadcastChannel: typeof MockBroadcastChannel }).BroadcastChannel = MockBroadcastChannel;

afterEach(() => {
  broadcastChannels.clear();
});
