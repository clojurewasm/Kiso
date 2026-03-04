// Keyword — Interned, callable, immutable name with optional namespace.
//
// Keywords are interned: keyword('foo') === keyword('foo').
// Keywords implement IFn: keyword('foo')(map) performs lookup.
// Hash uses seed 0x9e3779b9 (from CW hash.zig).

import { hashString } from './hash.js';
import { isHashMap, PersistentHashMap } from './hash-map.js';

const KW_HASH_SEED = 0x9e3779b9;
const KW_TAG = Symbol.for('kiso.keyword');

/** A keyword is a callable function that performs map lookup. */
export interface Keyword {
  (coll: unknown, notFound?: unknown): unknown;
  readonly _tag: symbol;
  readonly ns: string | null;
  readonly name: string;
  readonly hash: number;
  toString(): string;
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

/** Get or create an interned keyword. Callable as a map lookup function. */
export function keyword(name: string, ns?: string): Keyword {
  const nsVal = ns ?? null;
  const key = internKey(name, nsVal);
  const existing = INTERN.get(key);
  if (existing) return existing;

  const hash = computeKeywordHash(name, nsVal);

  // Create callable keyword — (:foo m) ≡ (get m :foo)
  const fn = function kwFn(coll: unknown, notFound?: unknown): unknown {
    const defaultVal = notFound !== undefined ? notFound : null;
    if (coll === null || coll === undefined) return defaultVal;
    if (isHashMap(coll)) {
      const v = (coll as PersistentHashMap).get(fn);
      return v !== undefined ? v : defaultVal;
    }
    return defaultVal;
  } as unknown as Keyword;

  Object.defineProperty(fn, '_tag', { value: KW_TAG });
  Object.defineProperty(fn, 'ns', { value: nsVal });
  Object.defineProperty(fn, 'name', { value: name, configurable: true });
  Object.defineProperty(fn, 'hash', { value: hash });
  fn.toString = () => nsVal ? `:${nsVal}/${name}` : `:${name}`;

  INTERN.set(key, fn);
  return fn;
}

export function isKeyword(x: unknown): x is Keyword {
  return typeof x === 'function' && (x as unknown as Record<string, unknown>)._tag === KW_TAG;
}
