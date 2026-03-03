# Kiso Development Memo

Session handover document. Read at session start.

## Current State

- Reader complete: form, tokenizer, reader.
- Macros complete: 20 core macros.
- Analyzer + Codegen complete: special forms, scope, interop, loop/recur, try/catch.
- Runtime Phase 4 done: hash, equiv, keyword, symbol, list, vector, hash-map, hash-set, atom.
- Total: 437 tests passing, types clean.

## Current Task

Continue autonomous work. Next candidates:
- Seq abstraction (ISeq protocol for list/vector iteration)
- NS → ES6 module compilation (import/export mapping)
- Core functions (cljs.core equivalents: map, filter, reduce, etc.)
- Connect runtime to codegen (emit calls to runtime constructors)

## Previous Task

Codegen improvements: loop/recur with while(true) + temp vars, try/catch. DONE.

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
10. Seq abstraction (ISeq, LazySeq)
11. Core functions (map, filter, reduce, etc.)
12. NS → ES6 modules
13. Protocol system (Symbol-based dispatch)

## References

- Design: `.dev/design/` (01-architecture through 05-runtime-distribution)
- CW source: `~/Documents/MyProducts/ClojureWasm/src/` (Zig algorithm reference)
