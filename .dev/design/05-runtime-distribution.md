# Runtime & Distribution Design

## Runtime Design Principles

- **Tree-shakeable**: all named exports, unused modules excluded from bundles
- **ES6 Module**: distributed as type: "module"
- **Zero dependencies**: no external npm packages
- **CW HAMT/Vector algorithms ported directly**

---

## Key Data Structure Algorithms (from CW)

### PersistentVector — 32-way Trie

```typescript
const BITS = 5;
const WIDTH = 1 << BITS; // 32
const MASK = WIDTH - 1;  // 0x1f

class PersistentVector<T> {
  private readonly count: number;
  private readonly shift: number;  // root level (5, 10, 15, ...)
  private readonly root: Node<T>;  // trie root
  private readonly tail: T[];      // tail leaf (max 32 elements)

  nth(i: number): T { /* tail check → trie traversal */ }
  conj(val: T): PersistentVector<T> { /* tail append or push-tail */ }
  assocN(i: number, val: T): PersistentVector<T> { /* path copy */ }
}
```

CW mapping: `collections.zig: PersistentVector` → `vector.ts`.
Tail optimization identical. Path copy (CoW) same algorithm.

### PersistentHashMap — HAMT

```typescript
type HAMTNode<K, V> =
  | BitmapIndexedNode<K, V>   // sparse: bitmap + popcount indexing
  | ArrayNode<K, V>           // dense: 32-slot direct array
  | CollisionNode<K, V>;      // hash collision: linear list
```

**Key HAMT lessons from CW**:
1. **bitmap + popcount** for sparse array compression (memory efficient)
2. **5-bit hash fragments** per level — 32 slots per node
3. **CollisionNode** for same-hash different-keys (linear list)
4. **nil key stored separately** — `hasNull` + `nullValue` outside HAMT
5. **ArrayNode promotion** — BitmapIndexedNode > 16 entries → 32-slot ArrayNode
6. **Transient**: direct mutation (skip CoW), `persistent!` to freeze

### ArrayMap → HashMap Auto-promotion

```typescript
const HASHMAP_THRESHOLD = 8; // same threshold as CW
// ArrayMap (≤8 entries, linear scan) → HashMap (HAMT) on overflow
```

### Hash Functions (Murmur3 from CW)

```typescript
function murmur3(key: number): number { /* finalizer mix */ }
function hashString(s: string): number { /* h = 31*h + charCode */ }
function mixCollHash(hash: number, count: number): number { /* collection hash */ }
function hashOrdered(coll): number { /* list, vector — order dependent */ }
function hashUnordered(coll): number { /* map, set — order independent */ }
```

### Structural Equality (from CW equiv.zig)

**CW lesson**: `(= '(1 2) [1 2])` is `true`.
Sequential types compare elements regardless of concrete type.

### Protocol System — Symbol-based Dispatch

```typescript
const ISeq = defprotocol('ISeq', ['first', 'rest']);

// Implementation via Symbol keys
class PersistentList {
  [ISeq.methods.first]() { return this.head; }
  [ISeq.methods.rest]()  { return this.tail; }
}
```

Cleaner than CLJS's `cljs$core$ISeq$_first$arity$1` name mangling.
Symbol-based dispatch avoids name collisions.

---

## Distribution

### npm Package Structure

```
@kiso/cljs/
├── package.json
│   {
│     "name": "@kiso/cljs",
│     "version": "0.1.0",
│     "type": "module",
│     "exports": {
│       ".": "./dist/compiler/index.js",
│       "./core": "./dist/runtime/core.js",
│       "./vite": "./dist/vite/plugin.js"
│     }
│   }
├── dist/
│   ├── compiler/     Compiler (Node.js / Vite)
│   ├── runtime/      Runtime (browser, tree-shake target)
│   └── vite/         Vite plugin
└── clj/              Clojure sources (macro definitions)
```

### Vite Plugin

```typescript
export function cljs(options = {}): Plugin {
  return {
    name: 'vite-plugin-clojurescript',
    transform(code, id) {
      if (!id.endsWith('.cljs') && !id.endsWith('.cljc')) return null;
      const result = compile(code, { filename: id, sourceMap: true });
      return { code: result.code, map: result.map };
    },
    handleHotUpdate({ file, server }) {
      if (file.endsWith('.cljs') || file.endsWith('.cljc')) {
        // Invalidate and re-transform
      }
    },
  };
}
```

### su Package (Separate)

```
@kiso/su/
├── package.json    { peerDependencies: { "@kiso/cljs": "^0.1.0" } }
├── clj/su/core.cljs    defc, defstyle macros
├── runtime/            component, reactive, hiccup, css (~3KB)
└── vite-plugin.ts      su-specific Vite config
```

su is a regular consumer of `@kiso/cljs`.

---

## Size Estimates

### npm Package
```
Compiler (minified):  ~53 KB
Runtime (minified):   ~62 KB
Vite plugin:          ~3 KB
Total:                ~118 KB minified, ~40-50 KB gzipped
```

### Browser Bundle (after tree-shaking)
```
Typical su app:    ~35 KB minified → ~12 KB gzipped
su-runtime:        +3 KB gzipped
Total:             ~15 KB gzipped

Comparison: React ~42KB, Vue ~33KB, Svelte ~2KB, CLJS ~100+KB
```

---

## Total Implementation Estimate

```
reader/      ~1,000 lines
analyzer/    ~1,200 lines
codegen/     ~850 lines
runtime/     ~2,300 lines
api/         ~180 lines
─────────────────────
Total:       ~5,350 lines (excluding tests)
Tests:       ~2,500 lines
Grand total: ~7,850 lines
```

About 1/3 of CW (Zig, ~25,000 lines).
Savings: no GC/memory management, concise error handling, concise type definitions.
