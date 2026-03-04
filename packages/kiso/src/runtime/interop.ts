// Interop — clj->js, js->clj conversion functions.
//
// Converts between Kiso persistent data structures and plain JS values.

import { isKeyword, Keyword } from './keyword.js';
import { isVector, PersistentVector, vector } from './vector.js';
import { isHashMap, PersistentHashMap, hashMap } from './hash-map.js';
import { isHashSet, PersistentHashSet } from './hash-set.js';
import { isList, first, rest, count } from './list.js';
import { keyword } from './keyword.js';

/** Convert Kiso persistent data to plain JS. */
export function clj_to_js(x: unknown): unknown {
  if (x === null || x === undefined) return x;

  if (isKeyword(x)) {
    const kw = x as Keyword;
    return kw.ns ? `${kw.ns}/${kw.name}` : kw.name;
  }

  if (isVector(x)) {
    const v = x as PersistentVector;
    const arr: unknown[] = [];
    for (let i = 0; i < v.count; i++) {
      arr.push(clj_to_js(v.nth(i)));
    }
    return arr;
  }

  if (isList(x)) {
    const arr: unknown[] = [];
    let l = x;
    while (count(l as any) > 0) {
      arr.push(clj_to_js(first(l as any)));
      l = rest(l as any);
    }
    return arr;
  }

  if (isHashMap(x)) {
    const m = x as PersistentHashMap;
    const obj: Record<string, unknown> = {};
    m.forEach((key, val) => {
      const k = isKeyword(key) ? (key as Keyword).name : String(key);
      obj[k] = clj_to_js(val);
    });
    return obj;
  }

  if (isHashSet(x)) {
    const s = x as PersistentHashSet;
    const arr: unknown[] = [];
    s.forEach((key) => arr.push(clj_to_js(key)));
    return arr;
  }

  return x;
}

/** Shallow JS object → persistent map with keyword keys. */
export function bean(obj: unknown): unknown {
  if (obj == null) return null;
  const kvs: unknown[] = [];
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    kvs.push(keyword(k), v);
  }
  return hashMap(...kvs);
}

/**
 * Convert to plain JS object.
 * - If first arg is a PersistentHashMap: shallow convert (keyword keys → string keys)
 * - Otherwise: treat as key-value pairs like CLJS (js-obj "k1" v1 "k2" v2)
 */
export function js_obj(...args: unknown[]): unknown {
  if (args.length === 1 && isHashMap(args[0])) {
    const m = args[0] as PersistentHashMap;
    const obj: Record<string, unknown> = {};
    m.forEach((key, val) => {
      const k = isKeyword(key) ? (key as Keyword).name : String(key);
      obj[k] = val; // shallow — no recursive conversion
    });
    return obj;
  }
  // Key-value pairs
  const obj: Record<string, unknown> = {};
  for (let i = 0; i < args.length; i += 2) {
    obj[String(args[i])] = args[i + 1];
  }
  return obj;
}

/** Shallow convert sequential collection to JS array. */
export function js_array(coll: unknown): unknown[] {
  if (isVector(coll)) {
    const v = coll as PersistentVector;
    const arr: unknown[] = [];
    for (let i = 0; i < v.count; i++) {
      arr.push(v.nth(i)); // shallow
    }
    return arr;
  }
  if (isList(coll)) {
    const arr: unknown[] = [];
    let l = coll;
    while (count(l as any) > 0) {
      arr.push(first(l as any)); // shallow
      l = rest(l as any);
    }
    return arr;
  }
  if (Array.isArray(coll)) return coll;
  return [];
}

/** Convert plain JS data to Kiso persistent data (recursive). */
export function js_to_clj(x: unknown): unknown {
  if (x === null || x === undefined) return x;

  if (Array.isArray(x)) {
    return vector(...x.map(js_to_clj));
  }

  if (typeof x === 'object' && x.constructor === Object) {
    const kvs: unknown[] = [];
    for (const [k, v] of Object.entries(x)) {
      kvs.push(keyword(k), js_to_clj(v));
    }
    return hashMap(...kvs);
  }

  return x;
}

// Backward-compatible camelCase aliases
export { clj_to_js as cljToJs, js_to_clj as jsToClj };
