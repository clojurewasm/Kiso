# Kiso

![Status: Pre-Alpha](https://img.shields.io/badge/status-pre--alpha-orange)
![License: MIT](https://img.shields.io/badge/license-MIT-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-zero%20deps-3178c6)

> **⚠️ Early Stage — Not Production Ready**
>
> Kiso is in its early stages and under heavy active development. Expect frequent
> breaking changes, incomplete features, and unstable APIs. This project is shared
> for experimentation and feedback purposes only — **do not use in production.**

A ClojureScript-to-JavaScript compiler written in TypeScript. Zero dependencies.

**Kiso** (基礎) — the Japanese word for *foundation*. Just as 基礎 means the bedrock
on which everything is built, Kiso provides the foundational layer to bring
ClojureScript's power to the modern JavaScript ecosystem.

## Highlights

- **Zero dependencies** — pure TypeScript, no external packages
- **Vite integration** — first-class `.cljs` support with HMR
- **Full reader** — syntax-quote, namespaced maps, destructuring
- **Rich runtime** — persistent vectors, hash maps, sets, lazy seqs, protocols, atoms
- **Source maps** — V3 source map generation with VLQ encoding
- **ES modules** — `ns` + `:require` compiles to `import`/`export`

## Packages

| Package      | Description                                                     |
|--------------|-----------------------------------------------------------------|
| `@clojurewasm/kiso` | Compiler + runtime (reader, analyzer, codegen, data structures) |
| `@clojurewasm/su`   | Component framework built on Kiso (see [su](#su) below)         |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 20

### Install

Kiso is not yet published to npm. Clone the repository and link locally:

```bash
git clone https://github.com/chaploud/Kiso.git
cd Kiso
npm install
npm run build
```

### Try it — Task Manager

```bash
cd examples/task-manager
npm install
npm run dev
```

Open `http://localhost:5173` — you'll see a task manager app written entirely in ClojureScript.

**`src/main.cljs`**:

```clojure
(ns task-manager.core)

(def message "Hello from Kiso!")

(defn greet [name]
  (str "Hello, " name "!"))

(js/console.log message)
(js/console.log (greet "World"))
```

**`vite.config.js`**:

```js
import { cljs } from '@clojurewasm/kiso/vite';

export default {
  plugins: [cljs()],
};
```

That's it — Vite handles `.cljs` files automatically with HMR.

## What compiles to what?

### Literals

| ClojureScript    | JavaScript                                  |
|------------------|---------------------------------------------|
| `nil`            | `null`                                      |
| `true` / `false` | `true` / `false`                            |
| `42`, `3.14`     | `42`, `3.14`                                |
| `"hello"`        | `"hello"`                                   |
| `:foo`           | `keyword("foo")`                            |
| `:ns/foo`        | `keyword("foo", "ns")`                      |
| `[1 2 3]`        | `vector(1, 2, 3)`                           |
| `{:a 1 :b 2}`    | `hashMap(keyword("a"), 1, keyword("b"), 2)` |
| `#{1 2 3}`       | `hashSet(1, 2, 3)`                          |

### Functions and definitions

```clojure
;; ClojureScript
(defn greet [name]
  (str "Hello, " name "!"))
```

```js
// JavaScript
export const greet = function greet(name) {
  return str("Hello, ", name, "!");
};
```

### Namespace → ES modules

```clojure
(ns my.app
  (:require [my.util :as u]
            [my.helper :refer [format-date]]))

(def version "1.0")
(defn start [] (u/init))
```

```js
import * as u from './util.js';
import { format_date } from './helper.js';

export const version = "1.0";
export const start = function start() { return u.init(); };
```

### JavaScript interop

```clojure
(.toUpperCase "hello")         ;; → "hello".toUpperCase()
(.-length "hello")             ;; → "hello".length
(set! (.-textContent el) "hi") ;; → el.textContent = "hi"
(js/console.log "hi")         ;; → console.log("hi")
(Date. 2024)                   ;; → new Date(2024)
```

### Control flow and binding

```clojure
(if (pos? x) "positive" "non-positive")

(let [x 10
      y (* x 2)]
  (+ x y))

(loop [i 0 acc 0]
  (if (< i 10)
    (recur (inc i) (+ acc i))
    acc))
```

### Destructuring

```clojure
(let [[a b & rest] [1 2 3 4 5]]
  rest) ;; => (3 4 5)

(let [{:keys [name age] :or {age 0}} {:name "Alice"}]
  [name age]) ;; => ["Alice" 0]

(defn handler [{:keys [method path]}]
  (str method " " path))
```

### Macros (built-in)

Threading, control flow, and definition macros expand at compile time:

```clojure
(-> x (assoc :a 1) (update :b inc))
;; expands to: (update (assoc x :a 1) :b inc)

(when (valid? data)
  (process data)
  (save data))
;; expands to: (if (valid? data) (do (process data) (save data)) nil)

(cond
  (< x 0) :negative
  (> x 0) :positive
  :else   :zero)
;; expands to nested if
```

### Protocols and records

```clojure
(defprotocol IGreeter
  (greet [this]))

(defrecord Person [name]
  IGreeter
  (greet [this] (str "Hi, I'm " name)))

(greet (->Person "Alice")) ;; => "Hi, I'm Alice"
```

---

## su

**su** (素) — the Japanese word for *bare, plain, unadorned*. Like 素 suggests
something in its purest, most essential form, su is a minimal Web Component
framework — no virtual DOM, no build-time magic beyond what Kiso already provides.

su provides reactive Web Components using ClojureScript + Shadow DOM:

- **`defc`** — define a custom element with hiccup templates
- **`defstyle`** — scoped CSS via `adoptedStyleSheets`
- **Reactive** — `atom`, `track()`, `effect()`, `computed()` with fine-grained reactivity
- **Lifecycle** — `on-mount`, `on-unmount` hooks
- **HMR** — hot reload for both components and styles

### Example

```clojure
(ns my.app
  (:require [su.core :refer [defc defstyle mount]]))

(defc my-counter [{:keys [initial]}]
  (let [count (atom (or initial 0))]
    [:div.counter
      [:span "Count: " @count]
      [:button {:on-click #(swap! count inc)} "+"]
      [:button {:on-click #(swap! count dec)} "-"]]))

(defstyle my-counter
  [:.counter {:display "flex" :gap "8px" :align-items "center"}]
  [:button {:padding "4px 12px"}])

(mount (js/document.getElementById "app")
  [:my-counter {:initial 0}])
```

Each `defc` component becomes a native Custom Element with Shadow DOM isolation.

---

## Documentation

See the [full documentation](docs/index.md) for guides, cookbook examples,
and API reference covering the su framework.

---

## Project Structure

```
packages/
├── kiso/                    @clojurewasm/kiso — compiler + runtime
│   ├── src/
│   │   ├── reader/          Clojure reader (tokenizer, reader, form)
│   │   ├── analyzer/        Analysis + macro expansion
│   │   ├── codegen/         JS code generation + source maps
│   │   ├── runtime/         Persistent data structures (tree-shakeable)
│   │   └── api/             Public API (compiler, Vite plugin)
│   └── test/
└── su/                      @clojurewasm/su — component framework
    ├── src/                 Reactive, component, hiccup, CSS, HMR
    └── test/
examples/
└── task-manager/            Example app with Vite
```

## Development

```bash
npm install                  # Install dependencies
npm test                     # Run all tests (vitest, all workspaces)
npm run build                # Build (tsc, all workspaces)
npm run typecheck            # Type check only
```

## License

[MIT](LICENSE)
