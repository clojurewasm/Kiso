/**
 * Performance benchmarks for core data structures.
 *
 * Run with: npx vitest bench packages/kiso/test/bench/
 */
import { bench, describe } from 'vitest';
import { vector, PersistentVector } from '../../src/runtime/vector.js';
import { hashMap, PersistentHashMap } from '../../src/runtime/hash-map.js';
import { hashSet, PersistentHashSet } from '../../src/runtime/hash-set.js';
import { sortedMap, PersistentTreeMap } from '../../src/runtime/sorted-map.js';
import { transient, persistent_m, conj_m, assoc_m } from '../../src/runtime/transient.js';

// -- Vector --

describe('PersistentVector', () => {
  const v1000 = (() => { let v = vector(); for (let i = 0; i < 1000; i++) v = v.conj(i); return v; })();

  bench('conj 1000 elements', () => {
    let v = vector();
    for (let i = 0; i < 1000; i++) v = v.conj(i);
  });

  bench('nth random access (1000 elements)', () => {
    for (let i = 0; i < 1000; i++) v1000.nth(i);
  });

  bench('transient conj 1000 elements', () => {
    const t = transient(vector());
    for (let i = 0; i < 1000; i++) conj_m(t, i);
    persistent_m(t);
  });
});

// -- HashMap --

describe('PersistentHashMap', () => {
  const m1000 = (() => { let m = hashMap(); for (let i = 0; i < 1000; i++) m = m.assoc(`key${i}`, i); return m; })();

  bench('assoc 1000 entries', () => {
    let m = hashMap();
    for (let i = 0; i < 1000; i++) m = m.assoc(`key${i}`, i);
  });

  bench('get 1000 entries', () => {
    for (let i = 0; i < 1000; i++) m1000.get(`key${i}`);
  });

  bench('transient assoc 1000 entries', () => {
    const t = transient(hashMap());
    for (let i = 0; i < 1000; i++) assoc_m(t, `key${i}`, i);
    persistent_m(t);
  });
});

// -- HashSet --

describe('PersistentHashSet', () => {
  bench('conj 1000 elements', () => {
    let s = hashSet();
    for (let i = 0; i < 1000; i++) s = s.conj(i);
  });
});

// -- TreeMap (sorted) --

describe('PersistentTreeMap', () => {
  const sm1000 = (() => { let m = sortedMap(); for (let i = 0; i < 1000; i++) m = m.assoc(i, i); return m; })();

  bench('assoc 1000 entries', () => {
    let m = sortedMap();
    for (let i = 0; i < 1000; i++) m = m.assoc(i, i);
  });

  bench('get 1000 entries', () => {
    for (let i = 0; i < 1000; i++) sm1000.get(i);
  });
});

// -- Compiler --

import { readStr } from '../../src/reader/reader.js';
import { Analyzer } from '../../src/analyzer/analyzer.js';
import { emit } from '../../src/codegen/emitter.js';

describe('Compiler throughput', () => {
  const analyzer = new Analyzer();
  const source = '(defn fibonacci [n] (if (<= n 1) n (+ (fibonacci (- n 1)) (fibonacci (- n 2)))))';

  bench('read + analyze + emit', () => {
    const form = readStr(source)!;
    const node = analyzer.analyze(form);
    emit(node);
  });
});
