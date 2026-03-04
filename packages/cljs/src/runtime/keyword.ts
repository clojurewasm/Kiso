// Keyword — Interned, immutable name with optional namespace.
//
// Keywords are interned: keyword('foo') === keyword('foo').
// Hash uses seed 0x9e3779b9 (from CW hash.zig).

import { hashString } from './hash.js';

const KW_HASH_SEED = 0x9e3779b9;
const KW_TAG = Symbol.for('kiso.keyword');

export class Keyword {
  readonly _tag = KW_TAG;
  readonly ns: string | null;
  readonly name: string;
  readonly hash: number;

  constructor(name: string, ns: string | null) {
    this.name = name;
    this.ns = ns;
    this.hash = computeKeywordHash(name, ns);
  }

  toString(): string {
    return this.ns ? `:${this.ns}/${this.name}` : `:${this.name}`;
  }
}

function computeKeywordHash(name: string, ns: string | null): number {
  let h = KW_HASH_SEED;
  if (ns !== null) {
    h = (Math.imul(h, 31) + hashString(ns)) | 0;
  }
  h = (Math.imul(h, 31) + hashString(name)) | 0;
  return h;
}

// Intern table: "ns/name" or "name" → Keyword
const INTERN = new Map<string, Keyword>();

function internKey(name: string, ns: string | null): string {
  return ns ? `${ns}/${name}` : name;
}

/** Get or create an interned keyword. */
export function keyword(name: string, ns?: string): Keyword {
  const nsVal = ns ?? null;
  const key = internKey(name, nsVal);
  let kw = INTERN.get(key);
  if (kw) return kw;
  kw = new Keyword(name, nsVal);
  INTERN.set(key, kw);
  return kw;
}

export function isKeyword(x: unknown): x is Keyword {
  return x instanceof Keyword;
}
