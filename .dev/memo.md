# Kiso Development Memo

Session handover document. Read at session start.

## Current State

- **Monorepo**: npm workspaces with `packages/cljs` (@kiso/cljs) and `packages/su` (@kiso/su).
- Reader complete: form, tokenizer, reader, syntax-quote, namespaced maps, nesting depth limit.
- Macros: ~24 core macros (incl. syntax-quote, defc, defstyle).
- Analyzer + Codegen: 16 special forms, ns-alias resolution, runtime auto-imports.
- Runtime: full data structures + atom (deref/reset!/swap! standalone fns) + barrel export.
- @kiso/su: reactive, component (formAssociated, delegatesFocus), hiccup, css, lifecycle, hmr.
- Vite plugin: .cljs transform + HMR + alias resolution.
- Demo: examples/hello-counter (working counter app in browser).
- Total: 834 tests passing (781 cljs + 53 su), types clean.
- **All checklist items (K01-K11) resolved.**

## Current Task

**All task queue items and checklist items complete.** Batches A-H fully done.
Monorepo restructuring complete (packages/cljs + packages/su).

## Task Queue

Items ordered by priority. Work top-down. Dependencies noted in brackets.

### Batch A: Independent small items (no dependencies)
1. ~~Special form: case* + case macro~~ DONE
2. ~~Special form: var~~ DONE
3. ~~Macros: condp, cond->, cond->>~~ DONE
4. ~~Macros: when-first, when-some, if-some~~ DONE
5. ~~Macros: .., declare, assert, time~~ DONE
6. ~~Macros: dotimes~~ DONE (doseq/for deferred — need seq/first/next)

### Batch B: Protocol system [design: 06-protocol-lazyseq.md]
7. ~~runtime/protocols.ts (defprotocol, protocolFn)~~ DONE
8. ~~defprotocol macro (→ def + runtime calls)~~ DONE
9. ~~deftype* special form + codegen (→ ES6 class)~~ DONE
10. ~~extend-type macro (→ prototype mutation)~~ DONE
11. ~~defrecord* special form + codegen (→ deftype + map extras)~~ DONE
12. ~~reify (→ object literal with Symbol methods)~~ DONE
13. ~~Retrofit ISeq/ICounted on existing types~~ DONE

### Batch C: LazySeq [depends on: Batch B]
14. ~~LazySeq runtime class~~ DONE
15. ~~lazy-seq macro~~ DONE

### Batch D: Remaining runtime + su prep
16. ~~ArrayMap (<=8 entries, auto-promote to HAMT)~~ DONE
17. ~~interop.ts (clj->js, js->clj)~~ DONE
18. ~~catch type discrimination (instanceof chain)~~ DONE
19. ~~Source Map V3 (VLQ encoding)~~ DONE
20. ~~Atom tracking hook — add `_onDeref` to atom.ts~~ DONE
21. ~~Atom addWatch return unsubscribe fn~~ DONE
22. ~~Verify keyword edge cases for CSS selectors~~ DONE

### Batch E: Mini Evaluator [depends on: Batch A mostly done]
23. ~~Evaluator core (def, fn*, let*, do, if, quote, loop*, recur)~~ DONE
24. ~~Built-in functions (~30: cons, concat, seq, symbol, gensym, etc.)~~ DONE
25. ~~Macro expander pipeline (core macros + user defmacro)~~ DONE

### Batch F: Vite Integration [depends on: Batch E + Source Map]
26. ~~Public API (compile, compileFile, read, analyze, generate)~~ DONE
27. ~~Vite transform plugin~~ DONE
28. ~~HMR (hot module replacement for .cljs)~~ DONE

### Batch G: su Framework [depends on: Batch E + F] [design: 07-su-framework.md]
29. ~~reactive.ts (track, effect, computed)~~ DONE
30. ~~component.ts (defineComponent, Custom Element, Shadow DOM)~~ DONE
31. ~~hiccup.ts (renderHiccup, bind)~~ DONE
32. ~~css.ts (createSheet, adoptedStyleSheets) + lifecycle.ts~~ DONE
33. ~~defc macro (su/core.cljs → Custom Element)~~ DONE
34. ~~defstyle macro (su/core.cljs → adoptedStyleSheets)~~ DONE
35. ~~su vite-plugin.ts (HMR: render fn replacement)~~ DONE
36. ~~Dogfooding: todo-app~~ DONE

### Batch H: Monorepo Restructuring
37. ~~Split into packages/cljs + packages/su~~ DONE
38. ~~npm workspaces + TS project references~~ DONE

## Key Design References

- Protocol + LazySeq: `.dev/design/06-protocol-lazyseq.md`
- Mini Evaluator: `.dev/design/03-macros.md` (L150-334)
- su Framework: `.dev/design/07-su-framework.md`
- Scope decision: `.dev/decisions.md` D6
- Protocol dispatch decision: `.dev/decisions.md` D7
- su architecture decision: `.dev/decisions.md` D8
