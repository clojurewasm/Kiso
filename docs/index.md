# Kiso + su Documentation

Welcome to the documentation for **Kiso** (基礎) and the **su** (素) component framework.

Kiso is a ClojureScript-to-JavaScript compiler written in TypeScript with zero dependencies.
su is a minimal reactive Web Component framework built on top of Kiso.

## Getting Started

- [Getting Started](getting-started.md) — set up a project and build your first app in 5 minutes

## Guide

Step-by-step guides covering every aspect of the su framework:

| Chapter                                            | Topic                                       |
|----------------------------------------------------|---------------------------------------------|
| [1. Components](guide/01-components.md)            | `defc`, props, naming, nesting, `mount`     |
| [2. Styling](guide/02-styling.md)                  | `defstyle`, Shadow DOM CSS, theming         |
| [3. Reactivity](guide/03-reactivity.md)            | Atoms, `effect`, `computed`, reactive rendering |
| [4. Hiccup](guide/04-hiccup.md)                    | Hiccup syntax, attributes, events, children |
| [5. State Management](guide/05-state-management.md)| Context API, Props Channeling, architecture |
| [6. Lifecycle](guide/06-lifecycle.md)              | `on-mount`, `on-unmount`, host access       |
| [7. Forms](guide/07-forms.md)                      | Form association, focus delegation, a11y    |
| [8. DevTools](guide/08-devtools.md)                | `enable-trace`, debugging workflow          |

## Cookbook

Practical examples and recipes:

- [Counter](cookbook/counter.md) — minimal hello-world counter
- [Todo App](cookbook/todo-app.md) — full walkthrough of the task-manager example
- [Patterns](cookbook/patterns.md) — common recipes (lists, conditionals, timers, fetch)

## Reference

- [API Reference](reference/api.md) — complete API reference for all su exports

## Advanced

- [HMR](advanced/hmr.md) — hot module replacement behavior and Vite integration
- [Architecture](advanced/architecture.md) — how su works under the hood
- [Codegen Hooks](codegen-hooks.md) — compiler integration for `defc` and `defstyle`
