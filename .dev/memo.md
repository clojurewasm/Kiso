# Kiso Development Memo

Session handover document. Read at session start.

## Current State

- Reader complete: form, tokenizer, reader. 177 tests.
- Macros complete: 20 core macros. 38 tests.
- Analyzer + Codegen complete: special forms, scope, interop, emitter. 32 E2E tests.
- Runtime Phase 4 progress: hash, equiv, keyword, symbol, list, vector, hash-map, hash-set.
- Total: 420 tests passing, types clean.

## Current Task

Phase 4 Runtime — core data structures done (4.1-4.6).
Next: Phase 4.8 Atom, then consider Phase 5 (Mini Evaluator) or continue runtime.

## Previous Task

Phase 4.6: PersistentHashSet. DONE.

## Task Queue

1. ~~Hash + Equiv~~ DONE
2. ~~Keyword + Symbol~~ DONE
3. ~~PersistentList~~ DONE
4. ~~PersistentVector (32-way trie)~~ DONE
5. ~~PersistentHashMap (HAMT)~~ DONE
6. ~~PersistentHashSet~~ DONE
7. Atom (mutable reference)
8. Seq abstraction (ISeq, LazySeq)
9. Protocol system (Symbol-based dispatch)
10. Transient collections

## References

- Design: `.dev/design/` (01-architecture through 05-runtime-distribution)
- CW source: `~/Documents/MyProducts/ClojureWasm/src/` (Zig algorithm reference)
