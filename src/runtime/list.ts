// PersistentList — Cons-cell based immutable linked list.
//
// Simple and efficient for Clojure's list semantics:
// - O(1) cons, first, rest
// - O(n) count, nth
// - Structural sharing via immutable cons cells

const LIST_TAG = Symbol.for('kiso.list');

class Cons {
  readonly _tag = LIST_TAG;
  readonly _first: unknown;
  readonly _rest: List;
  readonly _count: number;

  constructor(first: unknown, rest: List) {
    this._first = first;
    this._rest = rest;
    this._count = rest._count + 1;
  }
}

class EmptyList {
  readonly _tag = LIST_TAG;
  readonly _count = 0;
}

type List = Cons | EmptyList;

export const EMPTY_LIST: List = new EmptyList();

export function cons(x: unknown, coll: List): List {
  return new Cons(x, coll);
}

export function first(l: List): unknown {
  if (l instanceof Cons) return l._first;
  return null;
}

export function rest(l: List): List {
  if (l instanceof Cons) return l._rest;
  return EMPTY_LIST;
}

export function count(l: List): number {
  return l._count;
}

export function list(...args: unknown[]): List {
  let result: List = EMPTY_LIST;
  for (let i = args.length - 1; i >= 0; i--) {
    result = new Cons(args[i], result);
  }
  return result;
}

export function isList(x: unknown): x is List {
  return x instanceof Cons || x instanceof EmptyList;
}
