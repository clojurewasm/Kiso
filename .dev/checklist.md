# Kiso Deferred Items

Track blockers and deferred work items. Format: K## (Kiso item number).

## Open

- K01: Syntax-quote expansion (Phase 1.6) — needs namespace context from analyzer.
  Deferred to Phase 5 (mini evaluator) when namespace resolution is available.
- K02: Namespaced maps (#:ns{}, #::alias{}, #::{}) — Phase 1.7.
  Deferred: low priority, not needed for core compiler pipeline.
- K03: Reader edge cases — duplicate key detection in maps/sets, nesting depth limit.
  Deferred: correctness improvement, not blocking.
- K04: Atom tracking hook for su — add optional `_onDeref` callback to atom.
  Needed by su-runtime for dependency tracking. Minimal change to atom.ts.
  Can be done during Batch D or earlier. See design 07-su-framework.md §F1.
- K05: Atom addWatch should return unsubscribe function.
  Needed by su-runtime for dynamic effect cleanup. Backward-compatible.
  See design 07-su-framework.md §F2.
- K06: Verify keyword edge cases for CSS selectors (`:&:hover`, `:.class`).
  defstyle uses keywords as CSS selectors. Verify keyword name preserves
  ampersands, colons, dots. See design 07-su-framework.md §F6.
- K07: interop.ts (clj->js, js->clj) priority for su DOM attribute conversion.
  su-runtime needs map→object conversion. Already in Batch D (item 17).
  See design 07-su-framework.md §F7.

## Resolved

(none yet)
