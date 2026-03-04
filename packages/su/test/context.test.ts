import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { provide, useContext } from '../src/context.js';
import { setHost } from '../src/lifecycle.js';

// Minimal DOM mock with event propagation support
type Listener = (e: unknown) => void;
type MockElement = {
  parentNode: MockElement | null;
  listeners: Map<string, Listener[]>;
  addEventListener(type: string, fn: Listener): void;
  dispatchEvent(e: MockCustomEvent): boolean;
};

type MockCustomEvent = {
  type: string;
  detail: unknown;
  bubbles: boolean;
  composed: boolean;
  stopped: boolean;
  stopPropagation(): void;
};

function createMockElement(): MockElement {
  const el: MockElement = {
    parentNode: null,
    listeners: new Map(),
    addEventListener(type: string, fn: Listener) {
      if (!el.listeners.has(type)) el.listeners.set(type, []);
      el.listeners.get(type)!.push(fn);
    },
    dispatchEvent(e: MockCustomEvent) {
      // Fire local listeners
      for (const fn of el.listeners.get(e.type) ?? []) {
        if (e.stopped) break;
        fn(e);
      }
      // Bubble up
      if (e.bubbles && !e.stopped && el.parentNode) {
        el.parentNode.dispatchEvent(e);
      }
      return true;
    },
  };
  return el;
}

function createMockCustomEvent(type: string, init: { detail: unknown; bubbles?: boolean; composed?: boolean }): MockCustomEvent {
  return {
    type,
    detail: init.detail,
    bubbles: init.bubbles ?? false,
    composed: init.composed ?? false,
    stopped: false,
    stopPropagation() { this.stopped = true; },
  };
}

describe('Context API', () => {
  let host: MockElement;
  let parent: MockElement;

  beforeEach(() => {
    host = createMockElement();
    parent = createMockElement();
    host.parentNode = parent;

    vi.stubGlobal('CustomEvent', class {
      type: string;
      detail: unknown;
      bubbles: boolean;
      composed: boolean;
      stopped = false;
      constructor(type: string, init: { detail: unknown; bubbles?: boolean; composed?: boolean }) {
        this.type = type;
        this.detail = init.detail;
        this.bubbles = init.bubbles ?? false;
        this.composed = init.composed ?? false;
      }
      stopPropagation() { this.stopped = true; }
    });
  });

  afterEach(() => {
    setHost(null);
    vi.unstubAllGlobals();
  });

  it('provide + useContext round-trip', () => {
    setHost(parent as unknown as HTMLElement);
    provide('theme', 'dark');

    setHost(host as unknown as HTMLElement);
    const result = useContext('theme');
    expect(result).toBe('dark');
  });

  it('returns undefined when no provider', () => {
    setHost(host as unknown as HTMLElement);
    const result = useContext('missing-key');
    expect(result).toBeUndefined();
  });

  it('nested providers: closest wins', () => {
    const grandparent = createMockElement();
    parent.parentNode = grandparent;

    setHost(grandparent as unknown as HTMLElement);
    provide('theme', 'light');

    setHost(parent as unknown as HTMLElement);
    provide('theme', 'dark');

    setHost(host as unknown as HTMLElement);
    const result = useContext('theme');
    expect(result).toBe('dark');
  });

  it('throws when provide called outside component', () => {
    setHost(null);
    expect(() => provide('key', 'val')).toThrow('provide');
  });

  it('throws when useContext called outside component', () => {
    setHost(null);
    expect(() => useContext('key')).toThrow('useContext');
  });

  it('different keys do not interfere', () => {
    setHost(parent as unknown as HTMLElement);
    provide('theme', 'dark');
    provide('locale', 'en');

    setHost(host as unknown as HTMLElement);
    expect(useContext('theme')).toBe('dark');
    expect(useContext('locale')).toBe('en');
  });
});
