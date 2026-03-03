# Kiso Architectural Decisions

## D1: Full TypeScript Implementation

**Date**: 2026-03-03

Implement the entire ClojureScript compiler in TypeScript with zero native dependencies.
Port knowledge and algorithms from ClojureWasm (Zig), not code.

**Rationale**: npm install simplicity, single-language debugging, TS developer accessibility.
CW's real asset is the knowledge gained from implementing Clojure, not the Zig code itself.

**Affected**: Entire project architecture.

## D2: Self-Implemented Macro Evaluator (No SCI)

**Date**: 2026-03-03

Use a self-implemented mini evaluator for defmacro expansion instead of SCI dependency.
~40 core macros as TypeScript Form→Form functions. Mini evaluator with ~30 built-in functions.

**Rationale**: Zero dependencies, full control, CW TreeWalk knowledge directly applicable.
99% of macros need only ~30 functions. SCI can be added later as optional fallback.

**Affected**: `src/analyzer/macros.ts`, `src/analyzer/evaluator.ts`.

## D3: Package Structure

**Date**: 2026-03-03

- `@kiso/cljs` — compiler + runtime (single package initially)
- `@kiso/su` — Web Components framework (separate package, depends on @kiso/cljs)

Scoped packages (`@kiso/*`) to avoid npm name conflicts.

**Affected**: package.json, distribution strategy.

## D4: Reader Token-Level Design

**Date**: 2026-03-03

nil/true/false are tokenized as `symbol` kind (not separate token kinds like CW).
Discrimination happens in the Reader (`readSymbol`). This keeps the tokenizer simpler
and avoids redundant token kinds that duplicate the symbol reading path.

Column tracking is 1-indexed (matching the Form `col` field), differing from CW's 0-based.

Syntax-quote deferred to Phase 5: requires namespace resolution context which the
analyzer will provide. Current `backtick` token emits `(syntax-quote x)` wrapper form.

## D5: Runtime Data Structures

**Date**: 2026-03-03

- PersistentVector: 32-way bit-partitioned trie with tail optimization (CW algorithm)
- PersistentHashMap: HAMT with bitmap+popcount, BitmapIndexedNode + CollisionNode
- PersistentHashSet: thin wrapper over PersistentHashMap
- PersistentList: cons-cell linked list (simpler than CW's array-backed)
- Keyword: interned (global Map). Symbol: not interned.
- Hash: Murmur3 finalizer for collections, polynomial string hash, CW seeds.
- Atom: simple mutable container (single-threaded JS, no CAS needed).

**Deferred**: Seq abstraction (ISeq/LazySeq), Protocol system (Symbol-based dispatch),
Transient collections. These will be added when needed by the compiler pipeline.

**Affected**: `src/runtime/`.

## D6: Language Scope — Full ClojureScript (minus Google Closure)

**Date**: 2026-03-04

Kiso targets full ClojureScript language compatibility. NOT a minimal subset.

**In scope**:
- Full Reader (all reader macros, syntax-quote, namespaced maps)
- All ~40 core macros + defmacro via mini evaluator
- All special forms (~20: def, fn*, let*, do, if, loop*, recur, try, throw, new,
  `.`, set!, var, js*, ns, deftype*, defrecord*, letfn*, case*)
- Full Protocol system (defprotocol, deftype, defrecord, extend-type, reify)
- Full JS interop (.method, Ctor., .-field, js*, set!)
- Persistent data structures (Vector, HashMap, HashSet, List, LazySeq)
- Destructuring (sequential + associative, all modifiers)
- Multimethods (defmulti, defmethod)
- cljs.core as .cljs macro definitions (via mini evaluator)

**Intentionally excluded**:
- Google Closure Compiler dependency (no goog.* namespace)
- `:advanced` optimization (delegated to Vite/esbuild/Rollup)
- JVM Clojure host interop (ns :import of Java classes)
- cljs.spec (may add later as optional)
- core.async (may add later as optional)
- Reader conditional `:clj` target (only `:cljs` and `:default`)

**Rationale**: The goal is a practical ClojureScript compiler for modern web development.
Replacing Google Closure with Vite removes the biggest pain point of upstream CLJS
while keeping full language semantics. "Minimal subset" would limit adoption.

**Affected**: All modules — this sets the scope ceiling for the entire project.

## D7: Protocol Dispatch — JS Symbol Keys (Not CW-style Map Lookup)

**Date**: 2026-03-04

CW dispatches protocol methods via string-keyed map lookup (`valueTypeKey → impls map`).
Kiso uses **JS Symbol-keyed methods on prototypes** instead.

```typescript
const ISeq = defprotocol('ISeq', ['first', 'rest']);
// Dispatch: obj[ISeq.methods.first]() — native JS property lookup
```

**Rationale**:
- Leverages JS engine's optimized property lookup (hidden classes, inline caches)
- No need for custom inline cache or generation counter (CW complexity)
- Symbol keys avoid name collisions without mangling
- extend-type becomes `Proto.prototype[sym] = fn` (native JS pattern)
- deftype/defrecord become ES6 classes with `[sym]()` methods
- reify becomes object literal with `[sym]()` methods

**Trade-off**: Primitive types (string, number, nil) cannot have Symbol methods added
to their prototypes safely. These use a fallback path in `protocolFn`.

**Design**: See `.dev/design/06-protocol-lazyseq.md` for full specification.

**Affected**: `src/runtime/protocols.ts`, `src/analyzer/`, `src/codegen/emitter.ts`.

## D8: su Architecture — Web Components + Fine-Grained Signals (No VDOM)

**Date**: 2026-03-04

su compiles `defc` to Custom Elements with Shadow DOM. Fine-grained reactivity
(VanJS/Solid.js/solid-element pattern) drives updates inside the Shadow DOM.
No virtual DOM, no React dependency, no diffing engine.

**Core model**:
- `defc` → `customElements.define()` with Shadow DOM
- Component function runs **once** in `connectedCallback` (solid-element pattern)
- Kiso `atom` = su's state primitive (extended with tracking hook)
- `effect()` / `bind()` = fine-grained DOM updates inside Shadow DOM
- `defstyle` → `adoptedStyleSheets` (Shadow DOM provides natural CSS scoping)
- Props = observed attributes → atom signals → reactive updates

**Rationale** (from 12+ framework comparative research):
- solid-element proves signals work perfectly inside Custom Elements
- Shadow DOM provides natural CSS scoping — no class name hashing needed
- Custom Elements are web standards — interop with any framework or plain HTML
- adoptedStyleSheets share a single CSSStyleSheet across all instances
- Declarative Shadow DOM (Baseline 2024) enables SSR
- Fine-grained reactivity eliminates need for virtual DOM diffing

**Trade-off**: Shadow DOM adds ~2KB overhead vs plain direct DOM.
Custom Element re-registration is not possible — HMR uses render function replacement.

**Design**: See `.dev/design/07-su-framework.md` for full specification.

**Affected**: `@kiso/su` package (separate from `@kiso/cljs`).
`@kiso/cljs` impact: atom tracking hook (F1), watch unsubscribe (F2),
tag name generation (F8) — see design doc.
