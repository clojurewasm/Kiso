# Kiso Development Memo

Session handover document. Read at session start.

## Current State

- **Monorepo**: npm workspaces with `packages/kiso` (@clojurewasm/kiso) and `packages/su` (@clojurewasm/su).
- Phases 1-11 complete (reader, macros, analyzer, codegen, runtime, evaluator, vite, su, CLI, state mgmt).
- Vite plugin: .cljs transform + HMR + cross-file resolveId (`.js` → `.cljs`).
- Examples: `examples/task-manager/` (single-file) + `examples/multi-ns-app/` (multi-file, nested dirs).
- Total: 1149 vitest + 12 Playwright E2E, types clean.
- CI: `.github/workflows/ci.yml` (Node 20/22, typecheck + test).
- Var coverage: `.dev/status/vars.yaml` — 169 done / 337 tracked (~50%).
- **Checklist: K01-K12 resolved. K13-K14 open** (nested destructuring, :or nil semantics).

## Current Task

**Phase 16: JS Interop Layer** — bean, js-obj, library ergonomics.

See roadmap Phase 16 items.

## Task Queue

Phases 12-16 in roadmap. Work in phase order.

1. ~~Phase 12: CI + Multi-File~~ DONE
2. ~~Phase 13: Conformance Tests~~ DONE (137 tests, 3 bug fixes)
3. ~~Phase 14: Standard Library~~ DONE (clojure.string 20 fns, for/doseq macros, defmulti/defmethod, equiv extended)
4. ~~Phase 15: Browser E2E~~ DONE (12 Playwright tests: task-manager 9, multi-ns-app 3)
5. **Phase 16: JS Interop Layer** — bean, js-obj, library ergonomics

## Key Design References

- Quality & Ecosystem (Q1-Q7): `.dev/design/08-quality-and-ecosystem.md`
- Var coverage: `.dev/status/vars.yaml`
- Roadmap phases 12-16: `.dev/roadmap.md`
- Protocol + LazySeq: `.dev/design/06-protocol-lazyseq.md`
- su Framework: `.dev/design/07-su-framework.md`
- Decisions: `.dev/decisions.md` (D1-D10)
