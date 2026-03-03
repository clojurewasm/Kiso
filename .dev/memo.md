# Kiso Development Memo

Session handover document. Read at session start.

## Current State

- Reader complete (form, tokenizer, reader). 177 tests passing, types clean.
- Design docs complete: `.dev/design/01` through `05`.

## Current Task

Phase 2: Analyzer — Core macros + mini evaluator.
Read `.dev/design/03-macros.md` and CW `src/engine/analyzer/macro_transforms.zig`.

## Previous Task

Phase 1.4: Reader — `src/reader/reader.ts` + tests. DONE.

## Task Queue

1. ~~Form data model (form.ts + tests)~~ DONE
2. ~~Tokenizer (tokenizer.ts + tests)~~ DONE
3. ~~Reader (reader.ts + tests)~~ DONE
4. Core macros (macros.ts + tests)
5. Analyzer (analyzer.ts + tests)
6. Codegen (emitter.ts + tests)
7. E2E pipeline (compile .cljs → run .js)

## References

- Design: `.dev/design/` (01-architecture through 05-runtime-distribution)
- CW source: `~/Documents/MyProducts/ClojureWasm/src/` (Zig algorithm reference)
