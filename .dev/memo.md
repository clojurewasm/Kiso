# Kiso Development Memo

Session handover document. Read at session start.

## Current State

- **Monorepo**: npm workspaces with `packages/kiso` (@clojurewasm/kiso) and `packages/su` (@clojurewasm/su).
- **All 23 phases complete** (reader → codegen → runtime → su → CLI → CI → conformance → stdlib → E2E → interop → var coverage → sorted collections → def mutability → transient → metadata → benchmarks → publish prep).
- Vite plugin: .cljs transform + HMR + cross-file resolveId (`.js` → `.cljs`).
- Examples: `examples/task-manager/` (single-file) + `examples/multi-ns-app/` (multi-file, nested dirs).
- Total: 1388 vitest + 14 Playwright E2E, types clean.
- CI: `.github/workflows/ci.yml` (Node 20/22, typecheck + test).
- Var coverage: `.dev/status/vars.yaml` — 330 done / 330 tracked (100%).
- Build: kiso 136KB, su 16KB. npm pack dry-run verified.
- **Checklist: K01-K14 all resolved.**

## Current Task

**Roadmap complete.** All phases 1-23 done. Ready for npm publish or further feature work.

## Next Steps (Beyond Roadmap)

- npm publish (`npm publish --access public`)
- README documentation (API reference, getting started guide)
- More example apps (real-world patterns)
- cljs.spec (optional)
- core.async (optional)
- Metadata auto-propagation through map/filter/reduce

## Key Design References

- Quality & Ecosystem (Q1-Q7): `.dev/design/08-quality-and-ecosystem.md`
- Var coverage: `.dev/status/vars.yaml`
- Roadmap: `.dev/roadmap.md` (phases 1-23, all DONE)
- Protocol + LazySeq: `.dev/design/06-protocol-lazyseq.md`
- su Framework: `.dev/design/07-su-framework.md`
- Decisions: `.dev/decisions.md` (D1-D10)
