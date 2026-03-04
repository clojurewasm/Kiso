// PersistentTreeSet — Sorted set backed by PersistentTreeMap.
//
// Set semantics: conj, disj, has. Delegates to sorted tree map internally.

import { PersistentTreeMap, EMPTY_SORTED_MAP } from './sorted-map.js';

const TREE_SET_TAG = Symbol.for('kiso.treeset');
const PRESENT = true;

export class PersistentTreeSet {
  readonly _tag = TREE_SET_TAG;
  readonly count: number;

  constructor(private readonly impl: PersistentTreeMap) {
    this.count = impl.count;
  }

  has(key: unknown): boolean {
    return this.impl.has(key);
  }

  conj(key: unknown): PersistentTreeSet {
    const newImpl = this.impl.assoc(key, PRESENT);
    if (newImpl === this.impl) return this;
    return new PersistentTreeSet(newImpl);
  }

  disj(key: unknown): PersistentTreeSet {
    const newImpl = this.impl.dissoc(key);
    if (newImpl === this.impl) return this;
    return new PersistentTreeSet(newImpl);
  }

  forEach(fn: (key: unknown) => void): void {
    this.impl.forEach((key) => fn(key));
  }
}

export const EMPTY_SORTED_SET = new PersistentTreeSet(EMPTY_SORTED_MAP);

export function sortedSet(...items: unknown[]): PersistentTreeSet {
  let s: PersistentTreeSet = EMPTY_SORTED_SET;
  for (const item of items) {
    s = s.conj(item);
  }
  return s;
}

export function isSortedSet(x: unknown): x is PersistentTreeSet {
  return x instanceof PersistentTreeSet;
}
