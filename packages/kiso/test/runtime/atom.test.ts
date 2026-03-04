import { describe, it, expect, afterEach } from 'vitest';
import { atom, Atom, isAtom } from '../../src/runtime/atom.js';

describe('atom creation', () => {
  it('creates atom with initial value', () => {
    const a = atom(42);
    expect(a.deref()).toBe(42);
  });

  it('creates atom with null', () => {
    const a = atom(null);
    expect(a.deref()).toBe(null);
  });
});

describe('reset!', () => {
  it('sets new value', () => {
    const a = atom(1);
    a.reset(2);
    expect(a.deref()).toBe(2);
  });

  it('returns new value', () => {
    const a = atom(1);
    expect(a.reset(99)).toBe(99);
  });
});

describe('swap!', () => {
  it('applies function to current value', () => {
    const a = atom(1);
    a.swap((v: number) => v + 1);
    expect(a.deref()).toBe(2);
  });

  it('passes extra args to function', () => {
    const a = atom(10);
    a.swap((v: number, x: number) => v + x, 5);
    expect(a.deref()).toBe(15);
  });

  it('returns new value', () => {
    const a = atom(1);
    expect(a.swap((v: number) => v * 10)).toBe(10);
  });
});

describe('compareAndSet', () => {
  it('sets if current matches old value', () => {
    const a = atom(1);
    expect(a.compareAndSet(1, 2)).toBe(true);
    expect(a.deref()).toBe(2);
  });

  it('does not set if current differs', () => {
    const a = atom(1);
    expect(a.compareAndSet(99, 2)).toBe(false);
    expect(a.deref()).toBe(1);
  });
});

describe('_onDeref hook', () => {
  it('calls _onDeref when deref is called', () => {
    const a = atom(42);
    const calls: unknown[] = [];
    a._onDeref = (target) => calls.push(target);
    a.deref();
    expect(calls).toEqual([a]);
  });

  it('does not call when _onDeref is not set', () => {
    const a = atom(42);
    // Should not throw
    expect(a.deref()).toBe(42);
  });
});

describe('addWatch / removeWatch', () => {
  it('notifies watchers on reset', () => {
    const a = atom(1);
    const calls: unknown[][] = [];
    a.addWatch('w1', (key, _ref, oldVal, newVal) => {
      calls.push([key, oldVal, newVal]);
    });
    a.reset(2);
    expect(calls).toEqual([['w1', 1, 2]]);
  });

  it('notifies watchers on swap', () => {
    const a = atom(10);
    const calls: unknown[][] = [];
    a.addWatch('w1', (_k, _r, oldVal, newVal) => {
      calls.push([oldVal, newVal]);
    });
    a.swap((v: number) => v + 5);
    expect(calls).toEqual([[10, 15]]);
  });

  it('removeWatch stops notifications', () => {
    const a = atom(1);
    const calls: unknown[] = [];
    a.addWatch('w1', () => calls.push('called'));
    a.reset(2);
    expect(calls.length).toBe(1);
    a.removeWatch('w1');
    a.reset(3);
    expect(calls.length).toBe(1); // not called again
  });

  it('addWatch returns unsubscribe function', () => {
    const a = atom(1);
    const calls: unknown[] = [];
    const unsub = a.addWatch('w1', () => calls.push('called'));
    a.reset(2);
    expect(calls.length).toBe(1);
    unsub();
    a.reset(3);
    expect(calls.length).toBe(1); // unsubscribed
  });
});

describe('atom label', () => {
  it('creates atom with label', () => {
    const a = atom(42, 'counter');
    expect(a.label).toBe('counter');
  });

  it('label is undefined when not provided', () => {
    const a = atom(42);
    expect(a.label).toBeUndefined();
  });
});

describe('_globalOnChange', () => {
  afterEach(() => {
    Atom._globalOnChange = undefined;
  });

  it('calls _globalOnChange on reset', () => {
    const calls: unknown[][] = [];
    Atom._globalOnChange = (a, oldVal, newVal) => calls.push([a, oldVal, newVal]);
    const a = atom(1);
    a.reset(2);
    expect(calls).toHaveLength(1);
    expect(calls[0]![1]).toBe(1);
    expect(calls[0]![2]).toBe(2);
  });

  it('calls _globalOnChange on swap', () => {
    const calls: unknown[][] = [];
    Atom._globalOnChange = (a, oldVal, newVal) => calls.push([a, oldVal, newVal]);
    const a = atom(10);
    a.swap((v: number) => v + 5);
    expect(calls).toHaveLength(1);
    expect(calls[0]![1]).toBe(10);
    expect(calls[0]![2]).toBe(15);
  });

  it('does not call when _globalOnChange is not set', () => {
    const a = atom(1);
    a.reset(2); // should not throw
    expect(a.deref()).toBe(2);
  });
});

describe('isAtom', () => {
  it('true for atoms', () => {
    expect(isAtom(atom(1))).toBe(true);
  });

  it('false for other values', () => {
    expect(isAtom(1)).toBe(false);
    expect(isAtom(null)).toBe(false);
    expect(isAtom({})).toBe(false);
  });
});
