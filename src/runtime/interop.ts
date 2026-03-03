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
export function cljToJs(x: unknown): unknown {
  if (x === null || x === undefined) return x;

  if (isKeyword(x)) {
    const kw = x as Keyword;
    return kw.ns ? `${kw.ns}/${kw.name}` : kw.name;
  }

  if (isVector(x)) {
    const v = x as PersistentVector;
    const arr: unknown[] = [];
    for (let i = 0; i < v.count; i++) {
      arr.push(cljToJs(v.nth(i)));
    }
    return arr;
  }

  if (isList(x)) {
    const arr: unknown[] = [];
    let l = x;
    while (count(l as any) > 0) {
      arr.push(cljToJs(first(l as any)));
      l = rest(l as any);
    }
    return arr;
  }

  if (isHashMap(x)) {
    const m = x as PersistentHashMap;
    const obj: Record<string, unknown> = {};
    m.forEach((key, val) => {
      const k = isKeyword(key) ? (key as Keyword).name : String(key);
      obj[k] = cljToJs(val);
    });
    return obj;
  }

  if (isHashSet(x)) {
    const s = x as PersistentHashSet;
    const arr: unknown[] = [];
    s.forEach((key) => arr.push(cljToJs(key)));
    return arr;
  }

  return x;
}

/** Convert plain JS data to Kiso persistent data. */
export function jsToClj(x: unknown): unknown {
  if (x === null || x === undefined) return x;

  if (Array.isArray(x)) {
    return vector(...x.map(jsToClj));
  }

  if (typeof x === 'object' && x.constructor === Object) {
    const kvs: unknown[] = [];
    for (const [k, v] of Object.entries(x)) {
      kvs.push(keyword(k), jsToClj(v));
    }
    return hashMap(...kvs);
  }

  return x;
}
