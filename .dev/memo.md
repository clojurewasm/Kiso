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

**Batch A, Item 1: Special form `case*` + `case` macro**

case macro expands to case* special form. Needs:
- `case` macro in macros.ts (Form→Form transform: input + pairs + default)
- `case*` special form in analyzer (CaseNode with test constants + exprs)
- `case*` codegen in emitter (switch statement or if-else chain)
- Reference: CW `macro_transforms.zig` (case), `analyzer.zig` (analyzeCaseStar)
- Reference: CLJS upstream `cljs/core.cljc` (case macro expansion)
- Design: `.dev/design/04-analyzer-codegen.md` for special form patterns

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

### Batch D: Remaining runtime + su prep
16. ArrayMap (<=8 entries, auto-promote to HAMT)
17. interop.ts (clj->js, js->clj) — also needed for su DOM attributes (K07)
18. catch type discrimination (instanceof chain)
19. Source Map V3 (VLQ encoding) — independent, any time
20. Atom tracking hook — add `_onDeref` to atom.ts (K04, su F1)
21. Atom addWatch return unsubscribe fn (K05, su F2)
22. Verify keyword edge cases for CSS selectors (K06, su F6)

### Batch E: Mini Evaluator [depends on: Batch A mostly done]
23. Evaluator core (def, fn*, let*, do, if, quote, loop*, recur)
24. Built-in functions (~30: cons, concat, seq, symbol, gensym, etc.)
25. Macro expander pipeline (core macros + user defmacro)

### Batch F: Vite Integration [depends on: Batch E + Source Map]
26. Public API (compile, compileFile, read, analyze, generate)
27. Vite transform plugin
28. HMR (hot module replacement for .cljs)

### Batch G: su Framework [depends on: Batch E + F] [design: 07-su-framework.md]
29. su-runtime: reactive.ts (track, effect, computed)
30. su-runtime: component.ts (defineComponent, Custom Element, Shadow DOM)
31. su-runtime: hiccup.ts (renderHiccup, bind)
32. su-runtime: css.ts (createSheet, adoptedStyleSheets) + lifecycle.ts
33. defc macro (su/core.cljs → Custom Element)
34. defstyle macro (su/core.cljs → adoptedStyleSheets)
35. su vite-plugin.ts (HMR: render fn replacement)
36. Dogfooding: todo-app

Note: CE tag name validation + hiccup ns-keyword resolution (K08)
is a Batch G concern — addressed in 07-su-framework.md §F8.

## Key Design References

- Protocol + LazySeq: `.dev/design/06-protocol-lazyseq.md`
- Mini Evaluator: `.dev/design/03-macros.md` (L150-334)
- su Framework: `.dev/design/07-su-framework.md`
- Scope decision: `.dev/decisions.md` D6
- Protocol dispatch decision: `.dev/decisions.md` D7
- su architecture decision: `.dev/decisions.md` D8
