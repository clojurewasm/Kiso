// Transient collections — Mutable variants for batch operations.
//
// transient() creates a mutable wrapper. conj!/assoc!/dissoc!/disj! mutate in place.
// persistent!() freezes and returns a new persistent collection.
//
// Simple implementation: copy data to mutable JS structures, then rebuild persistent
// collections on persistent!(). This avoids complexity of COW or ownership flags
// inside the HAMT/trie internals.

import { isVector, PersistentVector, vector } from './vector.js';
import { isHashMap, PersistentHashMap, hashMap } from './hash-map.js';
import { isHashSet, PersistentHashSet, hashSet } from './hash-set.js';

type TransientType = 'vector' | 'map' | 'set';

export class TransientCollection {
  private _frozen = false;
  readonly type: TransientType;

  // Vector backing store
  private _arr?: unknown[];

  // Map backing store
  private _entries?: Map<unknown, unknown>;

  // Set backing store
  private _items?: Set<unknown>;

  constructor(type: TransientType) {
    this.type = type;
  }

  _ensureMutable(): void {
    if (this._frozen) throw new Error('Transient used after persistent! call');
  }

  // -- Vector --

  static fromVector(v: PersistentVector): TransientCollection {
    const t = new TransientCollection('vector');
    const arr: unknown[] = [];
    for (let i = 0; i < v.count; i++) arr.push(v.nth(i));
    t._arr = arr;
    return t;
  }

  conjVector(val: unknown): void {
    this._ensureMutable();
    this._arr!.push(val);
  }

  assocVector(idx: number, val: unknown): void {
    this._ensureMutable();
    this._arr![idx] = val;
  }

  toVector(): PersistentVector {
    this._frozen = true;
    return vector(...this._arr!);
  }

  // -- Map --

  static fromMap(m: PersistentHashMap): TransientCollection {
    const t = new TransientCollection('map');
    const entries = new Map<unknown, unknown>();
    m.forEach((k, v) => entries.set(k, v));
    t._entries = entries;
    return t;
  }

  assocMap(key: unknown, val: unknown): void {
    this._ensureMutable();
    this._entries!.set(key, val);
  }

  dissocMap(key: unknown): void {
    this._ensureMutable();
    this._entries!.delete(key);
  }

  toMap(): PersistentHashMap {
    this._frozen = true;
    const kvs: unknown[] = [];
    this._entries!.forEach((v, k) => kvs.push(k, v));
    return hashMap(...kvs);
  }

  // -- Set --

  static fromSet(s: PersistentHashSet): TransientCollection {
    const t = new TransientCollection('set');
    const items = new Set<unknown>();
    s.forEach((item) => items.add(item));
    t._items = items;
    return t;
  }

  conjSet(val: unknown): void {
    this._ensureMutable();
    this._items!.add(val);
  }

  disjSet(val: unknown): void {
    this._ensureMutable();
    this._items!.delete(val);
  }

  toSet(): PersistentHashSet {
    this._frozen = true;
    return hashSet(...this._items!);
  }
}

// -- Public API --

export function transient(coll: unknown): TransientCollection {
  if (isVector(coll)) return TransientCollection.fromVector(coll);
  if (isHashMap(coll)) return TransientCollection.fromMap(coll);
  if (isHashSet(coll)) return TransientCollection.fromSet(coll);
  throw new Error('transient not supported on this type');
}

export function persistent_m(t: TransientCollection): unknown {
  switch (t.type) {
    case 'vector': return t.toVector();
    case 'map': return t.toMap();
    case 'set': return t.toSet();
  }
}

export function conj_m(t: TransientCollection, val: unknown): TransientCollection {
  switch (t.type) {
    case 'vector': t.conjVector(val); break;
    case 'set': t.conjSet(val); break;
    default: throw new Error('conj! not supported on transient map (use assoc!)');
  }
  return t;
}

export function assoc_m(t: TransientCollection, key: unknown, val: unknown): TransientCollection {
  switch (t.type) {
    case 'vector': t.assocVector(key as number, val); break;
    case 'map': t.assocMap(key, val); break;
    default: throw new Error('assoc! not supported on transient set');
  }
  return t;
}

export function dissoc_m(t: TransientCollection, key: unknown): TransientCollection {
  if (t.type !== 'map') throw new Error('dissoc! requires a transient map');
  t.dissocMap(key);
  return t;
}

export function disj_m(t: TransientCollection, val: unknown): TransientCollection {
  if (t.type !== 'set') throw new Error('disj! requires a transient set');
  t.disjSet(val);
  return t;
}
