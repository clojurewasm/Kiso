import { describe, it, expect } from 'vitest';
import { protocolFn } from '../../src/runtime/protocols.js';
import {
  ISeq, ICounted, ICollection,
  installProtocols,
} from '../../src/runtime/protocol-ext.js';
import { list } from '../../src/runtime/list.js';
import { vector } from '../../src/runtime/vector.js';
import { hashMap } from '../../src/runtime/hash-map.js';
import { hashSet } from '../../src/runtime/hash-set.js';
import { LazySeq } from '../../src/runtime/lazy-seq.js';

// Install protocols on prototypes
installProtocols();

const pfirst = protocolFn(ISeq, 'first');
const prest = protocolFn(ISeq, 'rest');
const pcount = protocolFn(ICounted, 'count');
const pconj = protocolFn(ICollection, 'conj');

describe('Protocol extensions on existing types', () => {
  describe('ISeq on PersistentList', () => {
    it('first returns head', () => {
      const l = list(1, 2, 3);
      expect(pfirst(l)).toBe(1);
    });

    it('rest returns tail', () => {
      const l = list(1, 2, 3);
      const r = prest(l);
      expect(pfirst(r)).toBe(2);
    });
  });

  describe('ISeq on PersistentVector', () => {
    it('first returns element at 0', () => {
      const v = vector(10, 20, 30);
      expect(pfirst(v)).toBe(10);
    });

    it('rest returns remaining seq', () => {
      const v = vector(10, 20, 30);
      const r = prest(v);
      // rest of a vector produces an IndexedSeq
      // Use seq-level first (not protocol) to verify
      expect(r).not.toBeNull();
    });
  });

  describe('ICounted on PersistentList', () => {
    it('count returns length', () => {
      expect(pcount(list(1, 2, 3))).toBe(3);
    });

    it('count of empty list is 0', () => {
      expect(pcount(list())).toBe(0);
    });
  });

  describe('ICounted on PersistentVector', () => {
    it('count returns length', () => {
      expect(pcount(vector(1, 2, 3))).toBe(3);
    });
  });

  describe('ICounted on PersistentHashMap', () => {
    it('count returns entry count', () => {
      const m = hashMap('a', 1, 'b', 2);
      expect(pcount(m)).toBe(2);
    });
  });

  describe('ICounted on PersistentHashSet', () => {
    it('count returns element count', () => {
      const s = hashSet(1, 2, 3);
      expect(pcount(s)).toBe(3);
    });
  });

  describe('ICollection on PersistentList', () => {
    it('conj adds to front', () => {
      const l = list(2, 3);
      const l2 = pconj(l, 1);
      expect(pfirst(l2)).toBe(1);
      expect(pcount(l2)).toBe(3);
    });
  });

  describe('ICollection on PersistentVector', () => {
    it('conj adds to end', () => {
      const v = vector(1, 2);
      const v2 = pconj(v, 3);
      expect(pcount(v2)).toBe(3);
    });
  });

  describe('ISeq on LazySeq', () => {
    it('first realizes and returns head', () => {
      const ls = new LazySeq(() => list(42, 43));
      expect(pfirst(ls)).toBe(42);
    });
  });
});
