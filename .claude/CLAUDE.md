# Kiso

ClojureScript-to-JavaScript compiler in TypeScript. Zero dependencies.
Design: `.dev/design/`. Memo: `.dev/memo.md`. Roadmap: `.dev/roadmap.md`.

## Language Policy

- **All code in English**: identifiers, comments, docstrings, commit messages, markdown

## TDD

1. **Red**: Write exactly one failing test first
2. **Green**: Write minimum code to pass
3. **Refactor**: Improve code while keeping tests green

- Never write production code before a test (1 test → 1 impl → verify cycle)
- Progress: "Fake It" → "Triangulate" → "Obvious Implementation"
- Test runner: vitest

## Implementation Quality

- **Root-cause fixes only.** Never patch symptoms.
- **Understand before changing.** Read the full call chain before modifying.
- **Minimal, correct diffs.** Change only what's needed.
- **No over-engineering.** Only add what's directly needed for the current task.

## Critical Rules

- **One task = one commit**. Never batch multiple tasks.
- **Architectural decisions** → `.dev/decisions.md` (D## entry).
- **Update `.dev/checklist.md`** when deferred items are resolved or added.

## Autonomous Workflow

**Default mode: Continuous autonomous execution.**

### Loop: Orient → Plan → Execute → Commit → Repeat

**1. Orient** (every iteration / session start)

```bash
git log --oneline -3 && git status --short
```

Read `.dev/memo.md` → `## Current Task`:
- **Has design details** → Execute
- **Title only or empty** → Plan (check roadmap)

**2. Plan** — Write design in `## Current Task`. Check roadmap for context.

**3. Execute**

- TDD cycle: Red → Green → Refactor
- Run tests: `npm test`
- CW knowledge reference: `~/Documents/MyProducts/ClojureWasm/` (Reader, Analyzer, HAMT, etc.)

**4. Complete** — Run Commit Gate → update memo.md → commit → loop back immediately.

### When to Stop

Stop **only** when: user requests, ambiguous requirements, or current phase done.
Do NOT stop for: empty queue, large context, "good stopping points".
When in doubt, **continue**.

### Commit Gate Checklist

1. **Tests**: `npm test` — all pass
2. **Type check**: `npx tsc --noEmit` — no errors
3. **decisions.md / checklist.md / memo.md**: Update as needed

## Build & Test

```bash
npm test                    # Run all tests (vitest)
npm run build               # Build (tsc)
npx tsc --noEmit            # Type check only
```

## Project Structure

```
src/
├── reader/          Clojure Reader (tokenizer, reader, form)
├── analyzer/        Analysis + macro expansion
├── codegen/         JS code generation + source map
├── runtime/         Persistent data structures (tree-shakeable)
└── api/             Public API (compiler, vite plugin)
test/
├── reader/
├── analyzer/
├── codegen/
├── runtime/
└── e2e/             .cljs → .js → execution
```

## CW Reference Rule (MANDATORY)

**Always consult ClojureWasm source before implementing.** CW already solved most
Clojure implementation problems in Zig. Read the corresponding CW code first to
understand the algorithm, edge cases, and design decisions — then port the knowledge
to TypeScript. This avoids reinventing wheels and missing subtle corner cases.

CW repo: `~/Documents/MyProducts/ClojureWasm/`

| Kiso module      | CW reference file                      | What to learn                  |
|------------------|----------------------------------------|--------------------------------|
| reader/tokenizer | `src/engine/reader/tokenizer.zig`      | Token kinds, number/string boundaries, `~@`/`#?@` as single tokens |
| reader/reader    | `src/engine/reader/reader.zig`         | Reader macros, syntax-quote, namespaced maps, edge cases |
| reader/form      | `src/engine/reader/form.zig`           | Form data model, NaN-boxing rationale |
| analyzer/macros  | `src/engine/analyzer/macro_transforms.zig` | ~40 core macro Form→Form transforms |
| analyzer/eval    | `src/engine/evaluator/tree_walk.zig`   | Mini evaluator design, env chain, apply |
| analyzer/analyzer| `src/engine/analyzer/analyzer.zig`     | Special form dispatch, scope, interop rewrite, destructuring |
| codegen/emitter  | `src/engine/compiler/compiler.zig`     | Truthiness, recur→loop, multi-arity |
| runtime/vector   | `src/runtime/collections.zig`          | 32-way trie, tail optimization, path copy |
| runtime/hash-map | `src/runtime/collections.zig` + `hash.zig` | HAMT bitmap+popcount, collision nodes |
| runtime/hash     | `src/runtime/hash.zig`                 | Murmur3, mixCollHash, ordered/unordered |
| runtime/equiv    | `src/runtime/value.zig`                | Structural equality, sequential cross-type |

**Workflow**: Before writing any new module:
1. Read the design doc: `.dev/design/0N-*.md`
2. Read the corresponding CW source (table above)
3. Understand the algorithm and edge cases
4. Write tests based on CW's test cases
5. Implement in TypeScript

## ClojureScript Upstream Reference

CLJS upstream: `~/Documents/OSS/ClojureScript/`

**Use as a semantic reference**, not for direct porting. Kiso's goals differ from
upstream CLJS (clean ES6 output, no Google Closure, zero goog.* dependency,
Symbol-based protocols instead of name-mangled methods). Extract **expected behavior
and edge cases** from upstream tests, then re-express them as vitest assertions
that verify Kiso's own output and semantics.

| Kiso area   | CLJS upstream test                          | How to use                    |
|-------------|---------------------------------------------|-------------------------------|
| Runtime     | `src/test/cljs/cljs/collections_test.cljs`  | Expected values for vector/map/set operations |
| Runtime     | `src/test/cljs/cljs/hashing_test.cljs`      | Hash correctness, collision cases |
| Runtime     | `src/test/cljs/cljs/core_test.cljs`         | Core function behavior (~2000 lines of edge cases) |
| Destructuring | `src/test/cljs/cljs/destructuring_test.cljs` | Sequential & associative patterns |
| Analyzer    | `src/test/clojure/cljs/analyzer_tests.clj`  | Warning cases, special form semantics |
| Codegen     | `src/test/clojure/cljs/compiler_tests.clj`  | Input→output pairs (adapt to ES6 target) |

**Caveats**:
- CLJS compiler tests run on JVM Clojure — API shape doesn't match Kiso
- CLJS runtime tests are `.cljs` files (chicken-and-egg: need a compiler to run them)
- CLJS emits Google Closure-flavored JS; Kiso emits clean ES6 — expected JS output will differ
- Protocol dispatch mechanism differs (CLJS: mangled names, Kiso: Symbols)
- Extract the **what** (expected semantics), not the **how** (CLJS-specific implementation)

## References

| Topic          | Location                      | When to read              |
|----------------|-------------------------------|---------------------------|
| Architecture   | `.dev/design/01-architecture.md` | Pipeline, structure, CW knowledge map |
| Reader design  | `.dev/design/02-reader.md`    | Tokenizer, forms, edge cases |
| Macro system   | `.dev/design/03-macros.md`    | Core macros, mini evaluator, SCI comparison |
| Analyzer/Codegen | `.dev/design/04-analyzer-codegen.md` | Special forms, destructuring, JS emission |
| Runtime/Dist   | `.dev/design/05-runtime-distribution.md` | HAMT, vector, npm package |
| Roadmap        | `.dev/roadmap.md`             | Phase planning            |
| Decisions      | `.dev/decisions.md`           | Architectural decisions   |
| Deferred items | `.dev/checklist.md`           | Blockers to resolve       |
| CW source      | `~/Documents/MyProducts/ClojureWasm/src/` | Algorithm reference (Zig) |
