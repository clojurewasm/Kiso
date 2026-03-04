// Core functions — cljs.core equivalents for compiled Clojure code.
//
// These functions are used by compiled output and by the runtime itself.
// They implement Clojure semantics (truthiness, nil handling, etc.).

import { isList, cons as listCons, count as listCount, EMPTY_LIST, list } from './list.js';
import { isVector, PersistentVector, vector } from './vector.js';
import { isHashMap, PersistentHashMap, hashMap as hm } from './hash-map.js';
import { isHashSet, PersistentHashSet, hashSet } from './hash-set.js';
import { isKeyword, type Keyword } from './keyword.js';
import { isSymbol, type Sym } from './symbol.js';
import { equiv } from './equiv.js';
import { seq, first as seqFirst, next as seqNext } from './seq.js';
import { isSortedMap, PersistentTreeMap, EMPTY_SORTED_MAP } from './sorted-map.js';
import { isSortedSet, PersistentTreeSet, EMPTY_SORTED_SET } from './sorted-set.js';

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
  if (isSortedMap(coll)) return (coll as PersistentTreeMap).count;
  if (isSortedSet(coll)) return (coll as PersistentTreeSet).count;
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
    } else if (isSortedSet(result)) {
      result = (result as PersistentTreeSet).conj(item);
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
  if (isSortedMap(coll)) {
    const v = (coll as PersistentTreeMap).get(key);
    return v !== undefined ? v : defaultVal;
  }
  if (isSortedSet(coll)) {
    return (coll as PersistentTreeSet).has(key) ? key : defaultVal;
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
  if (isSortedMap(coll)) {
    return (coll as PersistentTreeMap).assoc(key, val);
  }
  throw new Error('assoc not supported on this type');
}

export function dissoc(coll: unknown, ...keys: unknown[]): unknown {
  if (isSortedMap(coll)) {
    let m = coll as PersistentTreeMap;
    for (const k of keys) { m = m.dissoc(k); }
    return m;
  }
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

// -- Map operations --

export function get_in(m: unknown, ks: unknown, notFound?: unknown): unknown {
  let result = m;
  let s = seq(ks);
  while (s !== null) {
    result = get(result, seqFirst(s));
    if (result === null || result === undefined) {
      return s !== null && seqNext(s) !== null ? (notFound !== undefined ? notFound : null) : (result === null && notFound !== undefined ? notFound : result);
    }
    s = seqNext(s);
  }
  return result;
}

export function assoc_in(m: unknown, ks: unknown, v: unknown): unknown {
  const arr: unknown[] = [];
  let s = seq(ks);
  while (s !== null) { arr.push(seqFirst(s)); s = seqNext(s); }
  if (arr.length === 1) return assoc(m ?? hm(), arr[0], v);
  return assoc(m ?? hm(), arr[0], assoc_in(get(m, arr[0]), vector(...arr.slice(1)), v));
}

export function update(m: unknown, k: unknown, f: (...args: unknown[]) => unknown, ...args: unknown[]): unknown {
  return assoc(m, k, f(get(m, k), ...args));
}

export function update_in(m: unknown, ks: unknown, f: (...args: unknown[]) => unknown, ...args: unknown[]): unknown {
  const arr: unknown[] = [];
  let s = seq(ks);
  while (s !== null) { arr.push(seqFirst(s)); s = seqNext(s); }
  if (arr.length === 1) return update(m, arr[0], f, ...args);
  return assoc(m ?? hm(), arr[0], update_in(get(m, arr[0]), vector(...arr.slice(1)), f, ...args));
}

export function keys(m: unknown): unknown {
  if (m === null || m === undefined) return null;
  if (!isHashMap(m)) return null;
  const ks: unknown[] = [];
  (m as PersistentHashMap).forEach((k) => ks.push(k));
  return list(...ks);
}

export function vals(m: unknown): unknown {
  if (m === null || m === undefined) return null;
  if (!isHashMap(m)) return null;
  const vs: unknown[] = [];
  (m as PersistentHashMap).forEach((_, v) => vs.push(v));
  return list(...vs);
}

export function merge(...maps: unknown[]): unknown {
  let result: PersistentHashMap | null = null;
  for (const m of maps) {
    if (m === null || m === undefined) continue;
    if (result === null) { result = m as PersistentHashMap; continue; }
    (m as PersistentHashMap).forEach((k, v) => { result = result!.assoc(k, v); });
  }
  return result;
}

export function select_keys(m: unknown, ks: unknown): unknown {
  let result = hm();
  let s = seq(ks);
  while (s !== null) {
    const k = seqFirst(s);
    const v = get(m, k);
    if (v !== null || (isHashMap(m) && (m as PersistentHashMap).has(k))) {
      result = result.assoc(k, v);
    }
    s = seqNext(s);
  }
  return result;
}

export function find(m: unknown, k: unknown): unknown {
  if (!isHashMap(m)) return null;
  const hm = m as PersistentHashMap;
  if (!hm.has(k)) return null;
  return vector(k, hm.get(k));
}

// -- Numeric --

export function max(...args: number[]): number { return Math.max(...args); }
export function min(...args: number[]): number { return Math.min(...args); }
export function abs(n: number): number { return Math.abs(n); }
export function even_p(n: number): boolean { return n % 2 === 0; }
export function odd_p(n: number): boolean { return n % 2 !== 0; }
export function rem(a: number, b: number): number { return a % b; }
export function rand(): number { return Math.random(); }
export function rand_int(n: number): number { return Math.floor(Math.random() * n); }

// -- Seq operations --

export function take(n: number, coll: unknown): unknown {
  const result: unknown[] = [];
  let s = seq(coll);
  let i = 0;
  while (s !== null && i < n) {
    result.push(seqFirst(s));
    s = seqNext(s);
    i++;
  }
  return list(...result);
}

export function drop(n: number, coll: unknown): unknown {
  let s = seq(coll);
  let i = 0;
  while (s !== null && i < n) { s = seqNext(s); i++; }
  const result: unknown[] = [];
  while (s !== null) { result.push(seqFirst(s)); s = seqNext(s); }
  return list(...result);
}

export function take_while(pred: (x: unknown) => unknown, coll: unknown): unknown {
  const result: unknown[] = [];
  let s = seq(coll);
  while (s !== null) {
    const v = seqFirst(s);
    if (!isTruthy(pred(v))) break;
    result.push(v);
    s = seqNext(s);
  }
  return list(...result);
}

export function drop_while(pred: (x: unknown) => unknown, coll: unknown): unknown {
  let s = seq(coll);
  while (s !== null && isTruthy(pred(seqFirst(s)))) { s = seqNext(s); }
  const result: unknown[] = [];
  while (s !== null) { result.push(seqFirst(s)); s = seqNext(s); }
  return list(...result);
}

export function some(pred: (x: unknown) => unknown, coll: unknown): unknown {
  let s = seq(coll);
  while (s !== null) {
    const result = pred(seqFirst(s));
    if (isTruthy(result)) return result;
    s = seqNext(s);
  }
  return null;
}

export function every_p(pred: (x: unknown) => unknown, coll: unknown): boolean {
  let s = seq(coll);
  while (s !== null) {
    if (!isTruthy(pred(seqFirst(s)))) return false;
    s = seqNext(s);
  }
  return true;
}

export function not_every_p(pred: (x: unknown) => unknown, coll: unknown): boolean {
  return !every_p(pred, coll);
}

export function not_any_p(pred: (x: unknown) => unknown, coll: unknown): boolean {
  return !some(pred, coll);
}

export function sort(...args: unknown[]): unknown {
  let comp: ((a: unknown, b: unknown) => number) | null = null;
  let coll: unknown;
  if (args.length === 1) { coll = args[0]; }
  else { comp = args[0] as (a: unknown, b: unknown) => number; coll = args[1]; }
  const arr: unknown[] = [];
  let s = seq(coll);
  while (s !== null) { arr.push(seqFirst(s)); s = seqNext(s); }
  arr.sort(comp ?? ((a, b) => (a as number) < (b as number) ? -1 : (a as number) > (b as number) ? 1 : 0));
  return list(...arr);
}

export function sort_by(keyfn: (x: unknown) => unknown, ...args: unknown[]): unknown {
  let comp: ((a: unknown, b: unknown) => number) | null = null;
  let coll: unknown;
  if (args.length === 1) { coll = args[0]; }
  else { comp = args[0] as (a: unknown, b: unknown) => number; coll = args[1]; }
  const arr: unknown[] = [];
  let s = seq(coll);
  while (s !== null) { arr.push(seqFirst(s)); s = seqNext(s); }
  const defaultComp = (a: unknown, b: unknown) => (a as number) < (b as number) ? -1 : (a as number) > (b as number) ? 1 : 0;
  arr.sort((a, b) => (comp ?? defaultComp)(keyfn(a), keyfn(b)));
  return list(...arr);
}

export function reverse(coll: unknown): unknown {
  const arr: unknown[] = [];
  let s = seq(coll);
  while (s !== null) { arr.push(seqFirst(s)); s = seqNext(s); }
  arr.reverse();
  return list(...arr);
}

export function range(...args: number[]): unknown {
  let start = 0, end: number, step = 1;
  if (args.length === 1) { end = args[0]!; }
  else if (args.length === 2) { start = args[0]!; end = args[1]!; }
  else { start = args[0]!; end = args[1]!; step = args[2]!; }
  const result: number[] = [];
  if (step > 0) { for (let i = start; i < end; i += step) result.push(i); }
  else if (step < 0) { for (let i = start; i > end; i += step) result.push(i); }
  return list(...result);
}

export function repeat(n: number, x: unknown): unknown {
  const result: unknown[] = [];
  for (let i = 0; i < n; i++) result.push(x);
  return list(...result);
}

export function repeatedly(n: number, f: () => unknown): unknown {
  const result: unknown[] = [];
  for (let i = 0; i < n; i++) result.push(f());
  return list(...result);
}

export function group_by(f: (x: unknown) => unknown, coll: unknown): unknown {
  let result = hm();
  let s = seq(coll);
  while (s !== null) {
    const v = seqFirst(s);
    const k = f(v);
    const existing = result.get(k);
    const group = existing !== undefined ? (existing as PersistentVector).conj(v) : vector(v);
    result = result.assoc(k, group);
    s = seqNext(s);
  }
  return result;
}

export function frequencies(coll: unknown): unknown {
  let result = hm();
  let s = seq(coll);
  while (s !== null) {
    const v = seqFirst(s);
    const existing = result.get(v);
    result = result.assoc(v, (existing !== undefined ? (existing as number) : 0) + 1);
    s = seqNext(s);
  }
  return result;
}

// -- Predicates --

export function fn_p(x: unknown): boolean { return typeof x === 'function'; }
export function integer_p(x: unknown): boolean { return typeof x === 'number' && Number.isInteger(x); }
export function coll_p(x: unknown): boolean { return isVector(x) || isList(x) || isHashMap(x) || isHashSet(x) || isSortedMap(x) || isSortedSet(x); }
export function sequential_p(x: unknown): boolean { return isVector(x) || isList(x); }
export function associative_p(x: unknown): boolean { return isHashMap(x) || isVector(x) || isSortedMap(x); }
export function identical_p(a: unknown, b: unknown): boolean { return a === b; }

// -- Higher-order --

export function complement(f: (...args: unknown[]) => unknown): (...args: unknown[]) => boolean {
  return (...args: unknown[]) => !isTruthy(f(...args));
}

export function juxt(...fns: ((...args: unknown[]) => unknown)[]): (...args: unknown[]) => unknown {
  return (...args: unknown[]) => vector(...fns.map(f => f(...args)));
}

export function every_pred(...preds: ((...args: unknown[]) => unknown)[]): (...args: unknown[]) => boolean {
  return (...args: unknown[]) => {
    for (const p of preds) {
      for (const a of args) {
        if (!isTruthy(p(a))) return false;
      }
    }
    return true;
  };
}

export function some_fn(...preds: ((...args: unknown[]) => unknown)[]): (...args: unknown[]) => unknown {
  return (...args: unknown[]) => {
    for (const p of preds) {
      for (const a of args) {
        const result = p(a);
        if (isTruthy(result)) return result;
      }
    }
    return null;
  };
}

export function memoize(f: (...args: unknown[]) => unknown): (...args: unknown[]) => unknown {
  const cache = new Map<string, unknown>();
  return (...args: unknown[]) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = f(...args);
    cache.set(key, result);
    return result;
  };
}

// -- Printing --

export function println(...args: unknown[]): void {
  console.log(args.map(a => a === null || a === undefined ? '' : String(a)).join(' '));
}

export function print_fn(...args: unknown[]): void {
  // In browser/Node, use process.stdout if available, else console.log without newline
  const s = args.map(a => a === null || a === undefined ? '' : String(a)).join(' ');
  if (typeof process !== 'undefined' && process.stdout) {
    process.stdout.write(s);
  } else {
    console.log(s);
  }
}

// -- Collection access --

export function second(coll: unknown): unknown {
  const s = seq(coll);
  if (s === null) return null;
  const n = seqNext(s);
  return n === null ? null : seqFirst(n);
}

export function last(coll: unknown): unknown {
  let s = seq(coll);
  if (s === null) return null;
  let result: unknown = null;
  while (s !== null) { result = seqFirst(s); s = seqNext(s); }
  return result;
}

export function butlast(coll: unknown): unknown {
  const arr: unknown[] = [];
  let s = seq(coll);
  if (s === null) return null;
  let next = seqNext(s);
  while (next !== null) { arr.push(seqFirst(s)!); s = next; next = seqNext(s); }
  return arr.length === 0 ? null : list(...arr);
}

export function peek(coll: unknown): unknown {
  if (isVector(coll)) return (coll as PersistentVector).count > 0 ? (coll as PersistentVector).nth((coll as PersistentVector).count - 1) : null;
  if (isList(coll)) return seqFirst(coll);
  return null;
}

export function pop(coll: unknown): unknown {
  if (isVector(coll)) return (coll as PersistentVector).pop();
  if (isList(coll)) return (coll as any)._rest ?? EMPTY_LIST;
  throw new Error('pop not supported on this type');
}

export function subvec(v: unknown, start: number, end?: number): unknown {
  const vec = v as PersistentVector;
  const e = end !== undefined ? end : vec.count;
  const result: unknown[] = [];
  for (let i = start; i < e; i++) result.push(vec.nth(i));
  return vector(...result);
}

export function not_empty(coll: unknown): unknown {
  if (coll === null || coll === undefined) return null;
  return count(coll) === 0 ? null : coll;
}

// -- Seq operations batch 2 --

export function mapcat(f: (...args: unknown[]) => unknown, coll: unknown): unknown {
  const result: unknown[] = [];
  let s = seq(coll);
  while (s !== null) {
    const mapped = f(seqFirst(s));
    let ms = seq(mapped);
    while (ms !== null) { result.push(seqFirst(ms)); ms = seqNext(ms); }
    s = seqNext(s);
  }
  return list(...result);
}

export function map_indexed(f: (i: number, v: unknown) => unknown, coll: unknown): unknown {
  const result: unknown[] = [];
  let s = seq(coll);
  let i = 0;
  while (s !== null) { result.push(f(i++, seqFirst(s))); s = seqNext(s); }
  return list(...result);
}

export function remove(pred: (x: unknown) => unknown, coll: unknown): unknown {
  return filter((x: unknown) => !isTruthy(pred(x)), coll);
}

export function keep(f: (x: unknown) => unknown, coll: unknown): unknown {
  const result: unknown[] = [];
  let s = seq(coll);
  while (s !== null) {
    const v = f(seqFirst(s));
    if (v !== null && v !== undefined) result.push(v);
    s = seqNext(s);
  }
  return list(...result);
}

export function flatten(coll: unknown): unknown {
  const result: unknown[] = [];
  function walk(x: unknown): void {
    if (x === null || x === undefined) return;
    if (isVector(x) || isList(x)) {
      let s = seq(x);
      while (s !== null) { walk(seqFirst(s)); s = seqNext(s); }
    } else {
      result.push(x);
    }
  }
  let s = seq(coll);
  while (s !== null) { walk(seqFirst(s)); s = seqNext(s); }
  return list(...result);
}

export function distinct(coll: unknown): unknown {
  const seen = new Set<unknown>();
  const result: unknown[] = [];
  let s = seq(coll);
  while (s !== null) {
    const v = seqFirst(s);
    const key = typeof v === 'object' ? JSON.stringify(v) : v;
    if (!seen.has(key)) { seen.add(key); result.push(v); }
    s = seqNext(s);
  }
  return list(...result);
}

export function dedupe(coll: unknown): unknown {
  const result: unknown[] = [];
  let prev: unknown = undefined;
  let s = seq(coll);
  while (s !== null) {
    const v = seqFirst(s);
    if (!equiv(v, prev)) { result.push(v); prev = v; }
    s = seqNext(s);
  }
  return list(...result);
}

export function interleave(...colls: unknown[]): unknown {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seqs: any[] = colls.map(c => seq(c));
  const result: unknown[] = [];
  while (seqs.every((s: any) => s !== null)) {
    for (let i = 0; i < seqs.length; i++) {
      result.push(seqFirst(seqs[i]));
      seqs[i] = seqNext(seqs[i]);
    }
  }
  return list(...result);
}

export function interpose(sep: unknown, coll: unknown): unknown {
  const result: unknown[] = [];
  let s = seq(coll);
  let isFirst = true;
  while (s !== null) {
    if (!isFirst) result.push(sep);
    result.push(seqFirst(s));
    isFirst = false;
    s = seqNext(s);
  }
  return list(...result);
}

export function partition(n: number, coll: unknown): unknown {
  const result: unknown[] = [];
  const arr: unknown[] = [];
  let s = seq(coll);
  while (s !== null) { arr.push(seqFirst(s)); s = seqNext(s); }
  for (let i = 0; i + n <= arr.length; i += n) {
    result.push(list(...arr.slice(i, i + n)));
  }
  return list(...result);
}

export function partition_all(n: number, coll: unknown): unknown {
  const result: unknown[] = [];
  const arr: unknown[] = [];
  let s = seq(coll);
  while (s !== null) { arr.push(seqFirst(s)); s = seqNext(s); }
  for (let i = 0; i < arr.length; i += n) {
    result.push(list(...arr.slice(i, i + n)));
  }
  return list(...result);
}

export function partition_by(f: (x: unknown) => unknown, coll: unknown): unknown {
  const result: unknown[] = [];
  let current: unknown[] = [];
  let currentKey: unknown = undefined;
  let isFirst = true;
  let s = seq(coll);
  while (s !== null) {
    const v = seqFirst(s);
    const key = f(v);
    if (isFirst || equiv(key, currentKey)) {
      current.push(v);
    } else {
      result.push(list(...current));
      current = [v];
    }
    currentKey = key;
    isFirst = false;
    s = seqNext(s);
  }
  if (current.length > 0) result.push(list(...current));
  return list(...result);
}

export function merge_with(f: (...args: unknown[]) => unknown, ...maps: unknown[]): unknown {
  let result: PersistentHashMap | null = null;
  for (const m of maps) {
    if (m === null || m === undefined) continue;
    if (result === null) { result = m as PersistentHashMap; continue; }
    const r = result;
    (m as PersistentHashMap).forEach((k, v) => {
      const existing = r.get(k);
      result = result!.assoc(k, existing !== undefined ? f(existing, v) : v);
    });
  }
  return result;
}

export function zipmap(ks: unknown, vs: unknown): unknown {
  let result = hm();
  let sk = seq(ks), sv = seq(vs);
  while (sk !== null && sv !== null) {
    result = result.assoc(seqFirst(sk), seqFirst(sv));
    sk = seqNext(sk);
    sv = seqNext(sv);
  }
  return result;
}

export function reduce_kv(f: (acc: unknown, k: unknown, v: unknown) => unknown, init: unknown, coll: unknown): unknown {
  let acc = init;
  if (isHashMap(coll)) {
    (coll as PersistentHashMap).forEach((k, v) => { acc = f(acc, k, v); });
  }
  return acc;
}

// -- Regex --

export function re_find(re: RegExp, s: string): unknown {
  const m = s.match(re);
  if (!m) return null;
  return m.length === 1 ? m[0] : vector(...m);
}

export function re_matches(re: RegExp, s: string): unknown {
  const anchored = new RegExp(`^${re.source}$`, re.flags);
  const m = s.match(anchored);
  if (!m) return null;
  return m.length === 1 ? m[0] : vector(...m);
}

export function re_seq(re: RegExp, s: string): unknown {
  const matches: string[] = [];
  let m: RegExpExecArray | null;
  const r = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  while ((m = r.exec(s)) !== null) { matches.push(m[0]); }
  return list(...matches);
}

// -- Misc --

export function fnil(f: (...args: unknown[]) => unknown, ...defaults: unknown[]): (...args: unknown[]) => unknown {
  return (...args: unknown[]) => {
    const fixed = args.map((a, i) => (a === null || a === undefined) && i < defaults.length ? defaults[i] : a);
    return f(...fixed);
  };
}

export function trampoline(f: (...args: unknown[]) => unknown, ...args: unknown[]): unknown {
  let result = f(...args);
  while (typeof result === 'function') {
    result = (result as () => unknown)();
  }
  return result;
}

// -- Batch 3: Navigation helpers --

export function ffirst(coll: unknown): unknown {
  return seqFirst(seqFirst(seq(coll) as any) as any);
}

export function fnext(coll: unknown): unknown {
  return second(coll);
}

export function nfirst(coll: unknown): unknown {
  const s = seq(coll);
  return s === null ? null : seqNext(seqFirst(s) as any);
}

export function nnext(coll: unknown): unknown {
  const s = seq(coll);
  if (s === null) return null;
  const n = seqNext(s);
  return n === null ? null : seqNext(n);
}

export function take_last(n: number, coll: unknown): unknown {
  const arr: unknown[] = [];
  let s = seq(coll);
  while (s !== null) { arr.push(seqFirst(s)); s = seqNext(s); }
  return list(...arr.slice(Math.max(0, arr.length - n)));
}

export function take_nth(n: number, coll: unknown): unknown {
  const result: unknown[] = [];
  let s = seq(coll);
  let i = 0;
  while (s !== null) {
    if (i % n === 0) result.push(seqFirst(s));
    s = seqNext(s);
    i++;
  }
  return list(...result);
}

export function drop_last(n: number, coll: unknown): unknown {
  const arr: unknown[] = [];
  let s = seq(coll);
  while (s !== null) { arr.push(seqFirst(s)); s = seqNext(s); }
  return list(...arr.slice(0, Math.max(0, arr.length - n)));
}

export function keep_indexed(f: (i: number, v: unknown) => unknown, coll: unknown): unknown {
  const result: unknown[] = [];
  let s = seq(coll);
  let i = 0;
  while (s !== null) {
    const v = f(i++, seqFirst(s));
    if (v !== null && v !== undefined) result.push(v);
    s = seqNext(s);
  }
  return list(...result);
}

export function reductions(f: (...args: unknown[]) => unknown, init: unknown, coll: unknown): unknown {
  const result: unknown[] = [init];
  let acc = init;
  let s = seq(coll);
  while (s !== null) {
    acc = f(acc, seqFirst(s));
    result.push(acc);
    s = seqNext(s);
  }
  return list(...result);
}

// -- Lazy generators (finite take required) --

import { LazySeq } from './lazy-seq.js';

export function iterate(f: (x: unknown) => unknown, x: unknown): unknown {
  function gen(val: unknown): unknown {
    return new LazySeq(() => {
      const nextVal = f(val);
      return listCons(val, gen(nextVal) as any);
    });
  }
  return gen(x);
}

export function cycle(coll: unknown): unknown {
  const arr: unknown[] = [];
  let s = seq(coll);
  while (s !== null) { arr.push(seqFirst(s)); s = seqNext(s); }
  if (arr.length === 0) return EMPTY_LIST;
  let i = 0;
  function gen(): unknown {
    return new LazySeq(() => {
      const v = arr[i % arr.length];
      i++;
      return listCons(v, gen() as any);
    });
  }
  return gen();
}

export function doall(coll: unknown): unknown {
  let s = seq(coll);
  const result: unknown[] = [];
  while (s !== null) { result.push(seqFirst(s)); s = seqNext(s); }
  return list(...result);
}

export function dorun(coll: unknown): null {
  let s = seq(coll);
  while (s !== null) { s = seqNext(s); }
  return null;
}

// -- empty / set --

export function empty(coll: unknown): unknown {
  if (isVector(coll)) return vector();
  if (isList(coll)) return EMPTY_LIST;
  if (isHashMap(coll)) return hm();
  if (isHashSet(coll)) return new (Object.getPrototypeOf(coll).constructor)(hm());
  if (isSortedMap(coll)) return EMPTY_SORTED_MAP;
  if (isSortedSet(coll)) return EMPTY_SORTED_SET;
  return null;
}

export function set(coll: unknown): unknown {
  let result = hashSet();
  let s = seq(coll);
  while (s !== null) {
    result = result.conj(seqFirst(s));
    s = seqNext(s);
  }
  return result;
}

// -- Sorted collections --

export { sortedMap as sorted_map, isSortedMap as sorted_map_p } from './sorted-map.js';
export { sortedSet as sorted_set, isSortedSet as sorted_set_p } from './sorted-set.js';

export function sorted_map_by(cmp: (a: unknown, b: unknown) => number, ...kvs: unknown[]): PersistentTreeMap {
  let m = new PersistentTreeMap(null, 0, cmp);
  for (let i = 0; i < kvs.length; i += 2) {
    m = m.assoc(kvs[i], kvs[i + 1]);
  }
  return m;
}

export function subseq(sc: unknown, fromKey: unknown, inclusive = true): unknown[] {
  if (isSortedMap(sc)) return (sc as PersistentTreeMap).subseq(fromKey, inclusive);
  return [];
}

export function rsubseq(sc: unknown, toKey: unknown, inclusive = true): unknown[] {
  if (isSortedMap(sc)) return (sc as PersistentTreeMap).rsubseq(toKey, inclusive);
  return [];
}

// -- More predicates --

export function float_p(x: unknown): boolean { return typeof x === 'number' && !Number.isInteger(x); }
export function ifn_p(x: unknown): boolean { return typeof x === 'function' || isKeyword(x) || isHashMap(x) || isHashSet(x); }
export function counted_p(x: unknown): boolean { return isVector(x) || isList(x) || isHashMap(x) || isHashSet(x) || isSortedMap(x) || isSortedSet(x) || typeof x === 'string'; }
export function realized_p(x: unknown): boolean { return x instanceof LazySeq ? (x as any).realized : true; }

// -- Numeric --

export function quot(a: number, b: number): number { return Math.trunc(a / b); }

export function compare(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null) return -1;
  if (b === null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a < b ? -1 : a > b ? 1 : 0;
  if (typeof a === 'string' && typeof b === 'string') return a < b ? -1 : a > b ? 1 : 0;
  if (isKeyword(a) && isKeyword(b)) {
    const sa = a.toString(), sb = b.toString();
    return sa < sb ? -1 : sa > sb ? 1 : 0;
  }
  if (isSymbol(a) && isSymbol(b)) {
    const sa = a.toString(), sb = b.toString();
    return sa < sb ? -1 : sa > sb ? 1 : 0;
  }
  return 0;
}

// -- Array interop --

export function aget(arr: unknown[], idx: number): unknown { return arr[idx]; }
export function aset(arr: unknown[], idx: number, val: unknown): unknown { arr[idx] = val; return val; }
export function alength(arr: unknown[]): number { return arr.length; }
export function js_keys(obj: unknown): string[] { return Object.keys(obj as Record<string, unknown>); }

// -- Numeric equality --

export function num_eq(...args: unknown[]): boolean {
  if (args.length < 2) return true;
  const first = Number(args[0]);
  for (let i = 1; i < args.length; i++) {
    if (first !== Number(args[i])) return false;
  }
  return true;
}

// -- Regex --

export function re_pattern(s: string): RegExp { return new RegExp(s); }

// -- Printing to string --

function prStr(x: unknown): string {
  if (x === null || x === undefined) return 'nil';
  if (typeof x === 'string') return `"${x}"`;
  if (isKeyword(x)) return `:${(x as Keyword).name}`;
  if (isSymbol(x)) return (x as Sym).name;
  return String(x);
}

export function pr_str(...args: unknown[]): string {
  return args.map(prStr).join(' ');
}

export function prn_str(...args: unknown[]): string {
  return args.map(prStr).join(' ') + '\n';
}

export function print_str(...args: unknown[]): string {
  return args.map(x => x == null ? 'nil' : String(x)).join(' ');
}

export function println_str(...args: unknown[]): string {
  return args.map(x => x == null ? 'nil' : String(x)).join(' ') + '\n';
}

// -- More interop --

export function array(...items: unknown[]): unknown[] { return items; }
export function aclone(arr: unknown[]): unknown[] { return arr.slice(); }
export function js_delete(obj: unknown, key: string): void { delete (obj as Record<string, unknown>)[key]; }

// -- Hashing --

import { hashKey } from './hash-map.js';

export function hash(x: unknown): number {
  if (x === null || x === undefined) return 0;
  return hashKey(x);
}

// -- Type --

export function type_fn(x: unknown): unknown {
  if (x === null || x === undefined) return null;
  return (x as object).constructor;
}

export function instance_p(ctor: unknown, x: unknown): boolean {
  if (x === null || x === undefined) return false;
  return x instanceof (ctor as new (...args: unknown[]) => unknown);
}

// -- prn / pr --

export function prn(...args: unknown[]): void {
  console.log(args.map(prStr).join(' '));
}

export function pr(...args: unknown[]): void {
  if (typeof process !== 'undefined' && process.stdout) {
    process.stdout.write(args.map(prStr).join(' '));
  } else {
    console.log(args.map(prStr).join(' '));
  }
}

// -- Collection predicates --

export function reversible_p(x: unknown): boolean {
  return isVector(x);
}

export function sorted_p(x: unknown): boolean {
  return isSortedMap(x) || isSortedSet(x);
}

// -- Protocol predicates --

export function satisfies_p(_protocol: unknown, _x: unknown): boolean {
  // Placeholder: our protocols use defprotocol/extend-type which is structural
  return false;
}

export function implements_p(_protocol: unknown, _x: unknown): boolean {
  return false;
}

// -- Dynamic vars (print system) --

export let _print_fn_: ((s: string) => void) | null = (s: string) => {
  if (typeof process !== 'undefined' && process.stdout) {
    process.stdout.write(s);
  } else if (typeof console !== 'undefined') {
    console.log(s);
  }
};

export let _print_err_fn_: ((s: string) => void) | null = (s: string) => {
  if (typeof process !== 'undefined' && process.stderr) {
    process.stderr.write(s);
  } else if (typeof console !== 'undefined') {
    console.error(s);
  }
};

export let _print_newline_ = true;
export let _print_readably_ = true;
export let _print_length_: number | null = null;
export let _print_level_: number | null = null;

// -- Metadata --

const metaStore = new WeakMap<object, unknown>();

export function alter_meta_m(ref: unknown, f: (...args: unknown[]) => unknown, ...args: unknown[]): unknown {
  if (ref === null || ref === undefined || typeof ref !== 'object') return null;
  const current = metaStore.get(ref as object) ?? null;
  const newMeta = f(current, ...args);
  metaStore.set(ref as object, newMeta);
  return newMeta;
}

export function reset_meta_m(ref: unknown, m: unknown): unknown {
  if (ref === null || ref === undefined || typeof ref !== 'object') return null;
  metaStore.set(ref as object, m);
  return m;
}
