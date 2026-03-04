// PersistentHashMap — HAMT (Hash Array Mapped Trie).
//
// Ported from CW's collections.zig HAMTNode.
// Uses bitmap + popcount for sparse 32-way branching.
// O(log32 n) ≈ O(1) get/assoc/dissoc.

import { hashString, hashInt, hashFloat, hashBoolean, hashNull } from './hash.js';

const BITS = 5;
const MASK = (1 << BITS) - 1; // 0x1f

const MAP_TAG = Symbol.for('kiso.hashmap');

// -- Hash for arbitrary keys --

function hashKey(key: unknown): number {
  if (key === null || key === undefined) return hashNull();
  if (typeof key === 'number') return Number.isInteger(key) ? hashInt(key) : hashFloat(key);
  if (typeof key === 'string') return hashString(key);
  if (typeof key === 'boolean') return hashBoolean(key);
  // Objects with a .hash property (Keyword, Symbol, etc.)
  if (typeof key === 'object' && key !== null && 'hash' in key) {
    return (key as { hash: number }).hash;
  }
  return hashString(String(key));
}

function keysEqual(a: unknown, b: unknown): boolean {
  return a === b;
}

// -- HAMT Node --

type KV = { key: unknown; val: unknown };

interface HAMTNode {
  get(hash: number, shift: number, key: unknown): unknown;
  assoc(hash: number, shift: number, key: unknown, val: unknown): { node: HAMTNode; added: boolean };
  dissoc(hash: number, shift: number, key: unknown): HAMTNode | null;
  forEach(fn: (key: unknown, val: unknown) => void): void;
}

// BitmapIndexedNode: sparse node with bitmap + popcount indexing
class BitmapNode implements HAMTNode {
  constructor(
    readonly dataMap: number,
    readonly nodeMap: number,
    readonly kvs: KV[],
    readonly nodes: HAMTNode[],
  ) {}

  get(hash: number, shift: number, key: unknown): unknown {
    const bit = bitpos(hash, shift);

    if (this.dataMap & bit) {
      const idx = popcount(this.dataMap & (bit - 1));
      const kv = this.kvs[idx]!;
      if (keysEqual(kv.key, key)) return kv.val;
      return undefined;
    }

    if (this.nodeMap & bit) {
      const idx = popcount(this.nodeMap & (bit - 1));
      return this.nodes[idx]!.get(hash, shift + BITS, key);
    }

    return undefined;
  }

  assoc(hash: number, shift: number, key: unknown, val: unknown): { node: HAMTNode; added: boolean } {
    const bit = bitpos(hash, shift);

    // Case 1: inline KV exists at this position
    if (this.dataMap & bit) {
      const idx = popcount(this.dataMap & (bit - 1));
      const existing = this.kvs[idx]!;

      if (keysEqual(existing.key, key)) {
        if (existing.val === val) return { node: this, added: false };
        // Replace value
        const newKvs = this.kvs.slice();
        newKvs[idx] = { key, val };
        return { node: new BitmapNode(this.dataMap, this.nodeMap, newKvs, this.nodes), added: false };
      }

      // Hash collision at this level — push both to child node
      const existingHash = hashKey(existing.key);
      const child = createTwoNode(existingHash, existing.key, existing.val, hash, key, val, shift + BITS);
      const newKvs = arrayRemove(this.kvs, idx);
      const nodeIdx = popcount(this.nodeMap & (bit - 1));
      const newNodes = arrayInsert(this.nodes, nodeIdx, child);
      return {
        node: new BitmapNode(this.dataMap ^ bit, this.nodeMap | bit, newKvs, newNodes),
        added: true,
      };
    }

    // Case 2: child node exists at this position
    if (this.nodeMap & bit) {
      const idx = popcount(this.nodeMap & (bit - 1));
      const child = this.nodes[idx]!;
      const result = child.assoc(hash, shift + BITS, key, val);
      if (result.node === child) return { node: this, added: false };
      const newNodes = this.nodes.slice();
      newNodes[idx] = result.node;
      return { node: new BitmapNode(this.dataMap, this.nodeMap, this.kvs, newNodes), added: result.added };
    }

    // Case 3: empty slot — insert inline KV
    const idx = popcount(this.dataMap & (bit - 1));
    const newKvs = arrayInsert(this.kvs, idx, { key, val });
    return {
      node: new BitmapNode(this.dataMap | bit, this.nodeMap, newKvs, this.nodes),
      added: true,
    };
  }

  dissoc(hash: number, shift: number, key: unknown): HAMTNode | null {
    const bit = bitpos(hash, shift);

    if (this.dataMap & bit) {
      const idx = popcount(this.dataMap & (bit - 1));
      if (!keysEqual(this.kvs[idx]!.key, key)) return this;
      if (this.kvs.length === 1 && this.nodes.length === 0) return null;
      const newKvs = arrayRemove(this.kvs, idx);
      return new BitmapNode(this.dataMap ^ bit, this.nodeMap, newKvs, this.nodes);
    }

    if (this.nodeMap & bit) {
      const idx = popcount(this.nodeMap & (bit - 1));
      const child = this.nodes[idx]!;
      const newChild = child.dissoc(hash, shift + BITS, key);

      if (newChild === child) return this;

      if (newChild === null) {
        if (this.kvs.length === 0 && this.nodes.length === 1) return null;
        const newNodes = arrayRemove(this.nodes, idx);
        return new BitmapNode(this.dataMap, this.nodeMap ^ bit, this.kvs, newNodes);
      }

      // Inline single-entry child back to parent
      if (newChild instanceof BitmapNode && newChild.kvs.length === 1 && newChild.nodes.length === 0) {
        const kv = newChild.kvs[0]!;
        const kvIdx = popcount(this.dataMap & (bit - 1));
        const newKvs = arrayInsert(this.kvs, kvIdx, kv);
        const newNodes = arrayRemove(this.nodes, idx);
        return new BitmapNode(this.dataMap | bit, this.nodeMap ^ bit, newKvs, newNodes);
      }

      const newNodes = this.nodes.slice();
      newNodes[idx] = newChild;
      return new BitmapNode(this.dataMap, this.nodeMap, this.kvs, newNodes);
    }

    return this; // key not found
  }

  forEach(fn: (key: unknown, val: unknown) => void): void {
    for (const kv of this.kvs) fn(kv.key, kv.val);
    for (const node of this.nodes) node.forEach(fn);
  }
}

// CollisionNode: all entries have the same hash
class CollisionNode implements HAMTNode {
  constructor(readonly collHash: number, readonly kvs: KV[]) {}

  get(_hash: number, _shift: number, key: unknown): unknown {
    for (const kv of this.kvs) {
      if (keysEqual(kv.key, key)) return kv.val;
    }
    return undefined;
  }

  assoc(hash: number, shift: number, key: unknown, val: unknown): { node: HAMTNode; added: boolean } {
    if (hash !== this.collHash) {
      // Different hash — wrap in a BitmapNode
      const newNode = new BitmapNode(0, 0, [], []);
      const r1 = newNode.assoc(this.collHash, shift, this.kvs[0]!.key, this.kvs[0]!.val);
      // Add remaining collision entries
      let current = r1.node;
      for (let i = 1; i < this.kvs.length; i++) {
        current = current.assoc(this.collHash, shift, this.kvs[i]!.key, this.kvs[i]!.val).node;
      }
      return current.assoc(hash, shift, key, val);
    }

    for (let i = 0; i < this.kvs.length; i++) {
      if (keysEqual(this.kvs[i]!.key, key)) {
        if (this.kvs[i]!.val === val) return { node: this, added: false };
        const newKvs = this.kvs.slice();
        newKvs[i] = { key, val };
        return { node: new CollisionNode(this.collHash, newKvs), added: false };
      }
    }

    return { node: new CollisionNode(this.collHash, [...this.kvs, { key, val }]), added: true };
  }

  dissoc(_hash: number, _shift: number, key: unknown): HAMTNode | null {
    for (let i = 0; i < this.kvs.length; i++) {
      if (keysEqual(this.kvs[i]!.key, key)) {
        if (this.kvs.length === 1) return null;
        if (this.kvs.length === 2) {
          const other = this.kvs[1 - i]!;
          return new BitmapNode(bitpos(this.collHash, 0), 0, [other], []);
        }
        return new CollisionNode(this.collHash, arrayRemove(this.kvs, i));
      }
    }
    return this;
  }

  forEach(fn: (key: unknown, val: unknown) => void): void {
    for (const kv of this.kvs) fn(kv.key, kv.val);
  }
}

// -- Helpers --

function bitpos(hash: number, shift: number): number {
  return 1 << ((hash >>> shift) & MASK);
}

function popcount(x: number): number {
  // Brian Kernighan's popcount for 32-bit integers
  x = x - ((x >>> 1) & 0x55555555);
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  return (((x + (x >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
}

function arrayInsert<T>(arr: T[], idx: number, val: T): T[] {
  const result = arr.slice();
  result.splice(idx, 0, val);
  return result;
}

function arrayRemove<T>(arr: T[], idx: number): T[] {
  const result = arr.slice();
  result.splice(idx, 1);
  return result;
}

function createTwoNode(
  hash1: number, key1: unknown, val1: unknown,
  hash2: number, key2: unknown, val2: unknown,
  shift: number,
): HAMTNode {
  if (hash1 === hash2) {
    return new CollisionNode(hash1, [{ key: key1, val: val1 }, { key: key2, val: val2 }]);
  }

  const bit1 = bitpos(hash1, shift);
  const bit2 = bitpos(hash2, shift);

  if (bit1 !== bit2) {
    const kv1: KV = { key: key1, val: val1 };
    const kv2: KV = { key: key2, val: val2 };
    // Order KVs by popcount position
    const idx1 = popcount((bit1 | bit2) & (bit1 - 1));
    const kvs = idx1 === 0 ? [kv1, kv2] : [kv2, kv1];
    return new BitmapNode(bit1 | bit2, 0, kvs, []);
  }

  // Same position, different hashes — go deeper
  const child = createTwoNode(hash1, key1, val1, hash2, key2, val2, shift + BITS);
  return new BitmapNode(0, bit1, [], [child]);
}

// -- PersistentHashMap (wrapper with nil key support) --

const EMPTY_ROOT = new BitmapNode(0, 0, [], []);

export class PersistentHashMap {
  readonly _tag = MAP_TAG;
  readonly count: number;

  constructor(
    count: number,
    private readonly root: HAMTNode,
    private readonly hasNull: boolean,
    private readonly nullVal: unknown,
  ) {
    this.count = count;
  }

  get(key: unknown): unknown {
    if (key === null || key === undefined) {
      return this.hasNull ? this.nullVal : undefined;
    }
    return this.root.get(hashKey(key), 0, key);
  }

  has(key: unknown): boolean {
    if (key === null || key === undefined) return this.hasNull;
    return this.root.get(hashKey(key), 0, key) !== undefined;
  }

  assoc(key: unknown, val: unknown): PersistentHashMap {
    if (key === null || key === undefined) {
      if (this.hasNull && this.nullVal === val) return this;
      return new PersistentHashMap(
        this.count + (this.hasNull ? 0 : 1),
        this.root,
        true,
        val,
      );
    }

    const result = this.root.assoc(hashKey(key), 0, key, val);
    if (result.node === this.root) return this;
    return new PersistentHashMap(
      this.count + (result.added ? 1 : 0),
      result.node,
      this.hasNull,
      this.nullVal,
    );
  }

  forEach(fn: (key: unknown, val: unknown) => void): void {
    if (this.hasNull) fn(null, this.nullVal);
    this.root.forEach(fn);
  }

  dissoc(key: unknown): PersistentHashMap {
    if (key === null || key === undefined) {
      if (!this.hasNull) return this;
      return new PersistentHashMap(this.count - 1, this.root, false, undefined);
    }

    const newRoot = this.root.dissoc(hashKey(key), 0, key);
    if (newRoot === this.root) return this;
    return new PersistentHashMap(
      this.count - 1,
      newRoot ?? EMPTY_ROOT,
      this.hasNull,
      this.nullVal,
    );
  }
}

export const EMPTY_MAP = new PersistentHashMap(0, EMPTY_ROOT, false, undefined);

export function hashMap(...kvs: unknown[]): PersistentHashMap {
  let m: PersistentHashMap = EMPTY_MAP;
  for (let i = 0; i < kvs.length; i += 2) {
    m = m.assoc(kvs[i], kvs[i + 1]);
  }
  return m;
}

export function isHashMap(x: unknown): x is PersistentHashMap {
  return x instanceof PersistentHashMap;
}
