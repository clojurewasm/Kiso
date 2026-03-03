# Kiso Deferred Items

Track blockers and deferred work items. Format: K## (Kiso item number).

## Open

- K01: Syntax-quote expansion (Phase 1.6) — needs namespace context from analyzer.
  Deferred to Phase 5 (mini evaluator) when namespace resolution is available.
- K02: Namespaced maps (#:ns{}, #::alias{}, #::{}) — Phase 1.7.
  Deferred: low priority, not needed for core compiler pipeline.
- K03: Reader edge cases — duplicate key detection in maps/sets, nesting depth limit.
  Deferred: correctness improvement, not blocking.

## Resolved

(none yet)
