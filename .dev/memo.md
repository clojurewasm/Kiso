# Kiso Development Memo

Session handover document. Read at session start.

## Current State

- **Monorepo**: npm workspaces with `packages/kiso` (@clojurewasm/kiso) and `packages/su` (@clojurewasm/su).
- Phases 1-11 complete (reader, macros, analyzer, codegen, runtime, evaluator, vite, su, CLI, state mgmt).
- Vite plugin: .cljs transform + HMR + cross-file resolveId (`.js` → `.cljs`).
- Examples: `examples/task-manager/` (single-file) + `examples/multi-ns-app/` (multi-file, nested dirs).
- Total: 1308 vitest + 14 Playwright E2E, types clean.
- CI: `.github/workflows/ci.yml` (Node 20/22, typecheck + test).
- Var coverage: `.dev/status/vars.yaml` — 300 done / 338 tracked (~89%).
- **Checklist: K01-K14 all resolved.**

## Current Task

**Expanding var coverage.** Implementing remaining cljs.core vars, cljs.set, cljs.walk namespaces.

## Task Queue

Phases 12-16 in roadmap. All complete. Now expanding var coverage.

1. ~~Core batch 1~~ DONE (46 fns: map ops, seq, numeric, predicates, higher-order)
2. ~~Core batch 2~~ DONE (27 fns: collection ops, seq, regex, misc)
3. ~~Core batch 3~~ DONE (25 fns: navigation, generators, empty/set, predicates, interop)
4. cljs.set namespace (11 fns: union, intersection, difference, etc.)
5. cljs.walk namespace (7 fns: walk, prewalk, postwalk, etc.)
6. Remaining core: while macro, binding/with-redefs, prn/pr, hash, type, instance?

## Next Steps

- Continue with cljs.set namespace (11 functions)
- Then cljs.walk namespace (7 functions)
- Then remaining misc core vars

## Key Design References

- Quality & Ecosystem (Q1-Q7): `.dev/design/08-quality-and-ecosystem.md`
- Var coverage: `.dev/status/vars.yaml`
- Roadmap phases 12-16: `.dev/roadmap.md`
- Protocol + LazySeq: `.dev/design/06-protocol-lazyseq.md`
- su Framework: `.dev/design/07-su-framework.md`
- Decisions: `.dev/decisions.md` (D1-D10)
