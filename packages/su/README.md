# @clojurewasm/su

[![npm version](https://img.shields.io/npm/v/@clojurewasm/su.svg)](https://www.npmjs.com/package/@clojurewasm/su)
[![license](https://img.shields.io/npm/l/@clojurewasm/su.svg)](https://github.com/clojurewasm/Kiso/blob/main/LICENSE)

Reactive Web Component framework for ClojureScript, powered by [Kiso](https://www.npmjs.com/package/@clojurewasm/kiso).

**su** (素) — *plain, essential* in Japanese.

**[Live Showcase](https://clojurewasm.github.io/Kiso/)** | **[Documentation](https://github.com/clojurewasm/Kiso/tree/main/docs)**

## Install

```bash
npm install @clojurewasm/kiso @clojurewasm/su
npm install -D vite
```

## Quick Start

```js
// vite.config.js
import { cljs } from '@clojurewasm/kiso/vite';
export default { plugins: [cljs()] };
```

```clojure
;; src/main.cljs
(ns my.app
  (:require [su.core :as su :refer [defc defstyle]]))

(defstyle counter-styles
  [:.counter {:display "flex" :gap "8px" :align-items "center"}])

(defc my-counter
  {:style [counter-styles]}
  []
  (let [n (atom 0)]
    [:div.counter
     [:button {:on-click #(swap! n dec)} "-"]
     [:span (str @n)]
     [:button {:on-click #(swap! n inc)} "+"]]))

(su/mount (js/document.getElementById "app") [::my-counter])
```

```bash
npx vite
```

## Features

- **Custom Elements** with Shadow DOM isolation via `defc`
- **Auto-wrap reactivity** — `defc` auto-wraps hiccup for reactive updates
- **Fine-grained reactivity** — atoms, effects, computed values
- **Scoped CSS** via `defstyle` (Garden-like syntax)
- **Context API** — `provide` / `use-context` across Shadow DOM
- **Props Channeling** — pass atoms directly to child components
- **HMR** — hot module replacement via Kiso's Vite plugin
- **~21 KB** package size

## API Overview

| Function        | Description                          |
|-----------------|--------------------------------------|
| `defc`          | Define a Custom Element              |
| `defstyle`      | Define a scoped stylesheet           |
| `mount`         | Render component tree into DOM       |
| `effect`        | Reactive side-effect                 |
| `computed`      | Lazy derived value                   |
| `provide`       | Provide context to descendants       |
| `use-context`   | Consume context from ancestor        |
| `on-mount`      | Lifecycle: after mount               |
| `on-unmount`    | Lifecycle: before unmount            |
| `global-style!` | Apply stylesheet to document         |
| `enable-trace`  | DevTools: log atom changes           |

## License

[MIT](https://github.com/clojurewasm/Kiso/blob/main/LICENSE)
