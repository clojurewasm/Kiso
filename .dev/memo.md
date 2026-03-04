# Kiso Development Memo

Session handover document. Read at session start.

## Current State

- **Monorepo**: npm workspaces with `packages/kiso` (@clojurewasm/kiso) and `packages/su` (@clojurewasm/su).
- **All 23 phases complete** + Phase 24 (Release Polish) complete.
- Total: 1435 vitest + 14 Playwright E2E, types clean.
- Var coverage: 330/330 (100%).
- Build: kiso ~141KB (npm tarball), su ~17KB. npm publish dry-run verified clean.
- Showcase site: `showcase/` — interactive CLJS demo for GitHub Pages.
- Docs: reorganized with numbered guide (001-011), `api/README.md`, `advanced/`.

## Current Task

All Phase 24 tasks complete. Ready for npm publish.

### Completed (Phase 24)
- 24.1-24.7: Codegen audit, readability, CI, bundle size, docs, quality audit
- 24.8: Interactive showcase site (`showcase/`)
- 24.9: Runtime/codegen bug fixes from showcase dogfooding (nth, ^:private, etc.)
- 24.10: Unified CompileError with phase/location context
- 24.11: Docs reorganization (numbered guide, API ref, slim README)
- 24.12: npm publish dry-run verification (both packages clean)

## Task Queue

1. npm publish (requires npm login to @clojurewasm org)
2. GitHub Pages deploy (CI workflow in showcase)

## Key Design References

- Roadmap: `.dev/roadmap.md` (phases 1-24)
- Decisions: `.dev/decisions.md` (D1-D11)
