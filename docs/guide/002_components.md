# 1. Components

Components are the building blocks of su applications. Each component becomes a
native [Custom Element](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements)
with Shadow DOM isolation.

## Defining a Component

Use `defc` to define a component:

```clojure
(ns my.app
  (:require [su.core :refer [defc]]))

(defc my-greeting []
  [:p "Hello, world!"])
```

This registers a Custom Element `<my-greeting>` that renders a paragraph.

### Naming Rules

Component names **must** contain a hyphen (Web Component requirement):

```clojure
;; Good
(defc my-button [] ...)
(defc task-item [] ...)

;; Bad — will throw an error
(defc button [] ...)
```

## Props

Components receive props as HTML attributes. Declare them in the options map:

```clojure
(defc greeting-card
  {:props {:name "string" :age "number" :active "boolean"}}
  [{:keys [name age active]}]
  [:div
   [:h2 (str "Hello, " name)]
   [:p (str "Age: " age)]
   (when active [:span "Active"])])
```

### Prop Types

| Type        | HTML Attribute | ClojureScript Value |
|-------------|----------------|---------------------|
| `"string"`  | `"Alice"`      | `"Alice"`           |
| `"number"`  | `"42"`         | `42`                |
| `"boolean"` | `"true"`, `""` | `true`              |

HTML attributes are always strings. su deserializes them according to the
declared type.

### Destructuring Props

The props argument is a Kiso HashMap with keyword keys. Use `:keys`
destructuring:

```clojure
(defc user-card
  {:props {:name "string" :role "string"}}
  [{:keys [name role]}]
  [:div
   [:strong name]
   [:span (str " (" role ")")]])
```

## Component Function Runs Once

Unlike React, the component function in su runs **once** during initialization.
This is the Solid.js model:

```clojure
(defc my-timer []
  ;; This code runs ONCE when the component mounts
  (let [seconds (atom 0)]
    (js/console.log "Component initialized!")
    ;; The hiccup is automatically reactive — @seconds triggers re-renders
    [:div (str "Seconds: " @seconds)]))
```

`defc` **auto-wraps** the final hiccup expression in a reactive render function.
Dereferencing atoms (`@seconds`) inside the hiccup body automatically subscribes
to changes — no explicit `fn` return needed.

### Form-2 Components (Advanced)

For setup code that must run once (timers, event listeners, etc.), explicitly
return a `fn`:

```clojure
(defc my-timer []
  (let [seconds (atom 0)
        id (js/setInterval #(swap! seconds inc) 1000)]
    (on-unmount #(js/clearInterval id))
    ;; Explicit fn: setup code above runs once, render fn re-runs on changes
    (fn []
      [:div (str "Seconds: " @seconds)])))
```

When `defc` detects an explicit `fn` return, it skips auto-wrap.

## Props Channeling

Regular props are serialized as HTML attributes (strings only). For passing
rich values like atoms, objects, or collections, use **Props Channeling**:

```clojure
(defc task-list
  {:props {:tasks :atom}}
  [{:keys [tasks]}]
  [:ul
   (map (fn [t] [:li (:text t)])
        @tasks)])
```

The `:atom` prop type tells su to pass the value as a JavaScript property
instead of an HTML attribute. This preserves the original value without
serialization.

Pass the atom in hiccup:

```clojure
(let [tasks (atom [{:text "Buy milk"}])]
  [::task-list {:tasks tasks}])
```

## Referencing Components in Hiccup

### Same Namespace

Use `::` (namespace-qualified keyword) to reference a component defined in
the current namespace:

```clojure
(defc child-comp [] [:p "I am a child"])

(defc parent-comp []
  [:div
   [::child-comp]])
```

### Cross-Namespace

Use a fully qualified keyword:

```clojure
(ns my.page
  (:require [my.widgets :as w]))

(defc my-page []
  [:div
   [:my.widgets/fancy-button {:label "Click me"}]])
```

## Nesting Components

Components nest naturally via hiccup:

```clojure
(defc page-header []
  [:header [:h1 "My App"]])

(defc page-footer []
  [:footer [:p "2024 My App"]])

(defc app-shell []
  [:div
   [::page-header]
   [:main [:p "Content goes here"]]
   [::page-footer]])
```

## Mounting

Use `mount` to render a component tree into a DOM container:

```clojure
(ns my.app
  (:require [su.core :as su]))

(su/mount (js/document.getElementById "app")
          [::my-app])
```

`mount` takes two arguments:

1. A DOM element (the container)
2. A hiccup vector referencing the root component

## No Props Component Shorthand

When a component has no props, the empty vector `[]` is still required:

```clojure
(defc simple-widget []
  [:div "No props needed"])
```

## Summary

| Concept            | Description                                      |
|--------------------|--------------------------------------------------|
| `defc`             | Define a Custom Element with Shadow DOM           |
| Props              | Declared in `{:props {...}}`, destructured        |
| Prop types         | `"string"`, `"number"`, `"boolean"`, `:atom`      |
| Component function | Runs once (setup phase)                           |
| Auto-wrap          | Final hiccup is auto-wrapped for reactive updates  |
| Form-2             | Explicit `fn` return for advanced setup patterns   |
| `::name`           | Reference component in same namespace             |
| `mount`            | Render component tree into a DOM container        |
