# Kiso Development Memo

Session handover document. Read at session start.

## Current State

- Reader complete: form, tokenizer, reader.
- Macros complete: 20 core macros.
- Analyzer + Codegen complete: special forms, scope, interop, loop/recur, try/catch.
- Runtime complete: hash, equiv, keyword, symbol, list, vector, hash-map, hash-set, atom, seq, core.
- Total: 487 tests passing, types clean.

## Design Gap Analysis

Critical divergence from `.dev/design/`: codegen emits plain JS instead of runtime calls.

| Item | Design says | Current state | Priority |
|------|-----------|---------------|----------|
| Collection literals | `vector()`, `hashMap()`, `hashSet()` | `[]`, `new Map()`, `new Set()` | **P0** |
| Keywords | `keyword("foo")` | `":foo"` (string) | **P0** |
| NS → ES6 modules | `import/export` from `:require` | `/* ns: name */` comment | **P0** |
| Destructuring | sequential + associative | Not implemented | P1 |
| Protocol system | Symbol-based dispatch | instanceof checks | P1 |
| LazySeq | Lazy evaluation | Eager only | P2 |
| Seq over map/set | iteration | Not implemented | P2 |
| Source Map V3 | VLQ encoding | Not implemented | P2 |
| interop.ts | clj->js, js->clj | Not implemented | P2 |
| Missing special forms | var, ., letfn*, case* | Not in SPECIAL_FORMS | P1 |
| Remaining ~20 macros | for, doseq, dotimes, etc. | Not implemented | P1 |
| catch type discrimination | instanceof chain | First catch only | P2 |

## Current Task

### P0: Connect codegen to runtime

Emitter must generate calls to runtime constructors instead of plain JS:

1. **Vector**: `[1, 2, 3]` → `$kiso.vector(1, 2, 3)`
2. **Map**: `{:a 1}` → `$kiso.hashMap($kiso.keyword("a"), 1)`
3. **Set**: `#{1 2}` → `$kiso.hashSet(1, 2)`
4. **Keyword**: `:foo` → `$kiso.keyword("foo")`, `:ns/foo` → `$kiso.keyword("foo", "ns")`
5. **Empty list**: `()` → `$kiso.EMPTY_LIST`

Approach: emitter imports runtime via a configurable prefix (default `$kiso`).
E2E tests verify that compiled output evaluates correctly with runtime loaded.

Then: NS → ES6 modules (`:require` parsing + import/export emission).

## Previous Task

Core functions: arithmetic, comparison, predicates, collections, HOFs. DONE.

## Task Queue

1. ~~Hash + Equiv~~ DONE
2. ~~Keyword + Symbol~~ DONE
3. ~~PersistentList~~ DONE
4. ~~PersistentVector (32-way trie)~~ DONE
5. ~~PersistentHashMap (HAMT)~~ DONE
6. ~~PersistentHashSet~~ DONE
7. ~~Atom~~ DONE
8. ~~loop/recur codegen~~ DONE
9. ~~try/catch codegen~~ DONE
10. ~~Seq abstraction~~ DONE
11. ~~Core functions~~ DONE
12. Connect codegen → runtime (P0)
13. NS → ES6 modules (P0)
14. Destructuring (P1)
15. Missing special forms: letfn*, case*, var, dot (P1)
16. Remaining macros: for, doseq, dotimes, etc. (P1)
17. Protocol system (P1)
18. LazySeq, seq over map/set (P2)

## References

- Design: `.dev/design/` (01-architecture through 05-runtime-distribution)
- CW source: `~/Documents/MyProducts/ClojureWasm/src/` (Zig algorithm reference)
