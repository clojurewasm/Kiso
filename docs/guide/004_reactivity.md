# 3. Reactivity

su uses fine-grained reactivity based on atoms. When an atom changes, only the
parts of the DOM that dereference it are re-rendered.

## Atoms

Atoms hold mutable state. Create them with `atom`:

```clojure
(def count (atom 0))
(def name (atom "Alice"))
(def items (atom []))
```

### Reading: `deref` / `@`

```clojure
@count     ;; => 0
(deref count)  ;; same thing
```

### Writing: `reset!` and `swap!`

```clojure
(reset! count 42)           ;; set to 42
(swap! count inc)            ;; apply function: 42 → 43
(swap! count + 10)           ;; 43 → 53
(swap! items conj {:id 1})   ;; append to vector
```

### Labeled Atoms

Give atoms a label for debugging (visible in DevTools trace):

```clojure
(def count (atom 0 "count"))
(def tasks (atom [] "tasks"))
```

See the [DevTools guide](009_devtools.md) for tracing.

## Reactive Rendering

`defc` automatically wraps the final hiccup expression in a reactive function.
Any atom dereferenced inside that body is tracked. When the atom changes, the
render re-runs and the DOM updates.

```clojure
(defc my-counter []
  (let [count (atom 0)]
    [:div
     [:span (str "Count: " @count)]
     [:button {:on-click (fn [_] (swap! count inc))} "+"]]))
```

No manual `(fn [] ...)` wrapper is needed — `defc` handles it. The `let` body
runs once to set up state, and the final expression (the hiccup vector) becomes
the reactive render body.

### Partial Reactivity

Within hiccup children, you can use `(fn [] ...)` to create fine-grained
reactive boundaries:

```clojure
(defc my-dashboard []
  (let [count (atom 0)]
    [:div
      [:h1 "Dashboard"]                      ;; static — never re-renders
      (fn [] [:span (str "Count: " @count)]) ;; reactive — re-renders
      [:button {:on-click (fn [_] (swap! count inc))} "+"]]))
```

The `[:h1 "Dashboard"]` is rendered once. Only the `(fn [] ...)` child
re-renders when `count` changes. This is more efficient than re-rendering the
entire component.

## Effect

`effect` runs a side-effect function that re-runs when tracked atoms change:

```clojure
(defc my-logger []
  (let [count (atom 0)]
    ;; Effect: runs immediately, then re-runs when count changes
    (su/effect
      (fn []
        (js/console.log "Count is now:" @count)))

    [:button {:on-click (fn [_] (swap! count inc))} "Increment"]))
```

Effects are useful for:

- Logging
- Updating the document title
- Syncing with external systems
- Setting timers based on state

### Disposing Effects

`effect` returns a dispose function:

```clojure
(let [dispose (su/effect (fn [] (js/console.log @count)))]
  ;; Later, to stop the effect:
  (dispose))
```

## Computed

`computed` creates a derived value that updates when its dependencies change:

```clojure
(defc task-stats []
  (let [tasks (atom [{:done false} {:done true} {:done false}])
        done-count (su/computed
                     (fn [] (count (filter :done @tasks))))]
    [:div
      [:span (str "Done: " (.deref done-count))]
      [:span (str "Total: " (count @tasks))]]))
```

Key properties:

- **Lazy**: recomputes only when dereferenced and a dependency has changed
- **Cached**: returns the cached value if dependencies haven't changed
- **Trackable**: can be tracked by effects and other computed values

Access the value with `.deref`:

```clojure
(.deref done-count)  ;; => 1
```

## Common Pitfalls

### 1. Reactive Children in Hiccup

Inside `defc`, the body is auto-wrapped. But when embedding reactive
expressions as **hiccup children**, you still need `(fn [] ...)`:

```clojure
;; Won't update (evaluated once when parent renders):
[:span (str @count)]

;; Will update (reactive child):
(fn [] [:span (str @count)])
```

### 2. Creating Atoms Inside the Render Body

Atoms must be created in the setup phase (outer `let`), not as the final
expression that becomes the render body:

```clojure
;; WRONG — creates a new atom on every render
(defc broken []
  [:span (str @(atom 0))])  ;; BUG: new atom each render

;; RIGHT — atom created once in setup let
(defc correct []
  (let [count (atom 0)]
    [:span (str @count)]))
```

### 3. Multiple Atoms

When a render body dereferences multiple atoms, it re-runs when **any** of
them change:

```clojure
(defc greeting []
  (let [first-name (atom "Alice")
        last-name (atom "Smith")]
    ;; Re-renders when EITHER atom changes
    [:span (str @first-name " " @last-name)]))
```

## Summary

| Concept    | Description                                         |
|------------|-----------------------------------------------------|
| `atom`     | Mutable reactive state container                    |
| `@` / `deref` | Read atom value; subscribes in reactive context  |
| `reset!`   | Set atom to new value                               |
| `swap!`    | Update atom by applying a function                  |
| auto-wrap  | `defc` auto-wraps final expr as reactive render   |
| `fn` child | Creates fine-grained reactive boundary in hiccup  |
| `effect`   | Side effect that re-runs on atom changes            |
| `computed` | Lazy derived value, cached until deps change        |
