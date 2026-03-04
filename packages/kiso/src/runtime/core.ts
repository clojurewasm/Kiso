// Core functions — cljs.core equivalents for compiled Clojure code.
//
// These functions are used by compiled output and by the runtime itself.
// They implement Clojure semantics (truthiness, nil handling, etc.).

import { isList, cons as listCons, count as listCount, EMPTY_LIST, list } from './list.js';
import { isVector, PersistentVector } from './vector.js';
import { isHashMap, PersistentHashMap } from './hash-map.js';
import { isHashSet, PersistentHashSet } from './hash-set.js';
import { isKeyword, type Keyword } from './keyword.js';
import { isSymbol, type Sym } from './symbol.js';
import { equiv } from './equiv.js';
import { seq, first as seqFirst, next as seqNext } from './seq.js';

// -- Truthiness --

export function truthy(x: unknown): boolean {
  return x !== null && x !== undefined && x !== false;
}

const isTruthy = truthy;

// -- Arithmetic --

export function add(...args: number[]): number {
  let sum = 0;
  for (let i = 0; i < args.length; i++) sum += args[i]!;
  return sum;
}

export function subtract(first: number, ...rest: number[]): number {
  if (rest.length === 0) return -first;
  let result = first;
  for (let i = 0; i < rest.length; i++) result -= rest[i]!;
  return result;
}

export function multiply(...args: number[]): number {
  let product = 1;
  for (let i = 0; i < args.length; i++) product *= args[i]!;
  return product;
}

export function divide(a: number, b: number): number {
  return a / b;
}

export function mod(a: number, b: number): number {
  // Clojure mod: result has same sign as divisor
  return ((a % b) + b) % b;
}

export function inc(n: number): number { return n + 1; }
export function dec(n: number): number { return n - 1; }

// -- Comparison --

export function lt(a: number, b: number): boolean { return a < b; }
export function gt(a: number, b: number): boolean { return a > b; }
export function lte(a: number, b: number): boolean { return a <= b; }
export function gte(a: number, b: number): boolean { return a >= b; }

export function eq(a: unknown, b: unknown): boolean {
  return equiv(a, b);
}

export function not_eq(a: unknown, b: unknown): boolean {
  return !equiv(a, b);
}

// -- Predicates --

export function nil_p(x: unknown): boolean {
  return x === null || x === undefined;
}

export function some_p(x: unknown): boolean {
  return x !== null && x !== undefined;
}

export function not(x: unknown): boolean {
  return !isTruthy(x);
}

export function zero_p(n: number): boolean { return n === 0; }
export function pos_p(n: number): boolean { return n > 0; }
export function neg_p(n: number): boolean { return n < 0; }

export function number_p(x: unknown): boolean { return typeof x === 'number'; }
export function string_p(x: unknown): boolean { return typeof x === 'string'; }
export function boolean_p(x: unknown): boolean { return typeof x === 'boolean'; }

// -- String --

export function str(...args: unknown[]): string {
  let result = '';
  for (const a of args) {
    if (a !== null && a !== undefined) result += String(a);
  }
  return result;
}

// -- Collection operations --

export function count(coll: unknown): number {
  if (coll === null || coll === undefined) return 0;
  if (typeof coll === 'string') return coll.length;
  if (Array.isArray(coll)) return coll.length;
  if (isList(coll)) return listCount(coll);
  if (isVector(coll)) return (coll as PersistentVector).count;
  if (isHashMap(coll)) return (coll as PersistentHashMap).count;
  if (isHashSet(coll)) return (coll as PersistentHashSet).count;
  return 0;
}

export function conj(coll: unknown, ...items: unknown[]): unknown {
  let result = coll;
  for (const item of items) {
    if (result === null || result === undefined) {
      result = list(item);
    } else if (isVector(result)) {
      result = (result as PersistentVector).conj(item);
    } else if (isList(result)) {
      result = listCons(item, result);
    } else if (isHashSet(result)) {
      result = (result as PersistentHashSet).conj(item);
    } else {
      result = listCons(item, EMPTY_LIST);
    }
  }
  return result;
}

export function get(coll: unknown, key: unknown, notFound?: unknown): unknown {
  const defaultVal = notFound !== undefined ? notFound : null;
  if (coll === null || coll === undefined) return defaultVal;
  if (isHashMap(coll)) {
    const v = (coll as PersistentHashMap).get(key);
    return v !== undefined ? v : defaultVal;
  }
  if (isVector(coll) && typeof key === 'number') {
    const v = (coll as PersistentVector).nth(key);
    return v !== undefined ? v : defaultVal;
  }
  if (isHashSet(coll)) {
    return (coll as PersistentHashSet).has(key) ? key : defaultVal;
  }
  return defaultVal;
}

export function assoc(coll: unknown, key: unknown, val: unknown): unknown {
  if (isHashMap(coll)) {
    return (coll as PersistentHashMap).assoc(key, val);
  }
  if (isVector(coll) && typeof key === 'number') {
    return (coll as PersistentVector).assocN(key, val);
  }
  throw new Error('assoc not supported on this type');
}

export function dissoc(coll: unknown, ...keys: unknown[]): unknown {
  if (!isHashMap(coll)) throw new Error('dissoc requires a map');
  let m = coll as PersistentHashMap;
  for (const k of keys) {
    m = m.dissoc(k);
  }
  return m;
}

// -- Higher-order --

export function map(f: (...args: unknown[]) => unknown, coll: unknown): unknown {
  const result: unknown[] = [];
  let s = seq(coll);
  while (s !== null) {
    result.push(f(seqFirst(s)));
    s = seqNext(s);
  }
  // Return a list for now (lazy seqs later)
  return list(...result);
}

export function filter(pred: (x: unknown) => unknown, coll: unknown): unknown {
  const result: unknown[] = [];
  let s = seq(coll);
  while (s !== null) {
    const v = seqFirst(s);
    if (isTruthy(pred(v))) result.push(v);
    s = seqNext(s);
  }
  return list(...result);
}

export function reduce(f: (...args: unknown[]) => unknown, ...args: unknown[]): unknown {
  let init: unknown;
  let coll: unknown;
  if (args.length === 2) {
    init = args[0];
    coll = args[1];
  } else {
    coll = args[0];
    const s = seq(coll);
    if (s === null) return f();
    init = seqFirst(s);
    coll = seqNext(s);
  }

  let acc = init;
  let s = seq(coll);
  while (s !== null) {
    acc = f(acc, seqFirst(s));
    s = seqNext(s);
  }
  return acc;
}

export function apply(f: (...args: unknown[]) => unknown, args: unknown): unknown {
  const arr: unknown[] = [];
  let s = seq(args);
  while (s !== null) {
    arr.push(seqFirst(s));
    s = seqNext(s);
  }
  return f(...arr);
}

// -- Function utilities --

export function identity(x: unknown): unknown { return x; }

export function constantly(x: unknown): (...args: unknown[]) => unknown {
  return () => x;
}

export function comp(...fns: ((...args: unknown[]) => unknown)[]): (...args: unknown[]) => unknown {
  if (fns.length === 0) return identity;
  if (fns.length === 1) return fns[0]!;
  return (...args: unknown[]) => {
    let result = fns[fns.length - 1]!(...args);
    for (let i = fns.length - 2; i >= 0; i--) {
      result = fns[i]!(result);
    }
    return result;
  };
}

export function partial(f: (...args: unknown[]) => unknown, ...bound: unknown[]): (...args: unknown[]) => unknown {
  return (...args: unknown[]) => f(...bound, ...args);
}

/** Return the name part of a keyword, symbol, or string. */
export function name(x: unknown): string {
  if (typeof x === 'string') return x;
  if (isKeyword(x)) return (x as Keyword).name;
  if (isSymbol(x)) return (x as Sym).name;
  throw new Error(`name: unsupported type ${typeof x}`);
}
