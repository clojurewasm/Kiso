# Kiso Development Memo

Session handover document. Read at session start.

## Current State

- Reader complete: form, tokenizer, reader.
- Macros: ~22 core macros implemented.
- Analyzer + Codegen: 16 special forms, scope, interop, loop/recur, try/catch, letfn, dot, destructuring.
- Runtime: hash, equiv, keyword, symbol, list, vector, hash-map, hash-set, atom, seq, core.
- Codegen emits runtime calls: vector(), hashMap(), hashSet(), keyword(), EMPTY_LIST.
- NS → ES6 modules: `:require` parsing + import/export emission.
- Total: 799 tests passing, types clean.

## Current Task

**Batch B, Item 11: defrecord*** — DONE

- defrecord* special form → ES6 class with __kiso_type property
- Generates ->Name factory + map->Name factory (keyword lookup)
- Protocol methods same as deftype*
- defrecord macro → delegates to defrecord*
- 6 tests, 799 total

**All task queue items complete.** Batches A-G fully done.

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
29. ~~su-runtime: reactive.ts (track, effect, computed)~~ DONE
30. ~~su-runtime: component.ts (defineComponent, Custom Element, Shadow DOM)~~ DONE
31. ~~su-runtime: hiccup.ts (renderHiccup, bind)~~ DONE
32. ~~su-runtime: css.ts (createSheet, adoptedStyleSheets) + lifecycle.ts~~ DONE
33. ~~defc macro (su/core.cljs → Custom Element)~~ DONE
34. ~~defstyle macro (su/core.cljs → adoptedStyleSheets)~~ DONE
35. ~~su vite-plugin.ts (HMR: render fn replacement)~~ DONE
36. ~~Dogfooding: todo-app~~ DONE

Note: CE tag name validation + hiccup ns-keyword resolution (K08)
is a Batch G concern — addressed in 07-su-framework.md §F8.

## Key Design References

- Protocol + LazySeq: `.dev/design/06-protocol-lazyseq.md`
- Mini Evaluator: `.dev/design/03-macros.md` (L150-334)
- su Framework: `.dev/design/07-su-framework.md`
- Scope decision: `.dev/decisions.md` D6
- Protocol dispatch decision: `.dev/decisions.md` D7
- su architecture decision: `.dev/decisions.md` D8
