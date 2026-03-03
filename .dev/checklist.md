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
- K08: CE tag name validation + hiccup ns-keyword resolution for su.
  defc name must contain a hyphen (compile error otherwise).
  Hiccup ns-qualified keywords (::name, :ns/name) resolve to CE tag names
  via component registry. Bare keywords = native HTML.
  See design 07-su-framework.md §F8.
- K09: Shadow DOM form participation — ElementInternals API for form-associated
  custom elements. defc {:form-associated true} must wire up setFormValue().
  Baseline 2023. See design 07-su-framework.md §C1.
- K10: Shadow DOM theming — CSS custom properties (--var) convention for themeable
  components. ::part() for selective external styling.
  See design 07-su-framework.md §C2.
- K11: Shadow DOM accessibility — delegatesFocus, ARIA across shadow boundaries,
  semantic structure via slots. Requires screen reader testing in dogfooding.
  See design 07-su-framework.md §C3.

## Resolved

- K04: DONE — Atom._globalOnDeref + _onDeref hook added (Item 20)
- K05: DONE — addWatch returns unsubscribe fn (Item 21)
- K06: DONE — keyword edge cases verified for CSS selectors (Item 22)
- K07: DONE — interop.ts clj->js, js->clj implemented (Item 17)
- K08: DONE — CE tag name validation in defc macro, hiccup ns-keyword partial (Item 33)
