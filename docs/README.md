# Kiso Documentation

ClojureScript-to-JavaScript compiler + su component framework.

**[Live Showcase](https://clojurewasm.github.io/Kiso/)** — try it in your browser.

## Guide

Step-by-step introduction, from setup to production.

| #   | Chapter                                                    | Topic                                  |
|-----|------------------------------------------------------------|----------------------------------------|
| 001 | [Getting Started](guide/001_getting_started.md)            | Install, configure Vite, first app     |
| 002 | [Components](guide/002_components.md)                      | `defc`, props, naming, nesting, mount  |
| 003 | [Styling](guide/003_styling.md)                            | `defstyle`, Shadow DOM CSS, theming    |
| 004 | [Reactivity](guide/004_reactivity.md)                      | Atoms, effects, computed values        |
| 005 | [Hiccup](guide/005_hiccup.md)                              | Hiccup syntax, attributes, events      |
| 006 | [State Management](guide/006_state_management.md)          | Context API, props channeling          |
| 007 | [Lifecycle](guide/007_lifecycle.md)                         | `on-mount`, `on-unmount`, host access  |
| 008 | [Forms & Accessibility](guide/008_forms.md)                | Shadow DOM form integration            |
| 009 | [DevTools](guide/009_devtools.md)                          | Reactive state tracing, debugging      |
| 010 | [Cookbook](guide/010_cookbook.md)                            | Counter, todo app, common patterns     |
| 011 | [Production Build](guide/011_production.md)                | Vite build, GitHub Pages deploy        |

## API Reference

- [API Reference](api/README.md) — complete reference for su + Kiso compiler API

## Advanced

- [Architecture](advanced/architecture.md) — internals for contributors
- [HMR](advanced/hmr.md) — hot module replacement behavior
- [Codegen Hooks](advanced/codegen_hooks.md) — custom JS emission for libraries
