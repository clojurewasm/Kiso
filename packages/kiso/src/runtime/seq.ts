// Seq abstraction — Polymorphic sequence operations.
//
// Provides first/rest/next/seq that work across lists, vectors, and arrays.
// This is the foundation for all sequence operations in Clojure.

import { isList, EMPTY_LIST, first as listFirst, rest as listRest, count as listCount } from './list.js';
import { isVector, PersistentVector, vector } from './vector.js';
import { isHashMap, PersistentHashMap } from './hash-map.js';
import { isArrayMap } from './array-map.js';
import { isHashSet } from './hash-set.js';
import { isSortedMap } from './sorted-map.js';
import { isSortedSet } from './sorted-set.js';
import { LazySeq } from './lazy-seq.js';

// IndexedSeq: seq over a vector or array by index
class IndexedSeq {
  constructor(readonly coll: PersistentVector | unknown[], readonly index: number) {}

  first(): unknown {
    if (this.coll instanceof PersistentVector) {
      return this.coll.nth(this.index);
    }
    return (this.coll as unknown[])[this.index];
  }

  rest(): IndexedSeq | null {
    const len = this.coll instanceof PersistentVector ? this.coll.count : (this.coll as unknown[]).length;
    if (this.index + 1 < len) {
      return new IndexedSeq(this.coll, this.index + 1);
    }
    return null;
  }
}

type Seqable = unknown;

/** Convert a value to a seq (null if empty). */
export function seq(coll: Seqable): unknown {
  if (coll === null || coll === undefined) return null;

  // Already a seq
  if (coll instanceof IndexedSeq) return coll;

  // LazySeq: realize and recurse
  if (coll instanceof LazySeq) {
    const realized = coll.realize();
    return realized === null ? null : seq(realized);
  }

  if (isList(coll)) {
    return listCount(coll) === 0 ? null : coll;
  }

  if (isVector(coll)) {
    return coll.count === 0 ? null : new IndexedSeq(coll, 0);
  }

  if (Array.isArray(coll)) {
    return coll.length === 0 ? null : new IndexedSeq(coll, 0);
  }

  // Maps: convert to array of [key, val] vectors
  if (isHashMap(coll) || isArrayMap(coll) || isSortedMap(coll)) {
    const m = coll as PersistentHashMap;
    if (m.count === 0) return null;
    const entries: unknown[] = [];
    m.forEach((k: unknown, v: unknown) => entries.push(vector(k, v)));
    return new IndexedSeq(entries, 0);
  }

  // Sets: convert to array of elements
  if (isHashSet(coll) || isSortedSet(coll)) {
    const s = coll as { count: number; forEach: (fn: (k: unknown) => void) => void };
    if (s.count === 0) return null;
    const items: unknown[] = [];
    s.forEach((k: unknown) => items.push(k));
    return new IndexedSeq(items, 0);
  }

  return null;
}

/** Get the first element of a seqable. */
export function first(coll: Seqable): unknown {
  if (coll === null || coll === undefined) return null;

  if (isList(coll)) return listFirst(coll);
  if (coll instanceof IndexedSeq) return coll.first();
  if (coll instanceof LazySeq) {
    const s = seq(coll);
    return s === null ? null : first(s);
  }

  // Try seq-ing first
  const s = seq(coll);
  if (s === null) return null;
  return first(s);
}

/** Get all but the first element (always returns a seq or empty list). */
export function rest(coll: Seqable): unknown {
  if (coll === null || coll === undefined) return EMPTY_LIST;

  if (isList(coll)) return listRest(coll);

  if (coll instanceof IndexedSeq) {
    const r = coll.rest();
    return r ?? EMPTY_LIST;
  }

  if (coll instanceof LazySeq) {
    const s = seq(coll);
    if (s === null) return EMPTY_LIST;
    return rest(s);
  }

  const s = seq(coll);
  if (s === null) return EMPTY_LIST;
  return rest(s);
}

/** Get all but the first element (null if none). */
export function next(coll: Seqable): unknown {
  if (coll === null || coll === undefined) return null;

  if (isList(coll)) {
    const r = listRest(coll);
    return listCount(r) === 0 ? null : r;
  }

  if (coll instanceof IndexedSeq) {
    return coll.rest();
  }

  if (coll instanceof LazySeq) {
    const s = seq(coll);
    if (s === null) return null;
    return next(s);
  }

  const s = seq(coll);
  if (s === null) return null;
  return next(s);
}

/** Convert a seqable to a JS array. */
export function toArray(coll: Seqable): unknown[] {
  const result: unknown[] = [];
  let s = seq(coll);
  while (s !== null) {
    result.push(first(s));
    s = next(s);
  }
  return result;
}

/** Reduce a seqable into a vector (conj each element). */
export function into(to: PersistentVector, from: Seqable): PersistentVector {
  let result = to;
  let s = seq(from);
  while (s !== null) {
    result = result.conj(first(s));
    s = next(s);
  }
  return result;
}
