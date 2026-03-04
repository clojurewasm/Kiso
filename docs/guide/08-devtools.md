# 8. DevTools

su includes built-in tracing for debugging reactive state.

## Enable Tracing

Call `su/enable-trace` to log all atom state changes to the browser console:

```clojure
(ns my.app
  (:require [su.core :as su]))

(su/enable-trace)
```

Every `reset!` or `swap!` on any atom will print:

```
[atom:count] 0 → 1
[atom:tasks] [] → [{:id 1, :text "Buy milk", :done false}]
```

The label comes from the atom's second argument:

```clojure
(atom 0 "count")      ;; label: "count"
(atom [] "tasks")     ;; label: "tasks"
(atom 0)              ;; label: "?" (unlabeled)
```

## Disable Tracing

```clojure
(su/disable-trace)
```

## Filtered Tracing

Pass a filter function to trace only specific atoms:

```clojure
(su/enable-trace
  {:filter (fn [a] (= (.-label a) "tasks"))})
```

This only traces atoms with the label `"tasks"`, reducing console noise when
you have many atoms.

## Dev-Only Usage

Enable tracing only during development:

```clojure
(ns my.app
  (:require [su.core :as su]))

;; Enable in dev, automatically stripped in production builds
(su/enable-trace)
```

In a production build, you can remove the call or wrap it in a dev-only
conditional. Tracing has no overhead when disabled.

## Debugging Workflow

1. **Label your atoms** — always pass a label as the second argument
2. **Enable trace** — add `(su/enable-trace)` at the top of your main namespace
3. **Open DevTools console** — watch state changes flow as you interact
4. **Filter when noisy** — use `:filter` to focus on specific atoms
5. **Check the flow** — verify that state changes happen in the right order

## Example Output

Given this code:

```clojure
(su/enable-trace)

(def count (atom 0 "count"))
(swap! count inc)
(swap! count inc)
(reset! count 0)
```

The console shows:

```
[atom:count] 0 → 1
[atom:count] 1 → 2
[atom:count] 2 → 0
```

## Summary

| Function           | Description                        |
|--------------------|------------------------------------|
| `su/enable-trace`  | Start logging atom changes         |
| `su/disable-trace` | Stop logging atom changes          |
| `atom val "label"` | Create labeled atom for tracing    |
| `:filter` option   | Trace only matching atoms          |
