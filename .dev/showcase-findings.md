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

### 6. `^:private` metadata on `def` not handled (analyzer.ts)

**Symptom**: `(def ^:private x 42)` threw "def requires a symbol".
**Root cause**: Reader wraps `^:private x` as `(with-meta x {:private true})`, but `analyzeDef`
expected `items[1]` to be a bare symbol — failed on the list wrapper.
**Fix**: Added `with-meta` unwrapping in `analyzeDef` before symbol check.
**Test**: `compile.test.ts` — "metadata on def" suite (3 tests: ^:private, ^:dynamic, ^{:doc}).

## Workarounds (not bugs, just current limitations)

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

---

## Round 2: Content Expansion (2026-03-05)

Added 9 code samples, 7 interactive components, 8 example projects.

### 7. `:class` / `:style` as function values silently ignored (hiccup.ts)

**Severity**: High — silent rendering failure (no error, just missing attributes)

**Symptom**: `{:class (fn [] (str "track" (when @active " on")))}` renders the element
without any `class` attribute. No error thrown.

**Root cause**: `applyAttrs` in `hiccup.ts` only handles:
- `:class` → `string`
- `:style` → `object` (plain map)

Function values are silently skipped by the `if (typeof val === 'string')` guard.

**Temporary workaround**: Wrap the entire hiccup subtree in a reactive `(fn [] ...)`:

```clojure
;; BROKEN — class is silently dropped
[:div {:class (fn [] (str "active" (when @flag " on")))}]

;; WORKAROUND — reactive fn re-creates hiccup on change
(fn []
  [:div {:class (str "active" (when @flag " on"))}])
```

**NOTE**: This is a regression / missing feature, NOT the intended design.
The `defc` macro was specifically designed so users don't need to wrap in `(fn [] ...)`.
The reactive attribute binding (`:class`, `:style` as functions) should be implemented
properly in `applyAttrs` / `hiccup.ts` so that the ergonomic pattern works:

```clojure
;; DESIRED — should work with reactive attr binding
(defc my-toggle []
  (let [active (atom false)]
    [:div {:class (fn [] (str "track" (when @active " on")))}]))
```

**Design consideration** — how to implement reactive attribute functions:

| Option   | Description                                                       | Pros                              | Cons                                   |
|----------|-------------------------------------------------------------------|-----------------------------------|----------------------------------------|
| Option A | Reactive attrs via `effect()` per attribute                       | Ergonomic, fine-grained updates   | Complexity, many effects per component |
| Option B | Keep current model, document `(fn [] hiccup)` pattern             | Simple, works today               | Less ergonomic, re-renders subtree     |
| Option C | Support `:class` and `:style` as functions only (common patterns) | Targeted, low risk                | Inconsistent (why only those two?)     |

**Affected**: toggle_switch, accordion, tabs, progress_bar, dropdown_select, pomodoro-timer.

### 8. `clojure.string :as str` collision with runtime `str` (emitter.ts)

**Severity**: High — build failure ("Identifier str has already been declared")

**Symptom**: Files using `(:require [clojure.string :as str])` AND core `str` function
fail at Rollup/Vite build time due to duplicate `str` identifier.

**Root cause**: `emitModuleWithMappings()` collision detection only checked `userDefs`
(top-level def names) but NOT namespace alias names.

**Fix**: Added ns alias values to collision detection set in `emitter.ts:130-136`.
Now emits `import { str as _rt_str } from '@clojurewasm/kiso/runtime'`.

**Test**: `test/api/compiler.test.ts` — "aliases runtime import when ns alias collides"

### 9. `innerHTML` not supported in su hiccup

**Severity**: Low — design choice, not a bug

su's hiccup renderer doesn't handle innerHTML as a special attribute.
The markdown-editor example was reworked to produce hiccup directly (md to hiccup vectors).

For cases where raw HTML insertion is needed, use `set!` on the DOM element via interop
after mount.
