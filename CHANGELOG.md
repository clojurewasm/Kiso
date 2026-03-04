# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.1] - 2026-03-04

### Fixed

- **defc**: `:atom` prop annotation ignored when options map has `:style` but no `:props` key — Props Channeling was broken for `[{:keys [x]} :atom]` syntax with `{:style [...]}` option
- npm package READMEs now included (were missing in 0.1.0)
- CI: E2E tests for examples now install dependencies from npm registry

## [0.1.0] - 2026-03-04

Initial public release.

### @clojurewasm/kiso

- ClojureScript-to-JavaScript compiler with reader, analyzer, and codegen
- 330 ClojureScript vars/functions supported (100% of target coverage)
- Persistent data structures: vector, hash-map, sorted-map, hash-set, sorted-set, list
- Transient collections, lazy sequences, protocols, multimethods
- Vite plugin with HMR and source maps
- CLI: `npx kiso compile src/ --out-dir dist/`
- Unified `CompileError` with phase (read/analyze/codegen) and source location
- Tree-shakeable runtime (~134 KB full, ~20-40 KB typical)

### @clojurewasm/su

- `defc` — define Custom Elements with Shadow DOM
- `defstyle` — scoped CSS with Garden-like DSL
- Fine-grained reactivity: atoms, `effect`, `computed`
- Context API: `provide` / `use-context` (crosses Shadow DOM)
- Props Channeling: pass atoms directly to child components
- Lifecycle: `on-mount`, `on-unmount`
- HMR support via `hot-replace`
- DevTools: `enable-trace` for atom state logging
- ~17 KB package size

[0.1.1]: https://github.com/clojurewasm/Kiso/releases/tag/v0.1.1
[0.1.0]: https://github.com/clojurewasm/Kiso/releases/tag/v0.1.0
