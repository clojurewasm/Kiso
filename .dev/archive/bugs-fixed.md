# Kiso Bugs Fixed (Archive)

## Showcase Dogfooding (Phase 24)

### 1. Duplicate `import * as` when alias matches prefix (emitter.ts)
`(ns foo (:require [su.core :as su])) (su/mount ...)` emitted two imports.
Fix: Added reverse lookup in nsAliases.

### 2. Top-level `do` blocks emitted as comma expressions (emitter.ts)
`defprotocol` macro expansion `(do (def X ...) ...)` emitted invalid comma expr with `let`.
Fix: Added `do` case in `emitTopLevelCtx`.

### 3. `seq()` did not support maps/sets (seq.ts)
`(doseq [[k v] attrs] ...)` on hash-map silently returned null.
Fix: Added map/set conversion in `seq()`.

### 4. `clojure.string/join` failed on non-array seqables (string.ts)
`join` called `.map()` directly, assuming JS array input.
Fix: Added `seqToArray()` helper.

### 5. `nth` missing from RUNTIME_FUNCTIONS and runtime exports
`(nth rules i)` → `ReferenceError: nth is not defined`.
Fix: Standalone `nth` in `core.ts` + RUNTIME_FUNCTIONS + index.ts exports.

### 6. `^:private` metadata on `def` not handled (analyzer.ts)
`(def ^:private x 42)` threw "def requires a symbol".
Fix: Added `with-meta` unwrapping in `analyzeDef`.

### 8. `clojure.string :as str` collision with runtime `str` (emitter.ts)
`(:require [clojure.string :as str])` caused duplicate identifier error.
Fix: Added ns alias collision detection, emits `_rt_str` alias.

### 10. Regex literals compiled as strings (analyzer.ts, emitter.ts)
`#"\n"` compiled to string `"\\n"` instead of RegExp `/\n/`.
Fix: Changed jsType to `'regex'`, added regex emitter case.

## Quality Items (Q2-Q6 from 08-quality-and-ecosystem.md)

- Q2: Multi-file validation — DONE (Phase 12)
- Q3: Var coverage tracking — DONE (Phase 14, `.dev/status/vars.yaml`)
- Q4: Conformance tests — DONE (Phase 13)
- Q5: Browser E2E — DONE (Phase 15, Playwright)
- Q6: CI — DONE (Phase 12, GitHub Actions)

## Known Issues (I1-I6, Phase 25)

- I1: Reactive :class/:style fn attrs — `applyAttrs` now wraps fn values in `effect()` for fine-grained reactive updates
- I2: #js tagged literal — analyzer handles `#js` tag, emits native JS arrays/objects (`JsArrayNode`/`JsObjectNode`)
- I3: Sets/Maps/Vectors as IFn — added `invoke()` dispatch + `toFn()` wrapper; 15 HOFs accept IFn predicates
- I4: contains?/subs runtime — added to `core.ts`, `RUNTIME_FUNCTIONS`, and `index.ts` exports
- I5: inner-html attribute — `applyAttrs` and `patchAttrs` set `el.innerHTML` for `:inner-html` key
- I6: bind() DOM patching — `patchNode` reuses same-tag elements, tracks attrs/listeners via WeakMaps
