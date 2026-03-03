import { describe, it, expect } from 'vitest';
import { list, cons, first, rest, count, isList, EMPTY_LIST } from '../../src/runtime/list.js';

describe('empty list', () => {
  it('has count 0', () => {
    expect(count(EMPTY_LIST)).toBe(0);
  });

  it('first is null', () => {
    expect(first(EMPTY_LIST)).toBe(null);
  });

  it('rest is empty list', () => {
    expect(rest(EMPTY_LIST)).toBe(EMPTY_LIST);
  });

  it('isList is true', () => {
    expect(isList(EMPTY_LIST)).toBe(true);
  });
});

describe('list creation', () => {
  it('creates empty list with no args', () => {
    const l = list();
    expect(count(l)).toBe(0);
  });

  it('creates list with elements', () => {
    const l = list(1, 2, 3);
    expect(count(l)).toBe(3);
    expect(first(l)).toBe(1);
  });

  it('preserves element order', () => {
    const l = list(1, 2, 3);
    expect(first(l)).toBe(1);
    expect(first(rest(l))).toBe(2);
    expect(first(rest(rest(l)))).toBe(3);
  });
});

describe('cons', () => {
  it('prepends to empty list', () => {
    const l = cons(42, EMPTY_LIST);
    expect(count(l)).toBe(1);
    expect(first(l)).toBe(42);
  });

  it('prepends to existing list', () => {
    const l = cons(0, list(1, 2));
    expect(count(l)).toBe(3);
    expect(first(l)).toBe(0);
    expect(first(rest(l))).toBe(1);
  });

  it('can chain cons calls', () => {
    const l = cons(1, cons(2, cons(3, EMPTY_LIST)));
    expect(count(l)).toBe(3);
    expect(first(l)).toBe(1);
  });
});

describe('first', () => {
  it('returns first element', () => {
    expect(first(list(10, 20))).toBe(10);
  });

  it('returns null for empty', () => {
    expect(first(EMPTY_LIST)).toBe(null);
  });
});

describe('rest', () => {
  it('returns rest of list', () => {
    const l = list(1, 2, 3);
    const r = rest(l);
    expect(count(r)).toBe(2);
    expect(first(r)).toBe(2);
  });

  it('rest of single-element list is empty', () => {
    const l = list(1);
    expect(rest(l)).toBe(EMPTY_LIST);
  });

  it('rest of empty list is empty', () => {
    expect(rest(EMPTY_LIST)).toBe(EMPTY_LIST);
  });
});

describe('count', () => {
  it('counts elements', () => {
    expect(count(EMPTY_LIST)).toBe(0);
    expect(count(list(1))).toBe(1);
    expect(count(list(1, 2, 3, 4, 5))).toBe(5);
  });
});

describe('isList', () => {
  it('true for lists', () => {
    expect(isList(EMPTY_LIST)).toBe(true);
    expect(isList(list(1, 2))).toBe(true);
    expect(isList(cons(1, EMPTY_LIST))).toBe(true);
  });

  it('false for other types', () => {
    expect(isList(null)).toBe(false);
    expect(isList(42)).toBe(false);
    expect(isList([1, 2])).toBe(false);
    expect(isList('hello')).toBe(false);
  });
});

describe('structural sharing', () => {
  it('rest shares structure with original', () => {
    const l = list(1, 2, 3);
    const r = rest(l);
    // rest(r) and rest(rest(l)) should be the same object
    expect(rest(r)).toBe(rest(rest(l)));
  });

  it('cons shares tail', () => {
    const tail = list(2, 3);
    const l = cons(1, tail);
    expect(rest(l)).toBe(tail);
  });
});

describe('heterogeneous elements', () => {
  it('holds mixed types', () => {
    const l = list(1, 'hello', null, true);
    expect(first(l)).toBe(1);
    expect(first(rest(l))).toBe('hello');
    expect(first(rest(rest(l)))).toBe(null);
    expect(first(rest(rest(rest(l))))).toBe(true);
  });
});
