// Protocol Extensions — Retrofit ISeq/ICounted/ICollection on existing types.
//
// Defines standard Clojure protocols and installs them on existing
// runtime types' prototypes. This enables protocol-based dispatch.

import { defprotocol, type Protocol } from './protocols.js';
import { PersistentVector } from './vector.js';
import {
  first as listFirst, rest as listRest, count as listCount,
  cons, list, EMPTY_LIST,
} from './list.js';
import { PersistentHashMap } from './hash-map.js';
import { PersistentHashSet } from './hash-set.js';
import { LazySeq } from './lazy-seq.js';
import { seq, first as seqFirst, rest as seqRest } from './seq.js';

// -- Protocol Definitions --

export const ISeq: Protocol = defprotocol('ISeq', ['first', 'rest']);
export const ICounted: Protocol = defprotocol('ICounted', ['count']);
export const ICollection: Protocol = defprotocol('ICollection', ['conj']);

// -- Installation --

let installed = false;

// Helper to set a Symbol method on a prototype
function extend(proto: object, sym: symbol, fn: Function): void {
  (proto as Record<symbol, Function>)[sym] = fn;
}

// Non-null method symbol lookup
function m(proto: Protocol, name: string): symbol {
  return proto.methods[name]!;
}

/** Install protocol methods on existing type prototypes. Call once at startup. */
export function installProtocols(): void {
  if (installed) return;
  installed = true;

  // -- PersistentList --
  // Cons and EmptyList are private classes. Get prototypes via sample instances.
  const sampleCons = list(1, 2);
  const consProto = Object.getPrototypeOf(sampleCons);
  const emptyProto = Object.getPrototypeOf(EMPTY_LIST);

  // Cons prototype — cast to `any` since List type is internal
  extend(consProto, m(ISeq, 'first'), function (this: any) { return listFirst(this); });
  extend(consProto, m(ISeq, 'rest'), function (this: any) { return listRest(this); });
  extend(consProto, m(ICounted, 'count'), function (this: any) { return listCount(this); });
  extend(consProto, m(ICollection, 'conj'), function (this: any, val: unknown) { return cons(val, this); });

  // EmptyList prototype (different class)
  if (emptyProto !== consProto) {
    extend(emptyProto, m(ISeq, 'first'), function () { return null; });
    extend(emptyProto, m(ISeq, 'rest'), function () { return EMPTY_LIST; });
    extend(emptyProto, m(ICounted, 'count'), function () { return 0; });
    extend(emptyProto, m(ICollection, 'conj'), function (this: any, val: unknown) { return cons(val, this); });
  }

  // -- PersistentVector --
  extend(PersistentVector.prototype, m(ISeq, 'first'), function (this: PersistentVector) {
    return this.count === 0 ? null : this.nth(0);
  });
  extend(PersistentVector.prototype, m(ISeq, 'rest'), function (this: PersistentVector) {
    if (this.count <= 1) return null;
    const s = seq(this);
    return s === null ? null : seqRest(s);
  });
  extend(PersistentVector.prototype, m(ICounted, 'count'), function (this: PersistentVector) {
    return this.count;
  });
  extend(PersistentVector.prototype, m(ICollection, 'conj'), function (this: PersistentVector, val: unknown) {
    return this.conj(val);
  });

  // -- PersistentHashMap --
  extend(PersistentHashMap.prototype, m(ICounted, 'count'), function (this: PersistentHashMap) {
    return this.count;
  });

  // -- PersistentHashSet --
  extend(PersistentHashSet.prototype, m(ICounted, 'count'), function (this: PersistentHashSet) {
    return this.count;
  });

  // -- LazySeq --
  extend(LazySeq.prototype, m(ISeq, 'first'), function (this: LazySeq) {
    return seqFirst(this);
  });
  extend(LazySeq.prototype, m(ISeq, 'rest'), function (this: LazySeq) {
    return seqRest(this);
  });
}
