# Getting Started

Build your first su app in 5 minutes.

## Prerequisites

- [Node.js](https://nodejs.org/) >= 20

## Project Setup

Create a new project and install dependencies:

```bash
mkdir my-app && cd my-app
npm init -y
```

Install Kiso, su, and Vite:

```bash
npm install @clojurewasm/kiso @clojurewasm/su
npm install -D vite
```

> **Note:** Kiso is not yet published to npm. Clone the repository and use
> `file:` paths in your `package.json` for now. See the
> [task-manager example](https://github.com/chaploud/Kiso/tree/main/examples/task-manager)
> for reference.

## Configure Vite

Create `vite.config.js`:

```js
import { cljs } from '@clojurewasm/kiso/vite';

export default {
  plugins: [cljs()],
};
```

The Kiso Vite plugin compiles `.cljs` files on the fly with full HMR support.

## Create the HTML Entry Point

Create `index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My App</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.cljs"></script>
</body>
</html>
```

## Write Your First Component

Create `src/main.cljs`:

```clojure
(ns my.app
  (:require [su.core :as su :refer [defc defstyle]]))

;; Define styles (Shadow DOM scoped)
(defstyle my-counter
  [:.counter {:display "flex"
              :gap "8px"
              :align-items "center"
              :font-family "system-ui, sans-serif"}]
  [:span {:font-size "24px" :min-width "60px" :text-align "center"}]
  [:button {:padding "8px 16px"
            :border "1px solid #d1d5db"
            :border-radius "6px"
            :background "#fff"
            :cursor "pointer"
            :font-size "18px"}])

;; Define component
(defc my-counter []
  (let [count (atom 0)]
    (fn []
      [:div {:class "counter"}
       [:button {:on-click (fn [_] (swap! count dec))} "-"]
       [:span (str @count)]
       [:button {:on-click (fn [_] (swap! count inc))} "+"]])))

;; Mount to the page
(su/mount (js/document.getElementById "app")
          [::my-counter])
```

This defines a counter component with scoped styles and reactive state.

## Run the Dev Server

```bash
npx vite
```

Open `http://localhost:5173`. You should see a counter with + and - buttons.

Try editing `src/main.cljs` — changes appear instantly via HMR without losing state.

## What Just Happened?

1. **`defstyle my-counter`** created a scoped CSS stylesheet. Because the name
   matches the component, it is automatically linked.

2. **`defc my-counter`** defined a Web Component (`<my-counter>`) with Shadow DOM.
   The component function runs **once** to set up state, then returns a render
   function that re-runs whenever atoms change.

3. **`(atom 0)`** created a reactive atom. Dereferencing it inside the render
   function (`@count`) automatically subscribes to changes.

4. **`su/mount`** rendered the component into the `#app` div.

## Next Steps

- [Counter Cookbook](cookbook/counter.md) — line-by-line walkthrough of this example
- [Components Guide](guide/01-components.md) — deep dive into `defc`
- [Reactivity Guide](guide/03-reactivity.md) — atoms, effects, and computed values
- [Todo App](cookbook/todo-app.md) — full app walkthrough with state management
