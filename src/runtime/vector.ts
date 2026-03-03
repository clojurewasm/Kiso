// PersistentVector — 32-way trie with tail optimization.
//
// Ported from CW's collections.zig PersistentVector.
// O(1) amortized conj (append), O(~1) nth (lookup).
// Structural sharing via path copy (copy-on-write).

const BITS = 5;
const WIDTH = 1 << BITS; // 32
const MASK = WIDTH - 1;  // 0x1f

type VNode = unknown[];

const EMPTY_NODE: VNode = [];

const VEC_TAG = Symbol.for('kiso.vector');

export class PersistentVector {
  readonly _tag = VEC_TAG;
  readonly count: number;
  private readonly shift: number;
  private readonly root: VNode;
  private readonly tail: unknown[];

  constructor(count: number, shift: number, root: VNode, tail: unknown[]) {
    this.count = count;
    this.shift = shift;
    this.root = root;
    this.tail = tail;
  }

  nth(index: number): unknown {
    if (index < 0 || index >= this.count) return undefined;

    // Check if index is in the tail
    if (index >= this.tailOffset()) {
      return this.tail[index - this.tailOffset()];
    }

    // Trie traversal
    let node = this.root;
    for (let level = this.shift; level > 0; level -= BITS) {
      node = node[(index >>> level) & MASK] as VNode;
    }
    return node[index & MASK];
  }

  conj(val: unknown): PersistentVector {
    // Tail has room
    if (this.count - this.tailOffset() < WIDTH) {
      const newTail = this.tail.slice();
      newTail.push(val);
      return new PersistentVector(this.count + 1, this.shift, this.root, newTail);
    }

    // Tail is full — push tail into trie
    let newRoot: VNode;
    let newShift = this.shift;

    // Root overflow? Need new level
    if ((this.count >>> BITS) > (1 << this.shift)) {
      newRoot = [this.root, newPath(this.shift, this.tail)];
      newShift += BITS;
    } else {
      newRoot = pushTail(this.count, this.shift, this.root, this.tail);
    }

    return new PersistentVector(this.count + 1, newShift, newRoot, [val]);
  }

  assocN(index: number, val: unknown): PersistentVector {
    if (index < 0 || index >= this.count) {
      throw new RangeError(`Index ${index} out of bounds for vector of size ${this.count}`);
    }

    // In tail
    if (index >= this.tailOffset()) {
      const newTail = this.tail.slice();
      newTail[index - this.tailOffset()] = val;
      return new PersistentVector(this.count, this.shift, this.root, newTail);
    }

    // In trie — path copy
    const newRoot = assocPath(this.shift, this.root, index, val);
    return new PersistentVector(this.count, this.shift, newRoot, this.tail);
  }

  pop(): PersistentVector {
    if (this.count === 0) {
      throw new Error('Cannot pop empty vector');
    }

    if (this.count === 1) {
      return EMPTY_VECTOR;
    }

    // Tail has more than 1 element
    if (this.count - this.tailOffset() > 1) {
      const newTail = this.tail.slice(0, -1);
      return new PersistentVector(this.count - 1, this.shift, this.root, newTail);
    }

    // Tail will be empty — pull last leaf from trie
    const newTail = this.getLeaf(this.count - 2);
    let newRoot = popTail(this.count, this.shift, this.root);
    let newShift = this.shift;

    // Collapse root if only one child remains
    if (this.shift > BITS && newRoot[1] === undefined) {
      newRoot = newRoot[0] as VNode;
      newShift -= BITS;
    }

    return new PersistentVector(this.count - 1, newShift, newRoot, newTail);
  }

  private tailOffset(): number {
    if (this.count < WIDTH) return 0;
    return ((this.count - 1) >>> BITS) << BITS;
  }

  private getLeaf(index: number): unknown[] {
    let node = this.root;
    for (let level = this.shift; level > 0; level -= BITS) {
      node = node[(index >>> level) & MASK] as VNode;
    }
    return node as unknown[];
  }
}

// -- Static helpers --

function newPath(level: number, leaf: unknown[]): VNode {
  if (level === 0) return leaf;
  return [newPath(level - BITS, leaf)];
}

function pushTail(count: number, level: number, parent: VNode, tail: unknown[]): VNode {
  const subIdx = ((count - 1) >>> level) & MASK;
  const result = parent.slice();

  if (level === BITS) {
    result[subIdx] = tail;
  } else {
    const child = parent[subIdx] as VNode | undefined;
    if (child) {
      result[subIdx] = pushTail(count, level - BITS, child, tail);
    } else {
      result[subIdx] = newPath(level - BITS, tail);
    }
  }

  return result;
}

function assocPath(level: number, node: VNode, index: number, val: unknown): VNode {
  const result = node.slice();
  if (level === 0) {
    result[index & MASK] = val;
  } else {
    const subIdx = (index >>> level) & MASK;
    result[subIdx] = assocPath(level - BITS, node[subIdx] as VNode, index, val);
  }
  return result;
}

function popTail(count: number, level: number, node: VNode): VNode {
  const subIdx = ((count - 2) >>> level) & MASK;

  if (level > BITS) {
    const newChild = popTail(count, level - BITS, node[subIdx] as VNode);
    if (newChild.length === 0 && subIdx === 0) {
      return [];
    }
    const result = node.slice();
    result[subIdx] = newChild.length === 0 ? undefined : newChild;
    return result;
  }

  // Leaf level
  if (subIdx === 0) {
    return [];
  }
  const result = node.slice();
  result[subIdx] = undefined;
  return result;
}

export const EMPTY_VECTOR = new PersistentVector(0, BITS, EMPTY_NODE, []);

export function vector(...args: unknown[]): PersistentVector {
  let v: PersistentVector = EMPTY_VECTOR;
  for (let i = 0; i < args.length; i++) {
    v = v.conj(args[i]);
  }
  return v;
}

export function isVector(x: unknown): x is PersistentVector {
  return x instanceof PersistentVector;
}
