// clojure.set — Set operations matching ClojureScript semantics.

import { PersistentHashSet, EMPTY_SET } from './hash-set.js';
import { PersistentHashMap, EMPTY_MAP } from './hash-map.js';

/** Returns the union of the input sets. */
export function union(...sets: PersistentHashSet[]): PersistentHashSet {
  if (sets.length === 0) return EMPTY_SET;
  if (sets.length === 1) return sets[0]!;
  let result = sets[0]!;
  for (let i = 1; i < sets.length; i++) {
    sets[i]!.forEach((k: unknown) => { result = result.conj(k); });
  }
  return result;
}

/** Returns the intersection of the input sets. */
export function intersection(s1: PersistentHashSet, ...rest: PersistentHashSet[]): PersistentHashSet {
  if (rest.length === 0) return s1;
  let result = s1;
  for (const s of rest) {
    // Iterate the smaller set for efficiency
    const [check, against] = result.count <= s.count ? [result, s] : [s, result];
    let acc = EMPTY_SET;
    check.forEach((k: unknown) => {
      if (against.has(k)) acc = acc.conj(k);
    });
    result = acc;
  }
  return result;
}

/** Returns a set of elements in s1 that are not in any subsequent sets. */
export function difference(s1: PersistentHashSet, ...rest: PersistentHashSet[]): PersistentHashSet {
  if (rest.length === 0) return s1;
  let result = s1;
  for (const s of rest) {
    s.forEach((k: unknown) => { result = result.disj(k); });
  }
  return result;
}

/** Returns a set of elements for which pred returns truthy. */
export function select(pred: (x: unknown) => unknown, s: PersistentHashSet): PersistentHashSet {
  let result = EMPTY_SET;
  s.forEach((k: unknown) => {
    if (pred(k)) result = result.conj(k);
  });
  return result;
}

/** Returns true if s1 is a subset of s2. */
export function subset_p(s1: PersistentHashSet, s2: PersistentHashSet): boolean {
  if (s1.count > s2.count) return false;
  let result = true;
  s1.forEach((k: unknown) => {
    if (!s2.has(k)) result = false;
  });
  return result;
}

/** Returns true if s1 is a superset of s2. */
export function superset_p(s1: PersistentHashSet, s2: PersistentHashSet): boolean {
  return subset_p(s2, s1);
}

/** Returns a map with keys renamed according to kmap. */
export function rename_keys(map: PersistentHashMap, kmap: PersistentHashMap): PersistentHashMap {
  let result = map;
  kmap.forEach((oldKey: unknown, newKey: unknown) => {
    if (result.has(oldKey)) {
      const val = result.get(oldKey);
      result = result.dissoc(oldKey);
      result = result.assoc(newKey, val);
    }
  });
  return result;
}

/** Returns a map with keys and values swapped. */
export function map_invert(map: PersistentHashMap): PersistentHashMap {
  let result = EMPTY_MAP;
  map.forEach((k: unknown, v: unknown) => {
    result = result.assoc(v, k);
  });
  return result;
}

/** Returns a set of maps with only the specified keys. */
export function project(xrel: PersistentHashSet, ks: unknown[]): PersistentHashSet {
  let result = EMPTY_SET;
  xrel.forEach((row: unknown) => {
    const m = row as PersistentHashMap;
    let projected = EMPTY_MAP;
    for (const k of ks) {
      if (m.has(k)) {
        projected = projected.assoc(k, m.get(k));
      }
    }
    result = result.conj(projected);
  });
  return result;
}

/** Returns a set of maps with keys renamed per kmap. */
export function rename(xrel: PersistentHashSet, kmap: PersistentHashMap): PersistentHashSet {
  let result = EMPTY_SET;
  xrel.forEach((row: unknown) => {
    result = result.conj(rename_keys(row as PersistentHashMap, kmap));
  });
  return result;
}

/** Returns a map from key-map to set of matching rows. */
export function index(xrel: PersistentHashSet, ks: unknown[]): PersistentHashMap {
  let result = EMPTY_MAP;
  xrel.forEach((row: unknown) => {
    const m = row as PersistentHashMap;
    // Build the key-map: select only the index keys
    let keyMap = EMPTY_MAP;
    for (const k of ks) {
      if (m.has(k)) keyMap = keyMap.assoc(k, m.get(k));
    }
    const existing = result.get(keyMap) as PersistentHashSet | null;
    const bucket = existing ? existing.conj(m) : EMPTY_SET.conj(m);
    result = result.assoc(keyMap, bucket);
  });
  return result;
}
