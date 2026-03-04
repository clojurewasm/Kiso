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

  return false;
}
