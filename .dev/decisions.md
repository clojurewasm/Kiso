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
