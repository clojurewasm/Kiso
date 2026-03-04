# Showcase: Bugs Found & Workarounds

Findings from building the showcase app (dogfooding the compiler + su).

## Bugs Fixed

### 1. Duplicate `import * as` when alias matches prefix (emitter.ts)

**Symptom**: `(ns foo (:require [su.core :as su])) (su/mount ...)` emitted two imports:
```
import * as su from 'su.js';       // auto-import (wrong)
import * as su from 'su/core.js';  // ns require (correct)
```
**Root cause**: `nsAliases` maps full ns name (`su.core`) to alias (`su`), but var-ref resolution
looked up the prefix before `/` (`su`) as a key — found nothing — fell through to auto-import.
**Fix**: Added reverse lookup: if `ns` (prefix) matches any alias VALUE in `nsAliases`, use it directly.
**Test**: `compile.test.ts` — "does not duplicate import when alias matches prefix in qualified call"

### 2. Top-level `do` blocks emitted as comma expressions (emitter.ts)

**Symptom**: `defprotocol` → macro → `(do (def X ...) (def Y ...) (def Z ...))` emitted as
`(let X = ..., let Y = ..., let Z = ...)` — invalid JS (comma expression with `let`).
**Root cause**: `emitTopLevelCtx` didn't handle `do` nodes — fell through to `emitNode`/`emitDo`
which always wraps in `(stmt, stmt, ret)` comma expression.
**Fix**: Added `do` case in `emitTopLevelCtx` — flattens children and emits each as top-level.
**Test**: `compile.test.ts` — "emits top-level export let statements (not comma expression)"

### 3. `seq()` did not support maps/sets (seq.ts)

**Symptom**: `(doseq [[k v] attrs] ...)` where `attrs` is a hash-map silently returned null,
causing the loop body to never execute.
**Root cause**: `seq()` only handled lists, vectors, and arrays — no case for maps or sets.
**Fix**: Added map → `[key val]` vector entries and set → element conversion in `seq()`.
**Test**: `seq.test.ts` — 5 new tests for hash-map and hash-set seq support.

### 4. `clojure.string/join` failed on non-array seqables (string.ts)

**Symptom**: `(clojure.string/join "|" rules)` threw `coll.map is not a function` when
`rules` was a vector (not a JS array).
**Root cause**: `join` called `.map()` directly, assuming JS array input.
**Fix**: Added `seqToArray()` helper that converts any seqable to a JS array via `toArray()`.

### 5. `nth` missing from RUNTIME_FUNCTIONS and runtime exports (emitter.ts, core.ts, index.ts)

**Symptom**: `(nth rules i)` compiled to bare `nth(...)` call without import, causing
`ReferenceError: nth is not defined` at runtime.
**Root cause**: `nth` existed only as a method on `PersistentVector`, not as a standalone
function in `core.ts`. It was also not listed in `RUNTIME_FUNCTIONS` or re-exported from `index.ts`.
**Fix**: Implemented standalone `nth` function in `core.ts` (handles vectors, arrays, strings,
and seq fallback), added to `RUNTIME_FUNCTIONS` set, and added to `index.ts` re-exports.

## Workarounds (not bugs, just current limitations)

### `^:private` metadata on `def` not supported
`(def ^:private x ...)` throws "def requires a symbol" because the analyzer doesn't strip
metadata reader macros before checking the symbol. **Workaround**: Omit `^:private`.

### `defc` names must contain a hyphen
Custom Element names require a hyphen (web standard). `(defc counter ...)` fails.
**Workaround**: Use `(defc sample-counter ...)`.

### Top-level `await` requires `build.target: 'es2022'` in Vite
`(js/await ...)` compiles to top-level `await(...)` which older esbuild targets reject.
**Workaround**: Set `build: { target: 'es2022' }` in `vite.config.js`.

### Shadow DOM isolation prevents `document.querySelector` from finding inner elements
`defc` web components use Shadow DOM — elements inside are invisible to `document.querySelector`.
**Workaround**: For the showcase shell, use plain DOM manipulation instead of `defc`.
Su components are only used for the sample demos themselves (counter, todo, task-manager).
