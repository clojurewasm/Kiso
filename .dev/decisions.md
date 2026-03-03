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
