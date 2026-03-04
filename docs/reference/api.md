# API Reference

Complete reference for all public exports from `@clojurewasm/su`.

All functions are imported from `su.core`:

```clojure
(ns my.app
  (:require [su.core :as su :refer [defc defstyle]]))
```

---

## Components

### `defc`

Define a Custom Element with Shadow DOM.

```clojure
(defc component-name
  {:props {...} ...options}  ;; optional
  [props]                    ;; props argument (or [])
  body)
```

**Options map:**

| Key                | Type                          | Description                        |
|--------------------|-------------------------------|------------------------------------|
| `:props`           | `{name type}`                 | Prop declarations                  |
| `:formAssociated`  | `boolean`                     | Enable form participation          |
| `:delegatesFocus`  | `boolean`                     | Delegate focus to Shadow Root      |

**Prop types:**

| Type        | Description                                          |
|-------------|------------------------------------------------------|
| `"string"`  | HTML attribute → string                              |
| `"number"`  | HTML attribute → number (via `Number()`)             |
| `"boolean"` | HTML attribute → boolean (truthy check)              |
| `:atom`     | Props Channeling: JS property, not serialized        |

**Behavior:**

- The component name must contain a hyphen (Custom Element requirement)
- The component function runs **once** (setup phase)
- If the body returns a function, that function is the reactive render function
- If the body returns a hiccup vector, it is rendered statically
- The component is auto-registered via `customElements.define()`
- Styles with the same name are automatically linked

**Example:**

```clojure
(defc my-widget
  {:props {:title "string" :count "number"}}
  [{:keys [title count]}]
  [:div
    [:h2 title]
    [:span (str "Count: " count)]])
```

---

### `mount`

Render a component tree into a DOM container.

```clojure
(su/mount container hiccup)
```

| Parameter   | Type          | Description               |
|-------------|---------------|---------------------------|
| `container` | `Element`     | DOM element to render into |
| `hiccup`    | hiccup vector | Root component element    |

**Example:**

```clojure
(su/mount (js/document.getElementById "app")
          [::my-app])
```

---

## Styling

### `defstyle`

Define a scoped CSS stylesheet.

```clojure
(defstyle style-name
  [selector {:property "value" ...}]
  ...)
```

**Behavior:**

- Creates a `CSSStyleSheet` via Constructable Stylesheets API
- Cached by name (created once, shared across instances)
- Auto-linked to `defc` with the same name
- Styles are scoped to the component's Shadow DOM

**Selector syntax:**

| Form                       | CSS Output               |
|----------------------------|--------------------------|
| `[:div {...}]`             | `div { ... }`            |
| `[:.class {...}]`          | `.class { ... }`         |
| `[:host {...}]`            | `:host { ... }`          |
| `[":host(.x)" {...}]`     | `:host(.x) { ... }`     |
| `["::slotted(p)" {...}]`  | `::slotted(p) { ... }`  |

**Example:**

```clojure
(defstyle my-card
  [:host {:display "block"}]
  [:.card {:padding "16px"
           :background "#fff"
           :border-radius "8px"}]
  [:.title {:font-size "18px"
            :font-weight "bold"}])
```

---

## Reactivity

### `effect`

Run a side-effect function that re-runs when tracked atoms change.

```clojure
(su/effect fn) -> dispose-fn
```

| Parameter | Type       | Description                   |
|-----------|------------|-------------------------------|
| `fn`      | `() -> ()` | Function to run reactively    |

**Returns:** A dispose function `() -> ()` that stops the effect.

**Behavior:**

- Runs immediately on creation
- Automatically tracks all atoms dereferenced during execution
- Re-runs when any tracked atom changes
- Re-tracks dependencies on each run (dynamic dependency tracking)
- Call the returned function to dispose

**Example:**

```clojure
(let [count (atom 0)
      dispose (su/effect
                (fn []
                  (js/console.log "Count:" @count)))]
  ;; Later:
  (dispose))
```

---

### `computed`

Create a lazy derived value.

```clojure
(su/computed fn) -> computed-ref
```

| Parameter | Type       | Description                |
|-----------|------------|----------------------------|
| `fn`      | `() -> T`  | Function to compute value  |

**Returns:** An object with `.deref` method.

**Behavior:**

- Lazy: only recomputes when dirty **and** `.deref` is called
- Cached: returns last value if dependencies haven't changed
- Trackable: can be tracked by effects and other computed values
- Automatically tracks dependencies like `effect`

**Example:**

```clojure
(let [items (atom [1 2 3])
      total (su/computed (fn [] (reduce + @items)))]
  (.deref total))  ;; => 6
```

---

## Lifecycle

### `on-mount`

Register a callback that runs after the component mounts to the DOM.

```clojure
(su/on-mount fn)
```

| Parameter | Type       | Description          |
|-----------|------------|----------------------|
| `fn`      | `() -> ()` | Callback function    |

**Constraints:** Must be called during component setup (not inside render fn).

**Example:**

```clojure
(defc my-widget []
  (su/on-mount
    (fn [] (js/console.log "Mounted!")))
  [:div "Hello"])
```

---

### `on-unmount`

Register a callback that runs before the component is removed from the DOM.

```clojure
(su/on-unmount fn)
```

| Parameter | Type       | Description          |
|-----------|------------|----------------------|
| `fn`      | `() -> ()` | Callback function    |

**Constraints:** Must be called during component setup (not inside render fn).

**Example:**

```clojure
(defc my-widget []
  (su/on-unmount
    (fn [] (js/console.log "Unmounting!")))
  [:div "Hello"])
```

---

## Context

### `provide`

Provide a value to all descendant components.

```clojure
(su/provide key value)
```

| Parameter | Type  | Description           |
|-----------|-------|-----------------------|
| `key`     | `any` | Context key (usually keyword) |
| `value`   | `any` | Value to provide      |

**Constraints:** Must be called during component setup.

**Mechanism:** Attaches a `"su-context-request"` event listener on the host
element.

**Example:**

```clojure
(defc app-root []
  (let [theme (atom :light)]
    (su/provide :theme theme)
    [:div [::child-component]]))
```

---

### `use-context`

Retrieve a value provided by an ancestor component.

```clojure
(su/use-context key) -> value
```

| Parameter | Type  | Description           |
|-----------|-------|-----------------------|
| `key`     | `any` | Context key to look up |

**Returns:** The value from the nearest matching provider, or `undefined` if
no provider found.

**Constraints:** Must be called during component setup.

**Mechanism:** Dispatches a `CustomEvent("su-context-request")` with
`bubbles: true, composed: true` (crosses Shadow DOM).

**Example:**

```clojure
(defc themed-widget []
  (let [theme (su/use-context :theme)]
    (fn []
      [:div {:style {:background (if (= @theme :dark) "#333" "#fff")}}
        "Themed"])))
```

---

## DevTools

### `enable-trace`

Start logging atom state changes to the console.

```clojure
(su/enable-trace)
(su/enable-trace {:filter filter-fn})
```

| Option    | Type               | Description                |
|-----------|--------------------|----------------------------|
| `:filter` | `(atom) -> boolean`| Only trace matching atoms  |

**Output format:** `[atom:label] oldVal → newVal`

**Example:**

```clojure
(su/enable-trace)
(su/enable-trace {:filter (fn [a] (= (.-label a) "tasks"))})
```

---

### `disable-trace`

Stop logging atom state changes.

```clojure
(su/disable-trace)
```

---

## HMR

### `hot-replace`

Replace a component's render function at runtime (used by the Vite plugin).

```clojure
(su/hot-replace tag-name new-render-fn) -> boolean
```

| Parameter       | Type       | Description                     |
|-----------------|------------|---------------------------------|
| `tag-name`      | `string`   | Custom Element tag name         |
| `new-render-fn` | `function` | New render function             |

**Returns:** `true` if the component was found and updated, `false` otherwise.

**Behavior:**

- Updates the render function in the HMR registry
- Finds all live instances in the DOM
- Disposes old effects and clears Shadow DOM
- New renders use the updated function

This function is called automatically by the Kiso Vite plugin during HMR.
You typically do not call it manually.

---

## Hiccup Syntax Reference

### Tag Format

```
:tag#id.class1.class2
```

| Part        | Example            | Result                 |
|-------------|--------------------|------------------------|
| Tag only    | `[:div]`           | `<div>`                |
| With ID     | `[:div#app]`       | `<div id="app">`       |
| With class  | `[:div.card]`      | `<div class="card">`   |
| Combined    | `[:p#x.a.b]`       | `<p id="x" class="a b">` |
| Default div | `[:.card]`         | `<div class="card">`   |

### Attribute Map

| Key              | Behavior                              |
|------------------|---------------------------------------|
| `:class`         | Merged with tag classes               |
| `:style`         | Applied as object (camelCase keys)    |
| `:on-*`          | Event listener (e.g., `:on-click`)    |
| `:part`          | Expose for `::part` external styling  |
| `:ref`           | DOM reference callback                |
| `:slot`          | Named slot assignment                 |
| `:--%` props     | CSS custom properties                 |
| other            | Set as HTML attribute                 |

### Children

| Type     | Rendering                     |
|----------|-------------------------------|
| String   | Text node                     |
| Number   | Text node (coerced)           |
| `nil`    | Skipped                       |
| Vector   | Hiccup element (recursive)    |
| Function | Reactive binding via `bind()` |
| Sequence | Flattened                     |

### Component References

| Context          | Syntax                         |
|------------------|--------------------------------|
| Same namespace   | `[::my-comp {:prop "val"}]`    |
| Cross namespace  | `[:ns/my-comp {:prop "val"}]`  |
