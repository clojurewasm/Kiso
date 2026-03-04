# Kiso Roadmap

ClojureScript-to-JavaScript compiler in TypeScript. Zero dependencies.
Monorepo: `@clojurewasm/kiso` (compiler + runtime), `@clojurewasm/su` (component framework).

## Phase Tracker

| Phase | Name                   | Status | Notes                                                    |
|-------|------------------------|--------|----------------------------------------------------------|
| 1     | Reader                 | DONE   | Full Clojure reader, syntax-quote, namespaced maps       |
| 2     | Core Macros + Analyzer | DONE   | ~24 core macros, 16+ SFs, destructuring, interop         |
| 3     | Codegen + Source Map   | DONE   | Emitter + Source Map V3 (VLQ encoding)                   |
| 4     | Runtime                | DONE   | Full data structures, protocols, LazySeq, ArrayMap       |
| 5     | Mini Evaluator         | DONE   | Evaluator core + ~30 built-ins + macro expander          |
| 6     | Vite Integration       | DONE   | compile API + Vite plugin + HMR                          |
| 7     | su Framework           | DONE   | reactive, component, hiccup, css, lifecycle, HMR         |
| 8     | Codegen Quality        | DONE   | Pretty-print, constructor fix, munge fix, truthy, srcmap |
| 9     | Codegen Readability    | DONE   | Readable munging, destructuring, IIFE cond, codegen hooks |
| 10    | CLI                    | DONE   | kiso compile command, source map, out-dir, file/dir resolve |
| 11    | State Management       | DONE   | Props channeling, context API, devtools trace             |
| 12    | CI + Multi-File        | DONE   | GitHub Actions, multi-ns example, cross-file validation   |
| 13    | Conformance Tests      | DONE   | Language spec tests, edge cases, complex patterns         |
| 14    | Standard Library       | DONE   | clojure.string, for/doseq, defmulti/defmethod            |
| 15    | Browser E2E            | DONE   | Playwright, real browser validation                       |
| 16    | JS Interop Layer       | DONE   | bean, js-obj, js-array interop helpers                    |
| 17    | Var Coverage Expansion | DONE   | 328/338 vars (~97%), clojure.set, clojure.walk            |
| 18    | Sorted Collections     | DONE   | PersistentTreeMap (LLRB), PersistentTreeSet, 100% vars    |
| 19    | def Mutability         | DONE   | def→let, binding/with-redefs on def vars                  |
| 20    | Transient Collections  | DONE   | TransientVector/HashMap/HashSet, conj!/assoc!             |
| 21    | Metadata Propagation   | DONE   | meta, with-meta, vary-meta via WeakMap                    |
| 22    | Performance Benchmarks | DONE   | Vitest bench suite, baseline measurements                 |
| 23    | npm Publish Prep       | DONE   | Keywords, export map, build verification, dry-run         |
| 24    | Release Polish         | DONE   | Codegen, CI, bundle, docs, showcase, quality              |

Phases 1-24 complete. 1435 vitest + 14 Playwright E2E tests. Types clean.
Var coverage: 330/330 (100%). Phase details: `.dev/archive/phases.md`.

## Phase 25: Known Issues Resolution — WIP

Resolve all Known Issues (I1-I6) from `tracker.md`. Order: quick fixes first, then reactivity improvements.

- 25.1 I4: Add `contains?`/`subs` to RUNTIME_FUNCTIONS
- 25.2 I3: Sets callable as IFn (`(#{:a :b} :a)` → `:a`)
- 25.3 I2: `#js` tagged literal support (`#js [1 2]` → JS array, `#js {:a 1}` → JS object)
- 25.4 I1: Reactive `:class`/`:style` attrs (fn values → per-attr `effect()`)
- 25.5 I6: Fine-grained DOM updates in `bind()` (text/attr patching, avoid full replaceChild)
- 25.6 I5: `:inner-html` attribute support in su hiccup

## Phase 26: Macro Plugin System (Future)

Extract su-specific macros (`defc`, `defstyle`) from kiso core into a plugin architecture.
Currently these 2 macros are hard-coded in `kiso/analyzer/macros.ts`, creating
an implicit reverse dependency from kiso → su. This phase fixes that.

- 26.1 TypeScript-level macro plugin API (`MacroPlugin` interface in `CompileOptions`)
- 26.2 Move `defc` expansion to `su/src/macros.ts` (su-side plugin registration)
- 26.3 Move `defstyle` expansion to `su/src/macros.ts`
- 26.4 Verify kiso has zero su-specific knowledge after migration

**Rationale**: kiso should be a pure compiler + runtime with no framework-specific macros.
The existing `codegenHooks` pattern (su registers hooks at compile time) is the right model —
`macroPlugins` extends this to the macro expansion phase. This enables third-party frameworks
to define their own macros without forking kiso.
