// Symbol — Immutable name with optional namespace. NOT interned.
//
// Unlike keywords, symbols are not interned (each call creates a new instance).
// Hash uses seed 0x517cc1b7 (from CW hash.zig).

import { hashString } from './hash.js';

const SYM_HASH_SEED = 0x517cc1b7;
const SYM_TAG = Symbol.for('kiso.symbol');

export class Sym {
  readonly _tag = SYM_TAG;
  readonly ns: string | null;
  readonly name: string;
  readonly hash: number;

  constructor(name: string, ns: string | null) {
    this.name = name;
    this.ns = ns;
    this.hash = computeSymbolHash(name, ns);
  }

  toString(): string {
    return this.ns ? `${this.ns}/${this.name}` : this.name;
  }
}

function computeSymbolHash(name: string, ns: string | null): number {
  let h = SYM_HASH_SEED;
  if (ns !== null) {
    h = (Math.imul(h, 31) + hashString(ns)) | 0;
  }
  h = (Math.imul(h, 31) + hashString(name)) | 0;
  return h;
}

/** Create a new symbol (not interned). */
export function symbol(name: string, ns?: string): Sym {
  return new Sym(name, ns ?? null);
}

export function isSymbol(x: unknown): x is Sym {
  return x instanceof Sym;
}
