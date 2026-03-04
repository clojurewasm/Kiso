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

Phases 1-23 complete. 1403 vitest + 14 Playwright E2E tests. Types clean.
Var coverage: 330/330 (100%). All vars implemented.
Design: `.dev/design/08-quality-and-ecosystem.md` (Q1-Q7 details).

| 24    | Release Polish         | WIP    | Codegen readability, WC emit, CI, bundle, docs, quality  |

## Phase 1: Reader — DONE

- 1.1 ~~Project scaffolding~~ DONE
- 1.2 ~~Form data model~~ DONE
- 1.3 ~~Tokenizer~~ DONE
- 1.4 ~~Reader core~~ DONE
- 1.5 ~~Reader macros~~ DONE
- 1.6 ~~Syntax-quote~~ DONE
- 1.7 ~~Namespaced maps~~ DONE (K02)
- 1.8 ~~Reader edge cases~~ DONE (nesting depth limit K03)

## Phase 2: Core Macros + Analyzer — DONE

- 2.1 ~~Core macros: control flow~~ DONE (when, cond, if-let, and, or, not, etc.)
- 2.2 ~~Core macros: threading~~ DONE (->, ->>, some->, some->>, as->, doto)
- 2.3 ~~Core macros: definition~~ DONE (defn, defonce, defprotocol, deftype, defrecord)
- 2.4 ~~Core macros: binding~~ DONE (let, loop, letfn, dotimes)
- 2.5 ~~Analyzer: special form dispatch~~ DONE
- 2.6 ~~Analyzer: scope tracking~~ DONE
- 2.7 ~~Analyzer: destructuring~~ DONE
- 2.8 ~~Analyzer: interop rewrite~~ DONE
- 2.9 ~~case* SF + case macro~~ DONE
- 2.10 ~~var SF~~ DONE
- 2.11 ~~deftype*, defrecord* SFs~~ DONE
- 2.12 ~~Macros: condp, cond->, cond->>, when-first, when-some, if-some, .., declare, assert, time~~ DONE

## Phase 3: Codegen + Source Map — DONE

- 3.1 ~~Emitter core~~ DONE
- 3.2 ~~Functions (fn, multi-arity, recur)~~ DONE
- 3.3 ~~NS → ES6 modules~~ DONE
- 3.4 ~~Source Map V3 (VLQ encoding)~~ DONE
- 3.5 ~~End-to-end integration tests~~ DONE

## Phase 4: Runtime — DONE

- 4.1 ~~Hash (Murmur3) + equiv~~ DONE
- 4.2 ~~Keyword + Symbol~~ DONE
- 4.3 ~~PersistentList~~ DONE
- 4.4 ~~PersistentVector~~ DONE
- 4.5 ~~PersistentHashMap (HAMT)~~ DONE
- 4.6 ~~PersistentHashSet~~ DONE
- 4.7 ~~Seq abstraction (ISeq eager)~~ DONE
- 4.8 ~~Atom~~ DONE
- 4.9 ~~Protocol system~~ DONE
- 4.10 ~~LazySeq~~ DONE
- 4.11 ~~ArrayMap (<=8 entries, auto-promote)~~ DONE
- 4.12 Transient collections — deferred (not needed yet)
- 4.13 ~~interop.ts (clj->js, js->clj)~~ DONE

## Phase 5: Mini Evaluator — DONE

- 5.1 ~~Evaluator core (def, fn*, let*, do, if, quote, loop*, recur)~~ DONE
- 5.2 ~~Built-in functions (~30)~~ DONE
- 5.3 ~~Macro expander pipeline~~ DONE

## Phase 6: Vite Integration — DONE

- 6.1 ~~Public API (compile, compileFile, read, analyze, generate)~~ DONE
- 6.2 ~~Vite transform plugin~~ DONE
- 6.3 ~~HMR (hot module replacement for .cljs)~~ DONE

## Phase 7: su Framework — DONE

- 7.0 ~~Atom tracking hook + watch unsubscribe~~ DONE (K04, K05)
- 7.1 ~~reactive.ts — track(), effect(), computed()~~ DONE
- 7.2 ~~component.ts — defineComponent(), Custom Element, Shadow DOM~~ DONE
- 7.3 ~~hiccup.ts — renderHiccup(), bind()~~ DONE
- 7.4 ~~css.ts — createSheet(), adoptedStyleSheets~~ DONE
- 7.5 ~~lifecycle.ts — on-mount, on-unmount~~ DONE
- 7.6 ~~defc macro~~ DONE (K08, K09, K11)
- 7.7 ~~defstyle macro~~ DONE (K10)
- 7.8 ~~HMR for components + styles~~ DONE
- 7.9 ~~Dogfooding: todo-app~~ DONE

## Phase 8: Codegen Quality — DONE

Improve generated JS readability and fix codegen bugs discovered during review.

- 8.1 ~~Pretty-print: multi-line output with indentation~~ DONE
- 8.2 ~~Fix constructor emit: `(js/Error. "msg")` → `new Error("msg")`~~ DONE
- 8.3 ~~Fix arithmetic munge: `-` → `subtract`, `/` → `divide`~~ DONE
- 8.4 ~~Reduce truthiness verbosity: `truthy(x)` runtime helper~~ DONE
- 8.5 ~~Line-level source map mappings (per-form positions)~~ DONE

## Phase 9: Codegen Readability — DONE

Improve generated JS output to be human-readable, not "auto-generated" looking.

- 9.1 ~~Readable operator names: +→add, *→multiply, =→eq, etc.~~ DONE
- 9.2 ~~Clean character munging: ?→_p, !→_m, *x*→_x_, ->→_to_~~ DONE
- 9.3 ~~Shorter destructuring gensyms: _sc0/_ss1/_m2 format, skip redundant temps~~ DONE
- 9.4 ~~Cond as if-else chain: deep if-chains emit IIFE with early returns~~ DONE
- 9.5 ~~Codegen hooks API: codegenHooks in CompileOptions~~ DONE
- 9.6 ~~su codegen hooks: define-component/create-stylesheet emit JS object literals~~ DONE
- 9.7 ~~Bug fix: runtime import collision when user def shadows operator name~~ DONE
- 9.8 ~~Bug fix: seq destructuring with multiple elements before &~~ DONE
- 9.9 ~~Bug fix: munge % character from #() reader macro~~ DONE
- 9.10 ~~Bug fix: shorten function parameter gensyms to _p0 format~~ DONE

## Phase 10: CLI — DONE

Command-line interface for standalone compilation.

- 10.1 ~~Argument parser (node:util.parseArgs)~~ DONE
- 10.2 ~~File/directory target resolver~~ DONE
- 10.3 ~~compile command with source map and out-dir support~~ DONE
- 10.4 ~~bin wrapper (npx kiso compile ...)~~ DONE

## Phase 11: State Management — DONE

Cross-component state sharing and debugging tools for su framework.

- 11.1 ~~Props Channeling: JS property channel for non-primitive attrs on Custom Elements~~ DONE
- 11.2 ~~Context API: provide/useContext via CustomEvent (Lit Context pattern)~~ DONE
- 11.3 ~~DevTools Trace: atom labels + global onChange hook + enableTrace/disableTrace~~ DONE

## Phase 12: CI + Multi-File Validation — DONE

CI pipeline and real-world multi-file project validation.

- 12.1 ~~GitHub Actions CI (typecheck + test, Node 20/22)~~ DONE
- 12.2 ~~Multi-namespace example app (`examples/multi-ns-app/`)~~ DONE
- 12.3 ~~Cross-file require/refer validation~~ DONE
- 12.4 ~~Nested directory → namespace mapping test~~ DONE
- 12.5 ~~Build validation (vite build succeeds)~~ DONE

## Phase 13: Conformance Tests — DONE

Language specification conformance tests for edge cases.

- 13.1 ~~Threading macro edge cases (some->/some->> nil, as-> complex)~~ DONE
- 13.2 ~~JS interop advanced (chained calls, type coercion)~~ DONE
- 13.3 ~~Deep nested destructuring (combined :or + :as + &)~~ DONE
- 13.4 ~~Protocol edge cases (extend-type, multi-protocol reify)~~ DONE
- 13.5 ~~Multi-arity + variadic + destructuring combined~~ DONE
- 13.6 ~~Complex case/cond patterns~~ DONE
- 13.7 ~~letfn mutual recursion edge cases~~ DONE

## Phase 14: Standard Library — DONE

ClojureScript standard library namespaces and var coverage.

- 14.1 ~~`clojure.string` namespace (TS runtime module)~~ DONE
- 14.2 ~~Var coverage YAML (`.dev/status/vars.yaml`)~~ DONE
- 14.3 ~~`for` / `doseq` macros~~ DONE
- 14.4 ~~`defmulti` / `defmethod`~~ DONE

## Phase 15: Browser E2E — DONE

Playwright-based browser integration tests.

- 15.1 ~~Playwright setup + config~~ DONE
- 15.2 ~~Task-manager browser tests~~ DONE
- 15.3 ~~Multi-ns-app browser tests~~ DONE

## Phase 16: JS Interop Layer — DONE

Ergonomic JavaScript library interoperability.

- 16.1 ~~`bean` (shallow JS→CLJ conversion)~~ DONE
- 16.2 ~~`js-obj` / `js-array` helpers~~ DONE
- 16.3 ~~Library adapter patterns documentation~~ DONE

## Phase 17: Var Coverage Expansion — DONE

Systematic implementation of cljs.core vars, clojure.set, clojure.walk. 328/338 vars (~97%).

- 17.1 ~~Core batch 1 (46 fns: map ops, seq, numeric, predicates, higher-order)~~ DONE
- 17.2 ~~Core batch 2 (27 fns: collection ops, seq, regex, misc)~~ DONE
- 17.3 ~~Core batch 3 (25 fns: navigation, generators, empty/set, predicates, interop)~~ DONE
- 17.4 ~~clojure.set namespace (11 fns: union, intersection, difference, etc.)~~ DONE
- 17.5 ~~clojure.walk namespace (7 fns: walk, postwalk, prewalk, etc.)~~ DONE
- 17.6 ~~Core batch 4-6 (while macro, ==, printing, hash, type, instance?, prn, pr, dynamic vars, metadata, protocols)~~ DONE
- 17.7 ~~binding / with-redefs macros~~ DONE

## Phase 18: Sorted Collections — DONE

New data structures for sorted-map and sorted-set.

- 18.1 ~~Left-leaning red-black tree implementation~~ DONE
- 18.2 ~~sorted-map (PersistentTreeMap)~~ DONE
- 18.3 ~~sorted-set (PersistentTreeSet)~~ DONE
- 18.4 ~~Comparator support (compare enhanced for keywords/symbols, custom comparators)~~ DONE
- 18.5 ~~subseq / rsubseq~~ DONE
- 18.6 ~~Core integration (count, conj, get, assoc, dissoc, empty, sorted?, etc.)~~ DONE

## Phase 19: def Mutability + Full Dynamic Vars — DONE

Enable `set!` on `def`-bound vars for proper `binding`/`with-redefs`.

- 19.1 ~~Emit `let` instead of `const` for `def` (update emitter + 15 test assertions)~~ DONE
- 19.2 `alter-var-root` — not needed (set! is sufficient, not a tracked var)
- 19.3 ~~`binding` working with `def`-bound vars~~ DONE (verified with conformance tests)
- 19.4 `^:dynamic` metadata — no behavioral change needed (all defs are mutable)

## Phase 20: Transient Collections — DONE

Mutable transient variants for batch operations.

- 20.1 ~~TransientVector~~ DONE
- 20.2 ~~TransientHashMap~~ DONE
- 20.3 ~~TransientHashSet~~ DONE
- 20.4 ~~`transient`, `persistent!`, `conj!`, `assoc!`, `dissoc!`, `disj!`~~ DONE

## Phase 21: Metadata Propagation — DONE

Metadata support via WeakMap store on collection copies.

- 21.1 ~~`meta` returns attached metadata~~ DONE
- 21.2 ~~`with-meta` on vectors, maps, sets, lists (shallow copy + WeakMap)~~ DONE
- 21.3 ~~`vary-meta` applies function to current metadata~~ DONE
- 21.4 Metadata preservation through map/filter/reduce — deferred (requires collection-level integration)

## Phase 22: Performance Benchmarks — DONE

Establish baselines with vitest bench.

- 22.1 ~~Benchmark suite (vitest bench)~~ DONE
- 22.2 ~~PersistentVector / PersistentHashMap / TreeMap read/write benchmarks~~ DONE
- 22.3 ~~Compiler throughput (180K forms/sec)~~ DONE
- 22.4 ~~Transient vs persistent comparison benchmarks~~ DONE

## Phase 23: npm Publish Preparation — DONE

Prepare packages for npm registry.

- 23.1 ~~Package metadata (keywords, repository, description)~~ DONE
- 23.2 ~~Export map validation (added sorted-map, sorted-set, transient)~~ DONE
- 23.3 ~~Build verification (tsc build, dist/ output checked)~~ DONE
- 23.4 ~~Publish dry-run (kiso: 136KB/178 files, su: 16KB/41 files)~~ DONE

## Phase 24: Release Polish — WIP

Pre-release quality improvements across codegen, CI, documentation, and general quality.

- 24.1 Codegen audit script (`.dev/scripts/compile-samples.mjs`)
- 24.2 Codegen readability improvements (formatting, IIFE reduction, CSS multiline)
- 24.3 Web Components class emit evaluation (defc → `class extends HTMLElement`)
- 24.4 CI improvements (E2E Playwright job, bundle size check)
- 24.5 Bundle size measurement and README documentation
- 24.6 Documentation + examples update (docstring, defstyle D11, latest API)
- 24.7 General quality audit and fixes

## Phase 25: Macro Plugin System (Future)

Extract su-specific macros (`defc`, `defstyle`) from kiso core into a plugin architecture.
Currently these 2 macros are hard-coded in `kiso/analyzer/macros.ts`, creating
an implicit reverse dependency from kiso → su. This phase fixes that.

- 25.1 TypeScript-level macro plugin API (`MacroPlugin` interface in `CompileOptions`)
- 25.2 Move `defc` expansion to `su/src/macros.ts` (su-side plugin registration)
- 25.3 Move `defstyle` expansion to `su/src/macros.ts`
- 25.4 Verify kiso has zero su-specific knowledge after migration

**Rationale**: kiso should be a pure compiler + runtime with no framework-specific macros.
The existing `codegenHooks` pattern (su registers hooks at compile time) is the right model —
`macroPlugins` extends this to the macro expansion phase. This enables third-party frameworks
to define their own macros without forking kiso.

**Related cleanup** (optional, lower priority):
- Attribute handler registry for `applyAttrs` (replace ad-hoc branching with chain-of-responsibility)
- Explicit component lifecycle phase model for su

## Known Gaps / Future Work

- `alter-var-root` not implemented (set! is sufficient for current model)
- Transient collections use copy-on-transient model (Phase 20), not COW in HAMT
- Metadata not auto-propagated through map/filter/reduce (Phase 21.4)
- cljs.spec — may add later as optional
- core.async — may add later as optional
