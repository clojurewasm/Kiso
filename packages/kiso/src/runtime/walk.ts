// clojure.walk — Tree walking functions matching ClojureScript semantics.

import { isVector, vector } from './vector.js';
import { isHashMap, PersistentHashMap, EMPTY_MAP } from './hash-map.js';
import { isHashSet, EMPTY_SET } from './hash-set.js';
import { isList } from './list.js';
import { list as makeList } from './list.js';
import { isKeyword, keyword } from './keyword.js';
import { seq, toArray } from './seq.js';

type WalkFn = (x: unknown) => unknown;

/**
 * Traverses form, applying inner to each element of form, building up
 * a data structure of the same type. Applies outer to the result.
 */
export function walk(inner: WalkFn, outer: WalkFn, form: unknown): unknown {
  if (isHashMap(form)) {
    const m = form as PersistentHashMap;
    let result = EMPTY_MAP;
    m.forEach((k: unknown, v: unknown) => {
      const entry = inner(vector(k, v));
      // entry should be a 2-element vector [k, v]
      if (isVector(entry)) {
        result = result.assoc((entry as any).nth(0), (entry as any).nth(1));
      } else {
        // If inner transforms entry to non-vector, treat as [k, v] identity
        result = result.assoc(k, v);
      }
    });
    return outer(result);
  }
  if (isVector(form)) {
    const items = toArray(form).map(inner);
    return outer(vector(...items));
  }
  if (isList(form)) {
    const items = toArray(form).map(inner);
    return outer(makeList(...items));
  }
  if (isHashSet(form)) {
    let result = EMPTY_SET;
    (form as any).forEach((k: unknown) => {
      result = result.conj(inner(k));
    });
    return outer(result);
  }
  // seq-able but not the above
  const s = seq(form);
  if (s != null) {
    const items = toArray(s).map(inner);
    return outer(makeList(...items));
  }
  // Scalars: just apply outer
  return outer(form);
}

/** Performs a depth-first, post-order traversal of form. */
export function postwalk(f: WalkFn, form: unknown): unknown {
  return walk((x: unknown) => postwalk(f, x), f, form);
}

/** Performs a depth-first, pre-order traversal of form. */
export function prewalk(f: WalkFn, form: unknown): unknown {
  return walk((x: unknown) => prewalk(f, x), (x: unknown) => x, f(form));
}

/** Recursively replaces form with (smap form) if found in smap. */
export function postwalk_replace(smap: PersistentHashMap, form: unknown): unknown {
  return postwalk((x: unknown) => {
    if (smap.has(x)) return smap.get(x);
    return x;
  }, form);
}

/** Recursively replaces form with (smap form) if found in smap (pre-order). */
export function prewalk_replace(smap: PersistentHashMap, form: unknown): unknown {
  return prewalk((x: unknown) => {
    if (smap.has(x)) return smap.get(x);
    return x;
  }, form);
}

/** Recursively converts all string keys to keywords. */
export function keywordize_keys(m: unknown): unknown {
  return postwalk((x: unknown) => {
    if (isHashMap(x)) {
      const hm = x as PersistentHashMap;
      let result = EMPTY_MAP;
      hm.forEach((k: unknown, v: unknown) => {
        const newKey = typeof k === 'string' ? keyword(k) : k;
        result = result.assoc(newKey, v);
      });
      return result;
    }
    return x;
  }, m);
}

/** Recursively converts all keyword keys to strings. */
export function stringify_keys(m: unknown): unknown {
  return postwalk((x: unknown) => {
    if (isHashMap(x)) {
      const hm = x as PersistentHashMap;
      let result = EMPTY_MAP;
      hm.forEach((k: unknown, v: unknown) => {
        const newKey = isKeyword(k) ? (k as any).name : k;
        result = result.assoc(newKey, v);
      });
      return result;
    }
    return x;
  }, m);
}
