// Hash functions for Clojure persistent data structures.
//
// Ported from CW's hash.zig. Uses Murmur3 for collection hashing.
// All hashes are 32-bit signed integers (JS bitwise ops return i32).

// -- Murmur3 constants --

const M3_C1 = 0xcc9e2d51;
const M3_C2 = 0x1b873593;

function imul(a: number, b: number): number {
  return Math.imul(a, b);
}

function rotl(x: number, r: number): number {
  return (x << r) | (x >>> (32 - r));
}

function mixK1(k: number): number {
  return imul(rotl(imul(k, M3_C1), 15), M3_C2);
}

function mixH1(h: number, k1: number): number {
  return (imul(rotl(h ^ k1, 13), 5) + 0xe6546b64) | 0;
}

function fmix(h: number, length: number): number {
  let x = h ^ length;
  x ^= x >>> 16;
  x = imul(x, 0x85ebca6b);
  x ^= x >>> 13;
  x = imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return x;
}

// -- Public hash functions --

export function hashNull(): number {
  return 0;
}

export function hashBoolean(v: boolean): number {
  return v ? 1231 : 1237;
}

export function hashInt(n: number): number {
  return n | 0;
}

export function hashFloat(n: number): number {
  // Use DataView to get the IEEE 754 double bit pattern
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  view.setFloat64(0, n);
  const lo = view.getInt32(4, false);
  const hi = view.getInt32(0, false);
  return (lo ^ hi) | 0;
}

export function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (imul(h, 31) + s.charCodeAt(i)) | 0;
  }
  return h;
}

/** Mix a collection hash with its element count via Murmur3 finalizer. */
export function mixCollHash(hash: number, count: number): number {
  let h = mixH1(0, mixK1(hash));
  return fmix(h, count);
}

/** Hash for ordered collections (list, vector). Element hashes pre-computed. */
export function hashOrdered(hashes: number[]): number {
  let h = 1;
  for (let i = 0; i < hashes.length; i++) {
    h = (imul(h, 31) + hashes[i]!) | 0;
  }
  return mixCollHash(h, hashes.length);
}

/** Hash for unordered collections (set, map entries). Element hashes pre-computed. */
export function hashUnordered(hashes: number[]): number {
  let h = 0;
  for (let i = 0; i < hashes.length; i++) {
    h = (h + hashes[i]!) | 0;
  }
  return mixCollHash(h, hashes.length);
}
