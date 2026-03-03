// PersistentArrayMap — Small map backed by a flat array.
//
// For maps with <=8 entries, linear scan is faster than HAMT.
// Auto-promotes to PersistentHashMap when exceeding the threshold.
// Immutable: assoc/dissoc return new instances.

import { hashMap, PersistentHashMap } from './hash-map.js';

const ARRAY_MAP_TAG = Symbol.for('kiso.arraymap');
const THRESHOLD = 8;

export class PersistentArrayMap {
  readonly _tag = ARRAY_MAP_TAG;
  readonly count: number;
  // Flat array: [k0, v0, k1, v1, ...]
  private readonly arr: unknown[];

  constructor(arr: unknown[]) {
    this.arr = arr;
    this.count = arr.length >>> 1;
  }

  private indexOf(key: unknown): number {
    for (let i = 0; i < this.arr.length; i += 2) {
      if (this.arr[i] === key) return i;
    }
    return -1;
  }

  get(key: unknown, notFound?: unknown): unknown {
    const idx = this.indexOf(key);
    if (idx === -1) return notFound;
    return this.arr[idx + 1];
  }

  has(key: unknown): boolean {
    return this.indexOf(key) !== -1;
  }

  assoc(key: unknown, val: unknown): PersistentArrayMap | PersistentHashMap {
    const idx = this.indexOf(key);
    if (idx !== -1) {
      // Update existing key
      if (this.arr[idx + 1] === val) return this;
      const newArr = this.arr.slice();
      newArr[idx + 1] = val;
      return new PersistentArrayMap(newArr);
    }

    // Add new key — check threshold
    if (this.count >= THRESHOLD) {
      // Promote to HAMT
      let m: PersistentHashMap = hashMap(...this.arr);
      m = m.assoc(key, val) as PersistentHashMap;
      return m;
    }

    const newArr = [...this.arr, key, val];
    return new PersistentArrayMap(newArr);
  }

  dissoc(key: unknown): PersistentArrayMap {
    const idx = this.indexOf(key);
    if (idx === -1) return this;

    const newArr: unknown[] = [];
    for (let i = 0; i < this.arr.length; i += 2) {
      if (i !== idx) {
        newArr.push(this.arr[i], this.arr[i + 1]);
      }
    }
    return new PersistentArrayMap(newArr);
  }

  forEach(fn: (key: unknown, val: unknown) => void): void {
    for (let i = 0; i < this.arr.length; i += 2) {
      fn(this.arr[i], this.arr[i + 1]);
    }
  }
}

export function arrayMap(...kvs: unknown[]): PersistentArrayMap {
  return new PersistentArrayMap(kvs);
}

export function isArrayMap(x: unknown): x is PersistentArrayMap {
  return x instanceof PersistentArrayMap;
}
