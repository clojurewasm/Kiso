# Kiso Roadmap

ClojureScript-to-JavaScript compiler in TypeScript. Zero dependencies.
Package: `@kiso/cljs`. Framework: `@kiso/su`.

## Phase Tracker

| Phase | Name                  | Status  |
|-------|-----------------------|---------|
| 1     | Reader                | DONE*   |
| 2     | Core Macros + Analyzer| PENDING |
| 3     | Codegen + Source Map  | PENDING |
| 4     | Runtime               | PENDING |
| 5     | Mini Evaluator        | PENDING |
| 6     | Vite Integration      | PENDING |
| 7     | su Framework          | PENDING |

## Phase 1: Reader

Form data model, tokenizer, reader with full Clojure syntax support.
Port CW knowledge: edge cases, number parsing, syntax-quote, namespaced maps.

- 1.1 Project scaffolding (package.json, tsconfig, vitest)
- 1.2 Form data model (form.ts)
- 1.3 Tokenizer (tokenizer.ts)
- 1.4 Reader core (reader.ts — literals, collections)
- 1.5 Reader macros (quote, deref, var, discard, fn literal, set literal, regex)
- 1.6 Syntax-quote (most complex — gensym, ns resolution, special form table)
- 1.7 Namespaced maps (#:ns{}, #::alias{}, #::{})
- 1.8 Reader edge cases (trailing slash, duplicate keys, nesting depth limit)

Estimated: ~1,000 lines + ~500 lines tests.

## Phase 2: Core Macros + Analyzer

~40 core macro transforms (Form → Form) + analyzer (Form → Node).

- 2.1 Core macros: control flow (when, cond, if-let, case)
- 2.2 Core macros: threading (->, ->>, some->, as->)
- 2.3 Core macros: definition (defn, defonce, defmulti, defprotocol)
- 2.4 Core macros: binding (let, loop, for, doseq, dotimes)
- 2.5 Analyzer: special form dispatch
- 2.6 Analyzer: scope tracking + symbol resolution
- 2.7 Analyzer: destructuring (sequential + associative)
- 2.8 Analyzer: interop rewrite (.method, Ctor., .-field)

Estimated: ~1,200 lines + ~600 lines tests.

## Phase 3: Codegen + Source Map

Node → ES6 JavaScript + Source Map V3.

- 3.1 Emitter core (literals, invocations, if, do, let)
- 3.2 Functions (fn, multi-arity → switch, recur → while)
- 3.3 NS → ES6 modules (import/export mapping)
- 3.4 Source Map V3 (VLQ encoding)
- 3.5 End-to-end: .cljs → .js integration tests

Estimated: ~850 lines + ~400 lines tests.

## Phase 4: Runtime

Persistent data structures, protocols, hash, equiv. Tree-shakeable ES6 modules.

- 4.1 Hash (Murmur3) + equiv (structural equality)
- 4.2 Keyword + Symbol (interning)
- 4.3 PersistentList (cons cell)
- 4.4 PersistentVector (32-way trie, tail optimization)
- 4.5 PersistentHashMap (HAMT — bitmap+popcount, collision nodes)
- 4.6 PersistentHashSet
- 4.7 Seq abstraction (ISeq, LazySeq)
- 4.8 Atom
- 4.9 Protocol system (Symbol-based dispatch)
- 4.10 Transient collections

Estimated: ~2,300 lines + ~800 lines tests.

## Phase 5: Mini Evaluator

defmacro support via minimal Clojure evaluator (CW TreeWalk knowledge).

- 5.1 Evaluator core (special forms: def, fn*, let*, do, if, quote)
- 5.2 Built-in functions (~30: cons, concat, seq, symbol, gensym, etc.)
- 5.3 Macro expander pipeline (core macros + user defmacro)

Estimated: ~800 lines + ~400 lines tests.

## Phase 6: Vite Integration

Vite plugin for .cljs files, HMR support.

- 6.1 Vite transform plugin
- 6.2 HMR (hot module replacement for .cljs)
- 6.3 Public API (compile, compileFile, read, analyze, generate)

Estimated: ~180 lines + ~100 lines tests.

## Phase 7: su Framework

Web Components framework built on @kiso/cljs.

- 7.1 defc macro (ClojureScript → Web Component)
- 7.2 defstyle macro (CSS-as-data)
- 7.3 su-runtime (reactive atoms, hiccup→DOM, CSS)
- 7.4 Vite plugin (su-specific config + HMR)

Estimated: ~800 lines + ~400 lines tests.
