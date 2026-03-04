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

All 10 phases complete. 916 tests passing (840 kiso + 76 su). Types clean.

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

## Known Gaps / Future Work

- Transient collections (4.12) — deferred, not needed yet
- `for`, `doseq` macros — require seq/first/next runtime wiring
- `defmulti`/`defmethod` — dispatch infrastructure
- Monorepo structured as npm workspaces (`packages/kiso`, `packages/su`)
