# API Reference

Complete reference for `@clojurewasm/su` and `@clojurewasm/kiso` public APIs.

---

## su Framework (`su.core`)

```clojure
(ns my.app
  (:require [su.core :as su :refer [defc defstyle]]))
```

### `defc`

Define a Custom Element with Shadow DOM.

```clojure
(defc component-name
  {:props {...} ...options}  ;; optional
  [props]                    ;; props argument (or [])
  body)
```

**Options map:**

| Key               | Type              | Description                            |
|-------------------|-------------------|----------------------------------------|
| `:props`          | `{name type}`     | Prop declarations                      |
| `:style`          | `[stylesheet ...]` | Stylesheets to apply (from `defstyle`) |
| `:formAssociated` | `boolean`         | Enable form participation              |
| `:delegatesFocus` | `boolean`         | Delegate focus to Shadow Root          |

**Prop types:**

| Type        | Description                                      |
|-------------|--------------------------------------------------|
| `"string"`  | HTML attribute, converted to string              |
| `"number"`  | HTML attribute, converted via `Number()`         |
| `"boolean"` | HTML attribute, truthy check                     |
| `:atom`     | Props Channeling: JS property, not serialized    |

**Behavior:**

- Component name must contain a hyphen (Custom Element spec)
- Component function runs **once** (setup phase)
- `defc` auto-wraps the final hiccup expression as a reactive render function
- If body explicitly returns a `fn`, auto-wrap is skipped (Form-2 pattern)
- Auto-registered via `customElements.define()`

```clojure
(defc my-widget
  {:props {:title "string" :count "number"}
   :style [my-widget-styles]}
  [{:keys [title count]}]
  [:div.widget
    [:h2 title]
    [:span (str "Count: " count)]])
```

---

### `mount`

Render a component tree into a DOM container. Returns an unmount function.

```clojure
(su/mount container hiccup) -> unmount-fn
```

| Parameter   | Type          | Description                |
|-------------|---------------|----------------------------|
| `container` | `Element`     | DOM element to render into |
| `hiccup`    | hiccup vector | Root component element     |

```clojure
(let [unmount (su/mount (js/document.getElementById "app")
                        [::my-app])]
  ;; Later: (unmount)
  )
```

---

### `defstyle`

Define a scoped CSS stylesheet.

```clojure
(defstyle style-name
  [selector {:property "value" ...}]
  ...)
```

- Creates a `CSSStyleSheet` via Constructable Stylesheets API
- Returns a stylesheet value — pass to `defc` via `:style [...]`
- Cached by name (created once, shared across instances)
- Scoped to the component's Shadow DOM

**Selector syntax:**

| Form                    | CSS Output            |
|-------------------------|-----------------------|
| `[:div {...}]`          | `div { ... }`         |
| `[:.class {...}]`       | `.class { ... }`      |
| `[:host {...}]`         | `:host { ... }`       |
| `[":host(.x)" {...}]`  | `:host(.x) { ... }`   |
| `["::slotted(p)" {...}]` | `::slotted(p) { ... }` |

---

### `global-style!`

Apply a stylesheet to the document (outside Shadow DOM).

```clojure
(su/global-style! stylesheet)
```

Appends the stylesheet to `document.adoptedStyleSheets`.

---

### `effect`

Run a side-effect that re-runs when tracked atoms change.

```clojure
(su/effect fn) -> dispose-fn
```

- Runs immediately on creation
- Tracks all atoms dereferenced during execution
- Re-tracks dependencies on each run (dynamic tracking)
- Returns a dispose function

```clojure
(let [dispose (su/effect
                (fn [] (js/console.log "Count:" @count)))]
  (dispose))
```

---

### `computed`

Create a lazy derived value.

```clojure
(su/computed fn) -> computed-ref
```

- Lazy: recomputes only when dirty **and** `.deref` is called
- Cached: returns last value if deps unchanged
- Trackable by effects and other computed values

```clojure
(let [total (su/computed (fn [] (reduce + @items)))]
  (.deref total))
```

---

### `on-mount`

Register a callback that runs after the component mounts to the DOM.

```clojure
(su/on-mount fn)
```

Must be called during component setup (not inside render fn).

---

### `on-unmount`

Register a callback that runs before the component is removed.

```clojure
(su/on-unmount fn)
```

Must be called during component setup.

---

### `provide`

Provide a value to all descendant components.

```clojure
(su/provide key value)
```

Must be called during component setup. Attaches a `"su-context-request"` event listener.

---

### `use-context`

Retrieve a value provided by an ancestor.

```clojure
(su/use-context key) -> value
```

Dispatches `CustomEvent("su-context-request")` with `bubbles: true, composed: true`
(crosses Shadow DOM boundaries). Must be called during component setup.

---

### `enable-trace` / `disable-trace`

Log atom state changes to the console.

```clojure
(su/enable-trace)
(su/enable-trace {:filter (fn [a] (= (.-label a) "tasks"))})
(su/disable-trace)
```

Output format: `[atom:label] oldVal → newVal`

---

### `hot-replace`

Replace a component's render function at runtime (used by Vite plugin).

```clojure
(su/hot-replace tag-name new-render-fn) -> boolean
```

Called automatically during HMR. You typically do not call this manually.

---

### Hiccup Syntax

**Tag format:** `:tag#id.class1.class2`

| Part        | Example        | Result                    |
|-------------|----------------|---------------------------|
| Tag only    | `[:div]`       | `<div>`                   |
| With ID     | `[:div#app]`   | `<div id="app">`          |
| With class  | `[:div.card]`  | `<div class="card">`      |
| Default div | `[:.card]`     | `<div class="card">`      |

**Attributes:**

| Key         | Behavior                           |
|-------------|------------------------------------|
| `:class`    | Merged with tag classes            |
| `:style`    | Applied as object (camelCase keys) |
| `:on-*`     | Event listener (e.g., `:on-click`) |
| `:ref`      | DOM reference callback             |
| `:slot`     | Named slot assignment              |

**Children:**

| Type     | Rendering                     |
|----------|-------------------------------|
| String   | Text node                     |
| Number   | Text node (coerced)           |
| `nil`    | Skipped                       |
| Vector   | Hiccup element (recursive)    |
| Function | Reactive binding via `bind()` |
| Sequence | Flattened                     |

**Component references:**

| Context        | Syntax                        |
|----------------|-------------------------------|
| Same namespace | `[::my-comp {:prop "val"}]`   |
| Cross namespace | `[:ns/my-comp {:prop "val"}]` |

---

## Kiso Compiler (`@clojurewasm/kiso`)

### `compile`

Compile ClojureScript source to JavaScript.

```typescript
import { compile } from '@clojurewasm/kiso/compiler';

const result = compile(source, options?);
// result.code  — JavaScript string
// result.map   — source map (if requested)
```

**Options:**

| Key            | Type                              | Description                   |
|----------------|-----------------------------------|-------------------------------|
| `filename`     | `string`                          | Source filename for errors     |
| `sourceMap`    | `boolean`                         | Generate source map           |
| `codegenHooks` | `Record<string, CodegenHook>`     | Custom JS emitters            |

### `read` / `readAll`

Parse ClojureScript source into forms.

```typescript
import { read, readAll } from '@clojurewasm/kiso/compiler';

const form = read('(+ 1 2)');      // single form
const forms = readAll(source);      // all forms
```

### `analyze`

Analyze a parsed form into an AST node.

```typescript
import { analyze } from '@clojurewasm/kiso/compiler';

const node = analyze(form);
```

### `generate`

Generate JavaScript from an AST node.

```typescript
import { generate } from '@clojurewasm/kiso/compiler';

const js = generate(node);
```

### `CompileError`

Unified error class with phase and location context.

```typescript
import { CompileError } from '@clojurewasm/kiso';

// Properties: phase, filename, line, col, message
// Methods: format(), formatLocation()

try {
  compile(source, { filename: 'app.cljs' });
} catch (err) {
  if (err instanceof CompileError) {
    console.error(err.format());
    // [analyze] app.cljs:12:1: def requires a symbol
  }
}
```

### Vite Plugin

```typescript
import { cljs } from '@clojurewasm/kiso/vite';

export default {
  plugins: [cljs()],
};
```

The plugin:
- Compiles `.cljs` files on demand
- Generates source maps for debugging
- Supports HMR for su components
- Shows errors in Vite's error overlay with phase and location
