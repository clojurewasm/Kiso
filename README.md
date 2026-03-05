# Kiso

[![CI](https://github.com/clojurewasm/Kiso/actions/workflows/ci.yml/badge.svg)](https://github.com/clojurewasm/Kiso/actions/workflows/ci.yml)
[![npm kiso](https://img.shields.io/npm/v/@clojurewasm/kiso.svg?label=@clojurewasm/kiso)](https://www.npmjs.com/package/@clojurewasm/kiso)
[![npm su](https://img.shields.io/npm/v/@clojurewasm/su.svg?label=@clojurewasm/su)](https://www.npmjs.com/package/@clojurewasm/su)
[![license](https://img.shields.io/github/license/clojurewasm/Kiso)](https://github.com/clojurewasm/Kiso/blob/main/LICENSE)
[![GitHub Sponsors](https://img.shields.io/github/sponsors/chaploud?logo=githubsponsors&logoColor=white&color=ea4aaa)](https://github.com/sponsors/chaploud)

A ClojureScript-to-JavaScript compiler written in TypeScript. Zero dependencies.

**Kiso** (基礎) — *foundation* in Japanese.

| Package             | Description              | Size    |
|---------------------|--------------------------|---------|
| `@clojurewasm/kiso` | Compiler + runtime       | ~146 KB |
| `@clojurewasm/su`   | Component framework      | ~21 KB  |

**[Live Showcase](https://clojurewasm.github.io/Kiso/)** — interactive demos with source code and compiled JS output.

## Quick Start

```bash
npm install @clojurewasm/kiso @clojurewasm/su
npm install -D vite
```

**vite.config.js:**

```js
import { cljs } from '@clojurewasm/kiso/vite';
export default { plugins: [cljs()] };
```

**src/main.cljs:**

```clojure
(ns my.app
  (:require [su.core :as su :refer [defc defstyle]]))

(defstyle app-styles
  [:.counter {:display "flex" :gap "8px" :align-items "center"}])

(defc my-counter
  {:style [app-styles]}
  []
  (let [n (atom 0)]
    [:div.counter
     [:button {:on-click (fn [_] (swap! n dec))} "-"]
     [:span (str @n)]
     [:button {:on-click (fn [_] (swap! n inc))} "+"]]))

(su/mount (js/document.getElementById "app") [::my-counter])
```

```bash
npx vite
```

## What Compiles to What?

```clojure
(defn greet [name]           ;; → export let greet = function greet(name) {
  (str "Hello, " name "!"))  ;;     return str("Hello, ", name, "!");  };

(ns my.app                   ;; → import * as u from './util.js';
  (:require [my.util :as u]))

(.toUpperCase "hello")       ;; → "hello".toUpperCase()
(.-length "hello")           ;; → "hello".length
(js/console.log "hi")        ;; → console.log("hi")

[1 2 3]                      ;; → vector(1, 2, 3)
{:a 1}                       ;; → hashMap(keyword("a"), 1)
```

## Compiler API

```ts
import { compile } from '@clojurewasm/kiso/compiler';
const { code } = compile('(defn add [a b] (+ a b))');
```

```bash
npx kiso compile src/ --out-dir dist/ --source-map
```

## Documentation

See [docs/](docs/README.md) for the full guide, API reference, and cookbook.

## Examples

- [Task Manager](examples/task-manager/) — full app with components, context, and styling

## Development

```bash
npm install && npm run build
npm test                     # 1500+ vitest + Playwright E2E
npm run typecheck
```

## License

[MIT](LICENSE)
