import { describe, it, expect } from 'vitest';
import { atom, isAtom } from '../../src/runtime/atom.js';

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
