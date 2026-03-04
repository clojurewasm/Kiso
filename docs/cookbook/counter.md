# Counter

A minimal counter app — the "hello world" of su.

## Complete Project

### `package.json`

```json
{
  "name": "counter",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "@clojurewasm/kiso": "file:../../packages/kiso",
    "@clojurewasm/su": "file:../../packages/su"
  },
  "devDependencies": {
    "vite": "^6.0.0"
  }
}
```

### `vite.config.js`

```js
import { cljs } from '@clojurewasm/kiso/vite';

export default {
  plugins: [cljs()],
};
```

### `index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Counter</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.cljs"></script>
</body>
</html>
```

### `src/main.cljs`

```clojure
(ns counter.core
  (:require [su.core :as su :refer [defc defstyle]]))

;; 1. Define scoped styles
(defstyle my-counter
  [:.counter {:display "flex"
              :gap "12px"
              :align-items "center"
              :font-family "system-ui, sans-serif"
              :padding "20px"}]
  [:span {:font-size "32px"
          :font-weight "bold"
          :min-width "80px"
          :text-align "center"}]
  [:button {:padding "8px 20px"
            :border "1px solid #d1d5db"
            :border-radius "8px"
            :background "#fff"
            :cursor "pointer"
            :font-size "20px"}])

;; 2. Define component
(defc my-counter []
  ;; Setup phase: runs ONCE when component mounts.
  ;; Create local reactive state.
  (let [count (atom 0)]
    ;; Return a render function.
    ;; This runs every time @count changes.
    (fn []
      [:div {:class "counter"}
       [:button {:on-click (fn [_] (swap! count dec))} "-"]
       [:span (str @count)]
       [:button {:on-click (fn [_] (swap! count inc))} "+"]])))

;; 3. Mount to the page
(su/mount (js/document.getElementById "app")
          [::my-counter])
```

## Line-by-Line Walkthrough

### Namespace and Imports

```clojure
(ns counter.core
  (:require [su.core :as su :refer [defc defstyle]]))
```

Import `defc` (define component) and `defstyle` (define stylesheet) from su.
The `su` alias is used for `su/mount`.

### Styles with `defstyle`

```clojure
(defstyle my-counter
  [:.counter { ... }]
  [:span { ... }]
  [:button { ... }])
```

`defstyle` takes a name and CSS rules in Garden-like syntax:

- `[:.counter {...}]` targets elements with `class="counter"`
- Styles are scoped to the component's Shadow DOM — they won't leak out

The name `my-counter` matches the component name, so the stylesheet is
automatically applied.

### Component with `defc`

```clojure
(defc my-counter []
  (let [count (atom 0)]
    (fn []
      [:div {:class "counter"}
       [:button {:on-click (fn [_] (swap! count dec))} "-"]
       [:span (str @count)]
       [:button {:on-click (fn [_] (swap! count inc))} "+"]])))
```

Key points:

- **`defc my-counter []`** — defines a component named `my-counter` with no
  props. This becomes a Custom Element `<my-counter>`.

- **`(let [count (atom 0)] ...)`** — the outer `let` runs **once** during
  component initialization. This is where you create atoms and set up state.

- **`(fn [] ...)`** — the returned function is the **render function**. It
  re-runs whenever any atom it dereferences changes.

- **`@count`** — dereferencing the atom inside the render function
  automatically subscribes to changes. When `count` changes, the
  `[:span (str @count)]` part re-renders.

- **`(swap! count inc)`** — updates the atom, which triggers a re-render of
  the reactive part.

> **Important:** su components follow the Solid.js model, not React. The
> component function runs once; only the returned render function re-runs.

### Mounting

```clojure
(su/mount (js/document.getElementById "app")
          [::my-counter])
```

`mount` takes a DOM container and a hiccup element. The `::my-counter` syntax
is a namespace-qualified keyword that references the component defined in the
current namespace.

## Try It

```bash
npm install
npx vite
```

Open `http://localhost:5173` and click the buttons.

## Exercises

1. Add a "Reset" button that sets the counter back to 0 using `(reset! count 0)`
2. Add an `initial` prop: `(defc my-counter [{:keys [initial]}] ...)`
3. Display "Even" or "Odd" below the counter using a conditional
