// Structural equality for Clojure values.
//
// Ported from CW's value.zig equivalence logic.
// Key semantic: sequential types compare structurally across types.
// (= '(1 2) [1 2]) → true

/** Clojure structural equality. */
export function equiv(a: unknown, b: unknown): boolean {
  // null/undefined
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;

  // Same reference
  if (a === b) return true;

  // Numbers (NaN !== NaN matches Clojure semantics)
  if (typeof a === 'number' && typeof b === 'number') {
    return a === b;
  }

  // Booleans — strict type match
  if (typeof a === 'boolean' || typeof b === 'boolean') {
    return false; // different types or a !== b already checked
  }

  // Strings
  if (typeof a === 'string' && typeof b === 'string') {
    return a === b;
  }

  // Different primitive types
  if (typeof a !== typeof b) return false;

  // Arrays (sequential structural equality)
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!equiv(a[i], b[i])) return false;
    }
    return true;
  }

  // Indexed collections with .count and .nth (PersistentVector, etc.)
  const ao = a as Record<string, any>;
  const bo = b as Record<string, any>;
  if (typeof ao.nth === 'function' && typeof ao.count === 'number'
      && typeof bo.nth === 'function' && typeof bo.count === 'number') {
    if (ao.count !== bo.count) return false;
    for (let i = 0; i < ao.count; i++) {
      if (!equiv(ao.nth(i), bo.nth(i))) return false;
    }
    return true;
  }

  // Keywords (interned by name+ns, but different instances may exist in test contexts)
  if (typeof ao._tag === 'symbol' && typeof bo._tag === 'symbol'
      && ao._tag === bo._tag
      && 'name' in ao && 'name' in bo) {
    return ao.name === bo.name && ao.ns === bo.ns;
  }

  return false;
}
