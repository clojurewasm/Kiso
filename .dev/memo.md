# Kiso Development Memo

Session handover document. Read at session start.

## Current State

- **Monorepo**: npm workspaces with `packages/kiso` (@clojurewasm/kiso) and `packages/su` (@clojurewasm/su).
- Phases 1-11 complete (reader, macros, analyzer, codegen, runtime, evaluator, vite, su, CLI, state mgmt).
- Vite plugin: .cljs transform + HMR + cross-file resolveId (`.js` → `.cljs`).
- Examples: `examples/task-manager/` (single-file) + `examples/multi-ns-app/` (multi-file, nested dirs).
- Total: 940 tests passing (848 kiso + 92 su), types clean.
- CI: `.github/workflows/ci.yml` (Node 20/22, typecheck + test).
- Var coverage: `.dev/status/vars.yaml` — 144 done / 298 tracked in cljs.core (~48%).
- **All checklist items (K01-K12) resolved.**

## Current Task

**Phase 13: Conformance Tests** — next up, not started.

See roadmap Phase 13 items and `.dev/design/08-quality-and-ecosystem.md` Q4 for details.

## Task Queue

Phases 12-16 in roadmap. Work in phase order.

1. ~~Phase 12: CI + Multi-File~~ DONE (CI, multi-ns-app, nsToPath fix, resolveId hook)
2. **Phase 13: Conformance Tests** — language spec edge cases
3. Phase 14: Standard Library — clojure.string, for/doseq, defmulti, var tracking
4. Phase 15: Browser E2E — Playwright (free, Apache 2.0)
5. Phase 16: JS Interop Layer — bean, js-obj, library ergonomics

## Key Design References

- Quality & Ecosystem (Q1-Q7): `.dev/design/08-quality-and-ecosystem.md`
- Var coverage: `.dev/status/vars.yaml`
- Roadmap phases 12-16: `.dev/roadmap.md`
- Protocol + LazySeq: `.dev/design/06-protocol-lazyseq.md`
- su Framework: `.dev/design/07-su-framework.md`
- Decisions: `.dev/decisions.md` (D1-D10)
