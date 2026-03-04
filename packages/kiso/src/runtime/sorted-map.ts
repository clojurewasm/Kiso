// PersistentTreeMap — Sorted map backed by a left-leaning red-black tree.
//
// O(log n) get/assoc/dissoc. Keys ordered by compare function.
// Based on Sedgewick's LLRB algorithm, adapted for persistent (immutable) use.

import { isKeyword } from './keyword.js';
import { isSymbol } from './symbol.js';

// Inline compare to avoid circular dependency with core.ts
function defaultCompare(a: unknown, b: unknown): number {
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

const TREE_MAP_TAG = Symbol.for('kiso.treemap');

const RED = true;
const BLACK = false;

type Color = boolean;
type Comparator = (a: unknown, b: unknown) => number;

// -- Red-Black Tree Node --

class RBNode {
  constructor(
    readonly key: unknown,
    readonly val: unknown,
    readonly left: RBNode | null,
    readonly right: RBNode | null,
    readonly color: Color,
  ) {}
}

function isRed(node: RBNode | null): boolean {
  return node !== null && node.color === RED;
}

function rotateLeft(h: RBNode): RBNode {
  const x = h.right!;
  return new RBNode(x.key, x.val, new RBNode(h.key, h.val, h.left, x.left, RED), x.right, h.color);
}

function rotateRight(h: RBNode): RBNode {
  const x = h.left!;
  return new RBNode(x.key, x.val, x.left, new RBNode(h.key, h.val, x.right, h.right, RED), h.color);
}

function flipColors(h: RBNode): RBNode {
  return new RBNode(
    h.key, h.val,
    new RBNode(h.left!.key, h.left!.val, h.left!.left, h.left!.right, !h.left!.color),
    new RBNode(h.right!.key, h.right!.val, h.right!.left, h.right!.right, !h.right!.color),
    !h.color,
  );
}

function balance(h: RBNode): RBNode {
  let node = h;
  if (isRed(node.right) && !isRed(node.left)) node = rotateLeft(node);
  if (isRed(node.left) && isRed(node.left!.left)) node = rotateRight(node);
  if (isRed(node.left) && isRed(node.right)) node = flipColors(node);
  return node;
}

// -- Insertion --

function insert(node: RBNode | null, key: unknown, val: unknown, cmp: Comparator): { root: RBNode; added: boolean; replaced: boolean } {
  if (node === null) {
    return { root: new RBNode(key, val, null, null, RED), added: true, replaced: false };
  }

  const c = cmp(key, node.key);
  if (c === 0) {
    if (node.val === val) return { root: node, added: false, replaced: false };
    return { root: new RBNode(node.key, val, node.left, node.right, node.color), added: false, replaced: true };
  }

  let left = node.left;
  let right = node.right;
  let added = false;
  let replaced = false;

  if (c < 0) {
    const result = insert(left, key, val, cmp);
    left = result.root;
    added = result.added;
    replaced = result.replaced;
  } else {
    const result = insert(right, key, val, cmp);
    right = result.root;
    added = result.added;
    replaced = result.replaced;
  }

  let h = new RBNode(node.key, node.val, left, right, node.color);
  h = balance(h);
  return { root: h, added, replaced };
}

// -- Deletion --

function moveRedLeft(h: RBNode): RBNode {
  let node = flipColors(h);
  if (isRed(node.right!.left)) {
    node = new RBNode(node.key, node.val, node.left, rotateRight(node.right!), node.color);
    node = rotateLeft(node);
    node = flipColors(node);
  }
  return node;
}

function moveRedRight(h: RBNode): RBNode {
  let node = flipColors(h);
  if (isRed(node.left!.left)) {
    node = rotateRight(node);
    node = flipColors(node);
  }
  return node;
}

function minNode(h: RBNode): RBNode {
  let node = h;
  while (node.left !== null) node = node.left;
  return node;
}

function deleteMin(h: RBNode): RBNode | null {
  if (h.left === null) return null;

  let node = h;
  if (!isRed(node.left) && !isRed(node.left!.left)) {
    node = moveRedLeft(node);
  }

  const newLeft = deleteMin(node.left!);
  node = new RBNode(node.key, node.val, newLeft, node.right, node.color);
  return balance(node);
}

function remove(h: RBNode | null, key: unknown, cmp: Comparator): { root: RBNode | null; found: boolean } {
  if (h === null) return { root: null, found: false };

  let node = h;
  let found = false;

  if (cmp(key, node.key) < 0) {
    if (node.left === null) return { root: node, found: false };
    if (!isRed(node.left) && !isRed(node.left!.left)) {
      node = moveRedLeft(node);
    }
    const result = remove(node.left, key, cmp);
    found = result.found;
    node = new RBNode(node.key, node.val, result.root, node.right, node.color);
  } else {
    if (isRed(node.left)) {
      node = rotateRight(node);
    }
    if (cmp(key, node.key) === 0 && node.right === null) {
      return { root: null, found: true };
    }
    if (node.right !== null && !isRed(node.right) && !isRed(node.right!.left)) {
      node = moveRedRight(node);
    }
    if (cmp(key, node.key) === 0) {
      const successor = minNode(node.right!);
      const newRight = deleteMin(node.right!);
      node = new RBNode(successor.key, successor.val, node.left, newRight, node.color);
      found = true;
    } else {
      const result = remove(node.right, key, cmp);
      found = result.found;
      node = new RBNode(node.key, node.val, node.left, result.root, node.color);
    }
  }

  return { root: balance(node), found };
}

// -- Lookup --

function treeGet(node: RBNode | null, key: unknown, cmp: Comparator): unknown {
  let n = node;
  while (n !== null) {
    const c = cmp(key, n.key);
    if (c === 0) return n.val;
    n = c < 0 ? n.left : n.right;
  }
  return undefined;
}

function treeHas(node: RBNode | null, key: unknown, cmp: Comparator): boolean {
  let n = node;
  while (n !== null) {
    const c = cmp(key, n.key);
    if (c === 0) return true;
    n = c < 0 ? n.left : n.right;
  }
  return false;
}

// -- In-order traversal --

function inOrder(node: RBNode | null, fn: (key: unknown, val: unknown) => void): void {
  if (node === null) return;
  inOrder(node.left, fn);
  fn(node.key, node.val);
  inOrder(node.right, fn);
}

// -- Subseq helpers --

function collectGte(node: RBNode | null, key: unknown, cmp: Comparator, result: [unknown, unknown][]): void {
  if (node === null) return;
  const c = cmp(node.key, key);
  if (c >= 0) {
    collectGte(node.left, key, cmp, result);
    result.push([node.key, node.val]);
    collectGte(node.right, key, cmp, result);
  } else {
    collectGte(node.right, key, cmp, result);
  }
}

function collectGt(node: RBNode | null, key: unknown, cmp: Comparator, result: [unknown, unknown][]): void {
  if (node === null) return;
  const c = cmp(node.key, key);
  if (c > 0) {
    collectGt(node.left, key, cmp, result);
    result.push([node.key, node.val]);
    collectGt(node.right, key, cmp, result);
  } else {
    collectGt(node.right, key, cmp, result);
  }
}

function collectLte(node: RBNode | null, key: unknown, cmp: Comparator, result: [unknown, unknown][]): void {
  if (node === null) return;
  const c = cmp(node.key, key);
  if (c <= 0) {
    collectLte(node.left, key, cmp, result);
    result.push([node.key, node.val]);
    collectLte(node.right, key, cmp, result);
  } else {
    collectLte(node.left, key, cmp, result);
  }
}

function collectLt(node: RBNode | null, key: unknown, cmp: Comparator, result: [unknown, unknown][]): void {
  if (node === null) return;
  const c = cmp(node.key, key);
  if (c < 0) {
    collectLt(node.left, key, cmp, result);
    result.push([node.key, node.val]);
    collectLt(node.right, key, cmp, result);
  } else {
    collectLt(node.left, key, cmp, result);
  }
}

// -- PersistentTreeMap --

export class PersistentTreeMap {
  readonly _tag = TREE_MAP_TAG;
  readonly count: number;
  private readonly root: RBNode | null;
  private readonly cmp: Comparator;

  constructor(root: RBNode | null, count: number, cmp: Comparator) {
    this.root = root;
    this.count = count;
    this.cmp = cmp;
  }

  get(key: unknown): unknown {
    return treeGet(this.root, key, this.cmp);
  }

  has(key: unknown): boolean {
    return treeHas(this.root, key, this.cmp);
  }

  assoc(key: unknown, val: unknown): PersistentTreeMap {
    const result = insert(this.root, key, val, this.cmp);
    if (!result.added && !result.replaced) return this;
    const newRoot = new RBNode(result.root.key, result.root.val, result.root.left, result.root.right, BLACK);
    return new PersistentTreeMap(newRoot, this.count + (result.added ? 1 : 0), this.cmp);
  }

  dissoc(key: unknown): PersistentTreeMap {
    const result = remove(this.root, key, this.cmp);
    if (!result.found) return this;
    if (result.root === null) return new PersistentTreeMap(null, 0, this.cmp);
    const newRoot = new RBNode(result.root.key, result.root.val, result.root.left, result.root.right, BLACK);
    return new PersistentTreeMap(newRoot, this.count - 1, this.cmp);
  }

  forEach(fn: (key: unknown, val: unknown) => void): void {
    inOrder(this.root, fn);
  }

  keys(): unknown[] {
    const result: unknown[] = [];
    inOrder(this.root, (k) => result.push(k));
    return result;
  }

  vals(): unknown[] {
    const result: unknown[] = [];
    inOrder(this.root, (_k, v) => result.push(v));
    return result;
  }

  /** Returns entries where key >= fromKey (inclusive=true) or key > fromKey (inclusive=false). */
  subseq(fromKey: unknown, inclusive = true): [unknown, unknown][] {
    const result: [unknown, unknown][] = [];
    if (inclusive) {
      collectGte(this.root, fromKey, this.cmp, result);
    } else {
      collectGt(this.root, fromKey, this.cmp, result);
    }
    return result;
  }

  /** Returns entries where key <= toKey (inclusive=true) or key < toKey (inclusive=false), in reverse order. */
  rsubseq(toKey: unknown, inclusive = true): [unknown, unknown][] {
    const result: [unknown, unknown][] = [];
    if (inclusive) {
      collectLte(this.root, toKey, this.cmp, result);
    } else {
      collectLt(this.root, toKey, this.cmp, result);
    }
    result.reverse();
    return result;
  }

  comparator(): Comparator {
    return this.cmp;
  }
}

export const EMPTY_SORTED_MAP = new PersistentTreeMap(null, 0, defaultCompare);

export function sortedMap(...args: unknown[]): PersistentTreeMap {
  let cmp: Comparator = defaultCompare;
  let startIdx = 0;

  // If first arg is a plain function (not a keyword), it's a custom comparator
  if (args.length > 0 && typeof args[0] === 'function' && !isKeyword(args[0])) {
    cmp = args[0] as Comparator;
    startIdx = 1;
  }

  let m = new PersistentTreeMap(null, 0, cmp);
  for (let i = startIdx; i < args.length; i += 2) {
    m = m.assoc(args[i], args[i + 1]);
  }
  return m;
}

export function isSortedMap(x: unknown): x is PersistentTreeMap {
  return x instanceof PersistentTreeMap;
}
