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

See the [DevTools guide](08-devtools.md) for tracing.

## Reactive Rendering

The key to reactivity in su is wrapping hiccup in a function:

```clojure
(defc my-counter []
  (let [count (atom 0)]
    (fn []
      [:div
       [:span (str "Count: " @count)]
       [:button {:on-click (fn [_] (swap! count inc))} "+"]])))
```

When the component returns a function, su calls it inside a reactive context.
Any atom dereferenced during that call is automatically tracked. When the atom
changes, the function re-runs and the DOM updates.

### Why the `fn` Wrapper Matters

```clojure
;; WRONG — static, never updates
(defc broken-counter []
  (let [count (atom 0)]
    [:div [:span (str @count)]]))

;; RIGHT — reactive, updates on change
(defc working-counter []
  (let [count (atom 0)]
    (fn []
      [:div [:span (str @count)]])))
```

In the "wrong" example, `@count` is evaluated once during setup. The resulting
string `"0"` is baked into the hiccup. There is no reactive subscription.

In the "right" example, the `fn` creates a reactive boundary. su tracks that
`count` was dereferenced and re-runs the function when it changes.

### Partial Reactivity

You can make only parts of the output reactive by using `fn` as a child:

```clojure
(defc my-dashboard []
  (let [count (atom 0)]
    [:div
      [:h1 "Dashboard"]                      ;; static — never re-renders
      (fn [] [:span (str "Count: " @count)]) ;; reactive — re-renders
      [:button {:on-click (fn [_] (swap! count inc))} "+"]]))
```

The `[:h1 "Dashboard"]` is rendered once. Only the `(fn [] ...)` part
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

    (fn []
      [:button {:on-click (fn [_] (swap! count inc))} "Increment"])))
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
    (fn []
      [:div
        [:span (str "Done: " (.deref done-count))]
        [:span (str "Total: " (count @tasks))]])))
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

### 1. Forgetting the `fn` Wrapper

The most common mistake. Always wrap reactive hiccup in `(fn [] ...)`:

```clojure
;; Won't update:
[:span (str @count)]

;; Will update:
(fn [] [:span (str @count)])
```

### 2. Creating Atoms Inside the Render Function

Atoms must be created in the setup phase (outer `let`), not in the render
function:

```clojure
;; WRONG — creates a new atom on every render
(defc broken []
  (fn []
    (let [count (atom 0)]  ;; BUG: new atom each render
      [:span (str @count)])))

;; RIGHT — atom created once in setup
(defc correct []
  (let [count (atom 0)]    ;; created once
    (fn []
      [:span (str @count)])))
```

### 3. Multiple Atoms

When a render function dereferences multiple atoms, it re-runs when **any** of
them change:

```clojure
(let [first-name (atom "Alice")
      last-name (atom "Smith")]
  (fn []
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
| `fn` wrapper | Creates reactive boundary for re-rendering        |
| `effect`   | Side effect that re-runs on atom changes            |
| `computed` | Lazy derived value, cached until deps change        |
