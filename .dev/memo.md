# Kiso Development Memo

Session handover document. Read at session start.

## Current State

- Reader complete: form, tokenizer, reader.
- Macros: ~22 core macros implemented.
- Analyzer + Codegen: 16 special forms, scope, interop, loop/recur, try/catch, letfn, dot, destructuring.
- Runtime: hash, equiv, keyword, symbol, list, vector, hash-map, hash-set, atom, seq, core.
- Codegen emits runtime calls: vector(), hashMap(), hashSet(), keyword(), EMPTY_LIST.
- NS → ES6 modules: `:require` parsing + import/export emission.
- Total: 516 tests passing, types clean.

## Current Task

Work through Task Queue top-down. Mark DONE after commit.

## Task Queue

Items ordered by priority. Work top-down. Dependencies noted in brackets.

### Batch A: Independent small items (no dependencies)
1. Special form: case* + case macro
2. Special form: var
3. Macros: condp, cond->, cond->>
4. Macros: when-first, when-some, if-some
5. Macros: .., declare, assert, time
6. Macros: for, doseq, dotimes (complex — :let/:when/:while modifiers)

### Batch B: Protocol system [design: 06-protocol-lazyseq.md]
7. runtime/protocols.ts (defprotocol, protocolFn)
8. defprotocol macro (→ def + runtime calls)
9. deftype* special form + codegen (→ ES6 class)
10. extend-type macro (→ prototype mutation)
11. defrecord* special form + codegen (→ deftype + map extras)
12. reify (→ object literal with Symbol methods)
13. Retrofit ISeq/ICounted on existing types (Vector, List, etc.)

### Batch C: LazySeq [depends on: Batch B]
14. LazySeq runtime class
15. lazy-seq macro (+ delay macro)

### Batch D: Remaining runtime
16. ArrayMap (<=8 entries, auto-promote to HAMT)
17. interop.ts (clj->js, js->clj)
18. catch type discrimination (instanceof chain)
19. Source Map V3 (VLQ encoding) — independent, any time

### Batch E: Mini Evaluator [depends on: Batch A mostly done]
20. Evaluator core (def, fn*, let*, do, if, quote, loop*, recur)
21. Built-in functions (~30: cons, concat, seq, symbol, gensym, etc.)
22. Macro expander pipeline (core macros + user defmacro)

### Batch F: Vite Integration [depends on: Batch E + Source Map]
23. Public API (compile, compileFile, read, analyze, generate)
24. Vite transform plugin
25. HMR (hot module replacement for .cljs)

### su Prep: @kiso/cljs feedback items [can do during Batch D]
S1. Atom tracking hook — add `_onDeref` to atom.ts (K04)
S2. Atom addWatch return unsubscribe fn (K05)
S3. Verify keyword edge cases for CSS selectors (K06)

### Batch G: su Framework [depends on: Batch E + F] [design: 07-su-framework.md]
26. su-runtime: reactive.ts (track, effect, computed)
27. su-runtime: component.ts (defineComponent, Custom Element, Shadow DOM)
28. su-runtime: hiccup.ts (renderHiccup, bind)
29. su-runtime: css.ts (createSheet, adoptedStyleSheets) + lifecycle.ts
30. defc macro (su/core.cljs → Custom Element)
31. defstyle macro (su/core.cljs → adoptedStyleSheets)
32. su vite-plugin.ts (HMR: render fn replacement)
33. Dogfooding: todo-app

## Key Design References

- Protocol + LazySeq: `.dev/design/06-protocol-lazyseq.md`
- Mini Evaluator: `.dev/design/03-macros.md` (L150-334)
- su Framework: `.dev/design/07-su-framework.md`
- Scope decision: `.dev/decisions.md` D6
- Protocol dispatch decision: `.dev/decisions.md` D7
- su architecture decision: `.dev/decisions.md` D8
