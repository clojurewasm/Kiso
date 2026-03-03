// PersistentHashSet — Backed by PersistentHashMap.
//
// Set semantics: conj, disj, has. Delegates to HAMT internally.

import { PersistentHashMap, EMPTY_MAP } from './hash-map.js';

const SET_TAG = Symbol.for('kiso.hashset');
const PRESENT = true; // sentinel value stored in backing map

export class PersistentHashSet {
  readonly _tag = SET_TAG;
  readonly count: number;

  constructor(private readonly impl: PersistentHashMap) {
    this.count = impl.count;
  }

  has(key: unknown): boolean {
    return this.impl.has(key);
  }

  conj(key: unknown): PersistentHashSet {
    const newImpl = this.impl.assoc(key, PRESENT);
    if (newImpl === this.impl) return this;
    return new PersistentHashSet(newImpl);
  }

  disj(key: unknown): PersistentHashSet {
    const newImpl = this.impl.dissoc(key);
    if (newImpl === this.impl) return this;
    return new PersistentHashSet(newImpl);
  }
}

export const EMPTY_SET = new PersistentHashSet(EMPTY_MAP);

export function hashSet(...items: unknown[]): PersistentHashSet {
  let s: PersistentHashSet = EMPTY_SET;
  for (const item of items) {
    s = s.conj(item);
  }
  return s;
}

export function isHashSet(x: unknown): x is PersistentHashSet {
  return x instanceof PersistentHashSet;
}
