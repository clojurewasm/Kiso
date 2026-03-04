# Kiso Development Memo

Session handover document. Read at session start.

## Current State

- **Monorepo**: npm workspaces with `packages/kiso` (@clojurewasm/kiso) and `packages/su` (@clojurewasm/su).
- Phases 1-18 complete (reader → macros → analyzer → codegen → runtime → evaluator → vite → su → CLI → state mgmt → CI → conformance → stdlib → E2E → interop → var coverage → sorted collections).
- Vite plugin: .cljs transform + HMR + cross-file resolveId (`.js` → `.cljs`).
- Examples: `examples/task-manager/` (single-file) + `examples/multi-ns-app/` (multi-file, nested dirs).
- Total: 1363 vitest + 14 Playwright E2E, types clean.
- CI: `.github/workflows/ci.yml` (Node 20/22, typecheck + test).
- Var coverage: `.dev/status/vars.yaml` — 330 done / 330 tracked (100%).
- **Checklist: K01-K14 all resolved.**

## Current Task

**Phase 19: def Mutability + Full Dynamic Vars.** Emit `let` instead of `const` for `def`, implement `alter-var-root`, `^:dynamic` metadata, binding with `def`-bound vars.

## Task Queue

Phases 19-23 in roadmap. See `.dev/roadmap.md` for details.

1. Phase 19: def Mutability + Full Dynamic Vars (def→let, alter-var-root, ^:dynamic)
2. Phase 20: Transient Collections (TransientVector/HashMap/HashSet)
3. Phase 21: Metadata Propagation (with-meta/vary-meta on all collections)
4. Phase 22: Performance Benchmarks
5. Phase 23: npm Publish Preparation

## Key Design References

- Quality & Ecosystem (Q1-Q7): `.dev/design/08-quality-and-ecosystem.md`
- Var coverage: `.dev/status/vars.yaml`
- Roadmap: `.dev/roadmap.md` (phases 1-23)
- Protocol + LazySeq: `.dev/design/06-protocol-lazyseq.md`
- su Framework: `.dev/design/07-su-framework.md`
- Decisions: `.dev/decisions.md` (D1-D10)
