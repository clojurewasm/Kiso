# Kiso

ClojureScript-to-JavaScript compiler in TypeScript. Zero dependencies.
Design: `.dev/design/`. Memo: `@./.dev/memo.md`. Roadmap: `@./.dev/roadmap.md`.

## Language Policy

- **All code in English**: identifiers, comments, docstrings, commit messages, markdown

## TDD (t-wada style)

1. **Red**: Write exactly one failing test first
2. **Green**: Write minimum code to pass
3. **Refactor**: Improve code while keeping tests green

- Never write production code before a test (1 test → 1 impl → verify cycle)
- Progress: "Fake It" → "Triangulate" → "Obvious Implementation"
- Test runner: vitest

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

Read `@./.dev/memo.md` → `## Current Task`:
- **Has design details** → Execute
- **Title only or empty** → Plan (check roadmap + design docs)

**2. Plan** — Write design in `## Current Task`. Check roadmap + design docs for context.

**3. Execute**

- TDD cycle: Red → Green → Refactor
- Run tests: `npm test`

**4. Complete** — Run Commit Gate → update memo.md → commit → loop back immediately.

### Task Selection (MANDATORY)

After committing, select next task automatically:
1. Read `## Current Task` in memo.md. If done, pick next from `## Task Queue`.
2. **Priority order**: Items in queue order (top = highest priority). Skip DONE items.
3. **Update memo.md** immediately: move the new task into `## Current Task`.
4. **Never stop to ask** which task is next. Pick the topmost undone item and go.

### No-Workaround Rule

1. **Fix root causes, never work around.** Missing feature? Implement it first.
2. **Design fidelity over expedience.** Never simplify codegen to avoid runtime gaps.
3. **Checklist new blockers.** Add K## entry for missing features discovered mid-task.

### When to Stop

Stop **only** when: user interrupts.
Do NOT stop for: phase boundaries, task boundaries, empty queue, large context, "good stopping points", user not responding, ambiguous next task (just pick the next one in queue).
When in doubt, **continue**. When a phase completes, start the next phase immediately.

### Commit Gate Checklist

0. **TDD**: Test written/updated BEFORE production code
1. **Tests**: `npm test` — all pass
2. **Type check**: `npx tsc --noEmit` — no errors
3. **decisions.md / checklist.md / memo.md**: Update as needed

## Build & Test

```bash
npm test                    # Run all tests (vitest)
npm run build               # Build (tsc)
npx tsc --noEmit            # Type check only
```

## Context Efficiency

- **LSP first, Read second**: Use `xref-find-references`, `imenu-list-symbols`, or
  `xref-find-apropos` to locate the exact line range, then Read that range only.
- **Grep for discovery**: Grep with context (`-C`) is far cheaper than reading a whole file.
- **Read with offset/limit**: For large files, never read the entire file blindly.

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

## References

CW reference: `.claude/references/cw-reference.md` — check before implementing new modules.
CLJS upstream: `.claude/references/cljs-upstream.md` — semantic reference and edge cases.
Design docs: `.dev/design/` (01-architecture through 06-protocol-lazyseq).
Roadmap: `@./.dev/roadmap.md` (phase planning).
Decisions: `.dev/decisions.md` (architectural decisions).
Deferred items: `.dev/checklist.md` (blockers to resolve).
