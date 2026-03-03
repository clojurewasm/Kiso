# Kiso Development Memo

Session handover document. Read at session start.

## Current State

- Reader complete (form, tokenizer, reader). 177 tests passing, types clean.
- Core macros complete (20 macros). 38 tests passing.
- Analyzer + Codegen complete. 32 E2E tests passing.
- Design docs complete: `.dev/design/01` through `05`.
- Total: 247 tests passing, types clean.

## Current Task

Phase 2/3 done: Analyzer + Codegen core. Next up: decide what to tackle next.
Check roadmap for remaining items in Phase 2 (destructuring) and Phase 3 (source maps, NS→ES6).

## Previous Task

Phase 2.5-3.5: Analyzer (node.ts, analyzer.ts) + Codegen (emitter.ts) + E2E tests. DONE.

## Task Queue

1. ~~Form data model (form.ts + tests)~~ DONE
2. ~~Tokenizer (tokenizer.ts + tests)~~ DONE
3. ~~Reader (reader.ts + tests)~~ DONE
4. ~~Core macros (macros.ts + tests)~~ DONE
5. ~~Analyzer (analyzer.ts + tests)~~ DONE
6. ~~Codegen (emitter.ts + tests)~~ DONE
7. ~~E2E pipeline (compile .cljs → run .js)~~ DONE
8. Destructuring (sequential + associative)
9. NS → ES6 modules (import/export)
10. Source Map V3
11. Runtime (persistent data structures)

## References

- Design: `.dev/design/` (01-architecture through 05-runtime-distribution)
- CW source: `~/Documents/MyProducts/ClojureWasm/src/` (Zig algorithm reference)
