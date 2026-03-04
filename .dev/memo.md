# Kiso Development Memo

Session handover document. Read at session start.

## Current State

- **Monorepo**: npm workspaces with `packages/kiso` (@clojurewasm/kiso) and `packages/su` (@clojurewasm/su).
- **All 23 phases complete** + Phase 24 (Release Polish) in progress.
- Total: 1405 vitest + 14 Playwright E2E, types clean.
- Var coverage: 330/330 (100%).
- Build: kiso ~134KB, su ~17KB. npm pack dry-run verified.
- Docstring support: `def` 4-arg form, `defn`/`defc`/`defstyle` docstring tolerance, JSDoc output.
- Style architecture D11: defstyle is def-based, defc uses explicit `:style`, `global-style!` for document-level.

## Current Task

Phase 24: Release Polish — Quality audit remaining.

### Completed (Phase 24)
- 24.1 Codegen audit script (`.dev/scripts/compile-samples.mjs`)
- 24.2 Codegen readability: nsRef, autoImports, empty?/concat runtime, CSS multi-line, JSDoc for defc
- 24.3 WC class emit evaluation: NOT feasible (kept defineComponent API)
- 24.4 CI: E2E job, build step added
- 24.5 Bundle size: documented in README
- 24.6 Documentation/examples: updated all to D11 spec (`:style` binding, Garden DSL, `:on-click`)
  - task-manager: 6 defstyle renamed to `-styles`, `:style` added to all 6 defc
  - multi-ns-app: string CSS → Garden DSL, onclick → :on-click, `:style` added to all 4 defc
  - README, getting-started, counter cookbook, todo-app cookbook, styling guide, API reference, codegen-hooks: all updated
  - Removed all "auto-linking" references, added `global-style!` docs

### Remaining
- 24.7 Quality audit and fixes

## Task Queue

1. ~~Docstring support~~ DONE
2. ~~`.gitignore` commit~~ DONE
3. ~~README (API reference, Getting Started)~~ DONE
4. npm publish

## Key Design References

- Roadmap: `.dev/roadmap.md` (phases 1-24)
- Decisions: `.dev/decisions.md` (D1-D11)
