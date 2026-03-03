# Kiso Roadmap

ClojureScript-to-JavaScript compiler in TypeScript. Zero dependencies.
Package: `@kiso/cljs`. Framework: `@kiso/su`.

## Phase Tracker

| Phase | Name                  | Status  | Notes |
|-------|-----------------------|---------|-------|
| 1     | Reader                | DONE    | ~95% — namespaced maps, ratio, tagged deferred |
| 2     | Core Macros + Analyzer| PARTIAL | ~22/40 macros, 16/20 SFs |
| 3     | Codegen + Source Map  | PARTIAL | Emitter done, Source Map not started |
| 4     | Runtime               | PARTIAL | Core data structures done, Protocol/LazySeq not started |
| 5     | Mini Evaluator        | PENDING | Design doc ready (03-macros.md) |
| 6     | Vite Integration      | PENDING | |
| 7     | su Framework          | PENDING | |

## Critical Path & Dependencies

```
Phase 2 remaining ──┐
  (macros, SFs)     │  No external deps, can proceed now
                    │
Phase 4: Protocol ──┤  Design: 06-protocol-lazyseq.md
  (protocols.ts)    │  Blocks: deftype*, defrecord*, extend-type, reify codegen
                    │
Phase 4: LazySeq ───┤  Depends on: Protocol (ISeq)
  (lazy-seq)        │  Blocks: lazy for/map/filter
                    │
Phase 3: SourceMap ─┤  Independent, can be done any time
                    │
Phase 5: Evaluator ─┤  Depends on: Phase 2 SFs mostly complete
  (defmacro)        │  Blocks: cljs.core as .cljs, user macros
                    │
Phase 6: Vite ──────┤  Depends on: Phase 5 (compile API), Phase 3 (source maps)
                    │
Phase 7: su ────────┘  Depends on: Phase 6
```

## Phase 1: Reader — DONE

Form data model, tokenizer, reader with full Clojure syntax support.
Port CW knowledge: edge cases, number parsing, syntax-quote, namespaced maps.

- 1.1 ~~Project scaffolding~~ DONE
- 1.2 ~~Form data model~~ DONE
- 1.3 ~~Tokenizer~~ DONE
- 1.4 ~~Reader core~~ DONE
- 1.5 ~~Reader macros~~ DONE
- 1.6 ~~Syntax-quote~~ DONE
- 1.7 Namespaced maps (#:ns{}, #::alias{}, #::{}) — deferred, low usage
- 1.8 Reader edge cases — mostly done, some deferred

## Phase 2: Core Macros + Analyzer — PARTIAL

~40 core macro transforms (Form → Form) + analyzer (Form → Node).

**Done:**
- 2.1 ~~Core macros: control flow~~ (when, cond, if-let, and, or, not, etc.)
- 2.2 ~~Core macros: threading~~ (->, ->>, some->, some->>, as->, doto)
- 2.3 Core macros: definition — partial (defn, defonce done; defmulti, defprotocol, deftype, defrecord pending)
- 2.4 Core macros: binding — partial (let, loop, letfn done; for, doseq, dotimes pending)
- 2.5 ~~Analyzer: special form dispatch~~ DONE
- 2.6 ~~Analyzer: scope tracking~~ DONE
- 2.7 ~~Analyzer: destructuring~~ DONE
- 2.8 ~~Analyzer: interop rewrite~~ DONE (.method, Ctor., .-field, `.` SF)

**Remaining:**
- case* SF + case macro
- var SF
- deftype* SF (depends on Protocol design — 06-protocol-lazyseq.md)
- defrecord* SF (depends on Protocol design)
- Macros: for, doseq, dotimes, condp, cond->, cond->>, when-first, when-some, if-some, .., declare, assert, time, lazy-seq, delay
- Macros: defprotocol, defmulti, defmethod, deftype, defrecord (depend on Protocol)

## Phase 3: Codegen + Source Map — PARTIAL

Node → ES6 JavaScript + Source Map V3.

- 3.1 ~~Emitter core~~ DONE
- 3.2 ~~Functions (fn, multi-arity, recur)~~ DONE
- 3.3 ~~NS → ES6 modules~~ DONE
- 3.4 Source Map V3 (VLQ encoding) — NOT STARTED
- 3.5 ~~End-to-end integration tests~~ DONE

## Phase 4: Runtime — PARTIAL

Persistent data structures, protocols, hash, equiv. Tree-shakeable ES6 modules.

- 4.1 ~~Hash (Murmur3) + equiv~~ DONE
- 4.2 ~~Keyword + Symbol~~ DONE
- 4.3 ~~PersistentList~~ DONE
- 4.4 ~~PersistentVector~~ DONE
- 4.5 ~~PersistentHashMap (HAMT)~~ DONE
- 4.6 ~~PersistentHashSet~~ DONE
- 4.7 ~~Seq abstraction (ISeq eager)~~ DONE
- 4.8 ~~Atom~~ DONE
- 4.9 Protocol system — NOT STARTED (design: 06-protocol-lazyseq.md)
- 4.10 LazySeq — NOT STARTED (depends on 4.9)
- 4.11 ArrayMap (<=8 entries, auto-promote) — NOT STARTED
- 4.12 Transient collections — deferred
- 4.13 interop.ts (clj->js, js->clj) — NOT STARTED

## Phase 5: Mini Evaluator — PENDING

defmacro support via minimal Clojure evaluator (CW TreeWalk knowledge).
Design: 03-macros.md (detailed skeleton, built-in list, pipeline design).

- 5.1 Evaluator core (special forms: def, fn*, let*, do, if, quote)
- 5.2 Built-in functions (~30: cons, concat, seq, symbol, gensym, etc.)
- 5.3 Macro expander pipeline (core macros + user defmacro)

## Phase 6: Vite Integration — PENDING

Vite plugin for .cljs files, HMR support.

- 6.1 Public API (compile, compileFile, read, analyze, generate)
- 6.2 Vite transform plugin
- 6.3 HMR (hot module replacement for .cljs)

## Phase 7: su Framework — PENDING

Web Components framework with fine-grained reactivity. No VDOM, no React. ~3-5KB gzipped.
defc → Custom Element + Shadow DOM. solid-element pattern (Solid.js signals inside WC).
Design: `07-su-framework.md`. Decision: D8.

**Prerequisites from @kiso/cljs** (during earlier phases):
- 7.0 Atom tracking hook + watch unsubscribe (K04, K05 — small atom.ts patch)

**su-runtime** (pure TypeScript, can develop in parallel with Batches B-E):
- 7.1 reactive.ts — track(), effect(), computed()
- 7.2 component.ts — defineComponent(), Custom Element class, Shadow DOM
- 7.3 hiccup.ts — renderHiccup(), bind(), tag parsing
- 7.4 css.ts — createSheet(), adoptedStyleSheets (Shadow DOM scoping)
- 7.5 lifecycle.ts — on-mount, on-unmount hooks

**su macros** (require Batch E: mini evaluator):
- 7.6 defc macro (su/core.cljs — component → Custom Element)
- 7.7 defstyle macro (su/core.cljs — CSS-as-data → adoptedStyleSheets)

**Integration**:
- 7.8 su vite-plugin.ts — HMR for components + styles
- 7.9 Dogfooding: todo-app (validates full @kiso/cljs + @kiso/su pipeline)
