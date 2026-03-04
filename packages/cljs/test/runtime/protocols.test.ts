import { describe, it, expect } from 'vitest';
import { defprotocol, protocolFn } from '../../src/runtime/protocols.js';

describe('defprotocol', () => {
  it('creates a protocol with method symbols', () => {
    const IFoo = defprotocol('IFoo', ['foo', 'bar']);
    expect(IFoo.name).toBe('IFoo');
    expect(typeof IFoo.methods.foo).toBe('symbol');
    expect(typeof IFoo.methods.bar).toBe('symbol');
    expect(typeof IFoo.satisfies).toBe('symbol');
  });

  it('creates unique symbols per protocol', () => {
    const A = defprotocol('A', ['m']);
    const B = defprotocol('B', ['m']);
    expect(A.methods.m).not.toBe(B.methods.m);
  });
});

describe('protocolFn', () => {
  it('dispatches via symbol key on target', () => {
    const IFoo = defprotocol('IFoo', ['greet']);
    const greet = protocolFn(IFoo, 'greet');

    const obj = { [IFoo.methods.greet]() { return 'hello'; } };
    expect(greet(obj)).toBe('hello');
  });

  it('passes extra args to the method', () => {
    const IFoo = defprotocol('IFoo', ['add']);
    const add = protocolFn(IFoo, 'add');

    const obj = { [IFoo.methods.add](x: number) { return x + 1; } };
    expect(add(obj, 10)).toBe(11);
  });

  it('throws when no implementation found', () => {
    const IFoo = defprotocol('IFoo', ['missing']);
    const missing = protocolFn(IFoo, 'missing');

    expect(() => missing({})).toThrow('No protocol method');
  });

  it('works with class prototypes', () => {
    const IFoo = defprotocol('IFoo', ['value']);
    const value = protocolFn(IFoo, 'value');

    class MyClass {
      x: number;
      constructor(x: number) { this.x = x; }
      [IFoo.methods.value]() { return this.x; }
    }

    expect(value(new MyClass(42))).toBe(42);
  });

  it('handles null/undefined target', () => {
    const IFoo = defprotocol('IFoo', ['f']);
    const f = protocolFn(IFoo, 'f');

    expect(() => f(null)).toThrow();
    expect(() => f(undefined)).toThrow();
  });
});
