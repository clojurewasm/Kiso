import { describe, it, expect } from 'vitest';
import { atom } from '@clojurewasm/kiso/runtime';
import { track, effect, computed, initReactiveTracking } from '../src/reactive.js';

// Initialize tracking hook on atom
initReactiveTracking();

describe('track', () => {
  it('records atoms that are dereffed during fn execution', () => {
    const a = atom(1);
    const b = atom(2);
    const [result, deps] = track(() => {
      return (a.deref() as number) + (b.deref() as number);
    });
    expect(result).toBe(3);
    expect(deps.size).toBe(2);
    expect(deps.has(a)).toBe(true);
    expect(deps.has(b)).toBe(true);
  });

  it('returns empty deps when no atoms are dereffed', () => {
    const [result, deps] = track(() => 42);
    expect(result).toBe(42);
    expect(deps.size).toBe(0);
  });

  it('nests tracking correctly', () => {
    const a = atom(1);
    const b = atom(2);
    let innerDeps: Set<unknown> | null = null;
    const [_, outerDeps] = track(() => {
      a.deref();
      const [__, inner] = track(() => {
        b.deref();
      });
      innerDeps = inner;
    });
    expect(outerDeps.has(a)).toBe(true);
    expect(outerDeps.has(b)).toBe(false); // b was tracked by inner
    expect(innerDeps!.has(b)).toBe(true);
  });
});

describe('effect', () => {
  it('runs the function immediately', () => {
    let ran = 0;
    const dispose = effect(() => { ran++; });
    expect(ran).toBe(1);
    dispose();
  });

  it('re-runs when a tracked atom changes', () => {
    const a = atom(0);
    let value = 0;
    const dispose = effect(() => {
      value = a.deref() as number;
    });
    expect(value).toBe(0);
    a.reset(42);
    expect(value).toBe(42);
    dispose();
  });

  it('stops re-running after dispose', () => {
    const a = atom(0);
    let runs = 0;
    const dispose = effect(() => {
      a.deref();
      runs++;
    });
    expect(runs).toBe(1);
    dispose();
    a.reset(1);
    expect(runs).toBe(1); // no re-run
  });

  it('re-tracks dependencies on each run', () => {
    const a = atom(true);
    const b = atom(10);
    const c = atom(20);
    let value = 0;
    const dispose = effect(() => {
      if (a.deref()) {
        value = b.deref() as number;
      } else {
        value = c.deref() as number;
      }
    });
    expect(value).toBe(10);
    a.reset(false);
    expect(value).toBe(20);
    // Now c is tracked, b is not
    b.reset(99);
    expect(value).toBe(20); // b change doesn't trigger
    c.reset(30);
    expect(value).toBe(30); // c change triggers
    dispose();
  });
});

describe('computed', () => {
  it('returns derived value', () => {
    const a = atom(2);
    const doubled = computed(() => (a.deref() as number) * 2);
    expect(doubled.deref()).toBe(4);
  });

  it('updates when dependency changes', () => {
    const a = atom(3);
    const tripled = computed(() => (a.deref() as number) * 3);
    expect(tripled.deref()).toBe(9);
    a.reset(5);
    expect(tripled.deref()).toBe(15);
  });

  it('is trackable in effects', () => {
    const a = atom(1);
    const doubled = computed(() => (a.deref() as number) * 2);
    let value = 0;
    const dispose = effect(() => {
      value = doubled.deref() as number;
    });
    expect(value).toBe(2);
    a.reset(5);
    expect(value).toBe(10);
    dispose();
  });
});
