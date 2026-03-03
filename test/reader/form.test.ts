import { describe, it, expect } from 'vitest';
import {
  type Form,
  type FormData,
  makeNil,
  makeBool,
  makeInt,
  makeBigInt,
  makeFloat,
  makeStr,
  makeChar,
  makeKeyword,
  makeSymbol,
  makeList,
  makeVector,
  makeMap,
  makeSet,
  makeRegex,
  makeRatio,
  makeTagged,
  typeName,
  isTruthy,
  prStr,
} from '../../src/reader/form.js';

// -- Construction & type discrimination --

describe('Form construction', () => {
  it('creates nil', () => {
    const f = makeNil();
    expect(f.data.type).toBe('nil');
    expect(f.line).toBe(0);
    expect(f.col).toBe(0);
  });

  it('creates boolean', () => {
    const t = makeBool(true);
    const f = makeBool(false);
    expect(t.data).toEqual({ type: 'boolean', value: true });
    expect(f.data).toEqual({ type: 'boolean', value: false });
  });

  it('creates integer', () => {
    const f = makeInt(42);
    expect(f.data).toEqual({ type: 'integer', value: 42 });
  });

  it('creates bigint', () => {
    const f = makeBigInt(9007199254740993n);
    expect(f.data).toEqual({ type: 'bigint', value: 9007199254740993n });
  });

  it('creates float', () => {
    const f = makeFloat(3.14);
    expect(f.data).toEqual({ type: 'float', value: 3.14 });
  });

  it('creates string', () => {
    const f = makeStr('hello');
    expect(f.data).toEqual({ type: 'string', value: 'hello' });
  });

  it('creates char', () => {
    const f = makeChar('a');
    expect(f.data).toEqual({ type: 'char', value: 'a' });
  });

  it('creates keyword without namespace', () => {
    const f = makeKeyword(null, 'foo');
    expect(f.data).toEqual({ type: 'keyword', ns: null, name: 'foo' });
  });

  it('creates keyword with namespace', () => {
    const f = makeKeyword('user', 'bar');
    expect(f.data).toEqual({ type: 'keyword', ns: 'user', name: 'bar' });
  });

  it('creates symbol without namespace', () => {
    const f = makeSymbol(null, 'foo');
    expect(f.data).toEqual({ type: 'symbol', ns: null, name: 'foo' });
  });

  it('creates symbol with namespace', () => {
    const f = makeSymbol('clojure.core', '+');
    expect(f.data).toEqual({ type: 'symbol', ns: 'clojure.core', name: '+' });
  });

  it('creates list', () => {
    const items = [makeInt(1), makeInt(2)];
    const f = makeList(items);
    expect(f.data.type).toBe('list');
    if (f.data.type === 'list') {
      expect(f.data.items).toHaveLength(2);
    }
  });

  it('creates vector', () => {
    const items = [makeInt(1), makeInt(2)];
    const f = makeVector(items);
    expect(f.data.type).toBe('vector');
    if (f.data.type === 'vector') {
      expect(f.data.items).toHaveLength(2);
    }
  });

  it('creates map with flat key-value pairs', () => {
    const items = [makeKeyword(null, 'a'), makeInt(1)];
    const f = makeMap(items);
    expect(f.data.type).toBe('map');
    if (f.data.type === 'map') {
      expect(f.data.items).toHaveLength(2);
    }
  });

  it('creates set', () => {
    const items = [makeInt(1), makeInt(2)];
    const f = makeSet(items);
    expect(f.data.type).toBe('set');
    if (f.data.type === 'set') {
      expect(f.data.items).toHaveLength(2);
    }
  });

  it('creates regex', () => {
    const f = makeRegex('\\d+');
    expect(f.data).toEqual({ type: 'regex', pattern: '\\d+' });
  });

  it('creates ratio', () => {
    const f = makeRatio('22', '7');
    expect(f.data).toEqual({ type: 'ratio', numerator: '22', denominator: '7' });
  });

  it('creates tagged literal', () => {
    const inner = makeStr('2024-01-01');
    const f = makeTagged('inst', inner);
    expect(f.data.type).toBe('tagged');
    if (f.data.type === 'tagged') {
      expect(f.data.tag).toBe('inst');
      expect(f.data.form.data).toEqual({ type: 'string', value: '2024-01-01' });
    }
  });

  it('preserves source location', () => {
    const f = makeInt(42, 10, 5);
    expect(f.line).toBe(10);
    expect(f.col).toBe(5);
  });

  it('supports metadata', () => {
    const meta = makeMap([makeKeyword(null, 'tag'), makeSymbol(null, 'String')]);
    const f: Form = { data: { type: 'symbol', ns: null, name: 'x' }, line: 1, col: 1, meta };
    expect(f.meta).toBeDefined();
    expect(f.meta!.data.type).toBe('map');
  });
});

// -- typeName --

describe('typeName', () => {
  it('returns correct names for all types', () => {
    expect(typeName(makeNil())).toBe('nil');
    expect(typeName(makeBool(true))).toBe('boolean');
    expect(typeName(makeInt(0))).toBe('integer');
    expect(typeName(makeBigInt(0n))).toBe('bigint');
    expect(typeName(makeFloat(0.0))).toBe('float');
    expect(typeName(makeStr(''))).toBe('string');
    expect(typeName(makeChar('a'))).toBe('char');
    expect(typeName(makeKeyword(null, 'k'))).toBe('keyword');
    expect(typeName(makeSymbol(null, 's'))).toBe('symbol');
    expect(typeName(makeList([]))).toBe('list');
    expect(typeName(makeVector([]))).toBe('vector');
    expect(typeName(makeMap([]))).toBe('map');
    expect(typeName(makeSet([]))).toBe('set');
    expect(typeName(makeRegex(''))).toBe('regex');
    expect(typeName(makeRatio('1', '3'))).toBe('ratio');
    expect(typeName(makeTagged('inst', makeStr('')))).toBe('tagged');
  });
});

// -- isTruthy (Clojure truthiness) --

describe('isTruthy', () => {
  it('nil is falsy', () => {
    expect(isTruthy(makeNil())).toBe(false);
  });

  it('false is falsy', () => {
    expect(isTruthy(makeBool(false))).toBe(false);
  });

  it('true is truthy', () => {
    expect(isTruthy(makeBool(true))).toBe(true);
  });

  it('zero integer is truthy', () => {
    expect(isTruthy(makeInt(0))).toBe(true);
  });

  it('empty string is truthy', () => {
    expect(isTruthy(makeStr(''))).toBe(true);
  });

  it('empty list is truthy', () => {
    expect(isTruthy(makeList([]))).toBe(true);
  });

  it('empty vector is truthy', () => {
    expect(isTruthy(makeVector([]))).toBe(true);
  });
});

// -- prStr (print representation) --

describe('prStr', () => {
  it('prints nil', () => {
    expect(prStr(makeNil())).toBe('nil');
  });

  it('prints booleans', () => {
    expect(prStr(makeBool(true))).toBe('true');
    expect(prStr(makeBool(false))).toBe('false');
  });

  it('prints integers', () => {
    expect(prStr(makeInt(42))).toBe('42');
    expect(prStr(makeInt(-7))).toBe('-7');
    expect(prStr(makeInt(0))).toBe('0');
  });

  it('prints bigints with N suffix', () => {
    expect(prStr(makeBigInt(9007199254740993n))).toBe('9007199254740993N');
  });

  it('prints floats', () => {
    expect(prStr(makeFloat(3.14))).toBe('3.14');
    expect(prStr(makeFloat(0.0))).toBe('0');
    expect(prStr(makeFloat(Infinity))).toBe('##Inf');
    expect(prStr(makeFloat(-Infinity))).toBe('##-Inf');
    expect(prStr(makeFloat(NaN))).toBe('##NaN');
  });

  it('prints strings with quotes and escapes', () => {
    expect(prStr(makeStr('hello'))).toBe('"hello"');
    expect(prStr(makeStr('a"b'))).toBe('"a\\"b"');
    expect(prStr(makeStr('a\nb'))).toBe('"a\\nb"');
    expect(prStr(makeStr('a\tb'))).toBe('"a\\tb"');
    expect(prStr(makeStr('a\\b'))).toBe('"a\\\\b"');
  });

  it('prints char literals', () => {
    expect(prStr(makeChar('A'))).toBe('\\A');
    expect(prStr(makeChar('\n'))).toBe('\\newline');
    expect(prStr(makeChar('\r'))).toBe('\\return');
    expect(prStr(makeChar('\t'))).toBe('\\tab');
    expect(prStr(makeChar(' '))).toBe('\\space');
    expect(prStr(makeChar('\b'))).toBe('\\backspace');
    expect(prStr(makeChar('\f'))).toBe('\\formfeed');
  });

  it('prints keywords', () => {
    expect(prStr(makeKeyword(null, 'foo'))).toBe(':foo');
    expect(prStr(makeKeyword('user', 'bar'))).toBe(':user/bar');
  });

  it('prints symbols', () => {
    expect(prStr(makeSymbol(null, 'foo'))).toBe('foo');
    expect(prStr(makeSymbol('clojure.core', '+'))).toBe('clojure.core/+');
  });

  it('prints lists', () => {
    expect(prStr(makeList([]))).toBe('()');
    expect(prStr(makeList([makeInt(1), makeInt(2), makeInt(3)]))).toBe('(1 2 3)');
    expect(prStr(makeList([makeSymbol(null, '+'), makeInt(1), makeInt(2)]))).toBe('(+ 1 2)');
  });

  it('prints vectors', () => {
    expect(prStr(makeVector([]))).toBe('[]');
    expect(prStr(makeVector([makeInt(1), makeInt(2)]))).toBe('[1 2]');
  });

  it('prints maps', () => {
    expect(prStr(makeMap([]))).toBe('{}');
    expect(prStr(makeMap([makeKeyword(null, 'a'), makeInt(1)]))).toBe('{:a 1}');
    expect(prStr(makeMap([
      makeKeyword(null, 'a'), makeInt(1),
      makeKeyword(null, 'b'), makeInt(2),
    ]))).toBe('{:a 1, :b 2}');
  });

  it('prints sets', () => {
    expect(prStr(makeSet([]))).toBe('#{}');
    expect(prStr(makeSet([makeInt(1), makeInt(2)]))).toBe('#{1 2}');
  });

  it('prints regex', () => {
    expect(prStr(makeRegex('\\d+'))).toBe('#"\\d+"');
  });

  it('prints ratios', () => {
    expect(prStr(makeRatio('22', '7'))).toBe('22/7');
    expect(prStr(makeRatio('1', '3'))).toBe('1/3');
  });

  it('prints tagged literals', () => {
    expect(prStr(makeTagged('inst', makeStr('2024-01-01')))).toBe('#inst "2024-01-01"');
  });

  it('prints nested structures', () => {
    const nested = makeList([
      makeSymbol(null, 'defn'),
      makeSymbol(null, 'greet'),
      makeVector([makeSymbol(null, 'name')]),
      makeList([
        makeSymbol(null, 'str'),
        makeStr('Hello, '),
        makeSymbol(null, 'name'),
      ]),
    ]);
    expect(prStr(nested)).toBe('(defn greet [name] (str "Hello, " name))');
  });
});
