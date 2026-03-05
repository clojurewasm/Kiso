# 5. State Management

su provides two mechanisms for sharing state between components: the **Context
API** and **Props Channeling**. This guide covers when and how to use each.

## Where State Should Live

Follow this rule of thumb:

| Scope                    | Approach                        |
|--------------------------|---------------------------------|
| Single component         | Local atom in the component     |
| Parent → child           | Props (string/number/boolean)   |
| Parent → child (rich)    | Props Channeling (`:atom`)      |
| Distant ancestor → child | Context API                     |

State should live as close as possible to where it's used. Only lift state up
when multiple components need it.

## Local State

Create atoms in the component's setup phase:

```clojure
(defc search-input []
  (let [query (atom "" "query")]
    [:input {:value @query
             :on-input (fn [e]
                         (reset! query (.-value (.-target e))))}]))
```

The atom is private to this component. No other component can access it.

## Context API

The Context API shares state across the component tree, even across Shadow DOM
boundaries.

### Providing Context

Call `su/provide` during component setup:

```clojure
(defc app-root []
  (let [theme (atom :light "theme")
        user  (atom nil "user")]
    ;; Provide to all descendants
    (su/provide :theme theme)
    (su/provide :user user)

    [:div
      [::nav-bar]
      [::main-content]]))
```

### Consuming Context

Call `su/use-context` during component setup:

```clojure
(defc nav-bar []
  (let [theme (su/use-context :theme)
        user  (su/use-context :user)]
    [:nav {:style {:background (if (= @theme :dark) "#1e293b" "#fff")}}
      [:span (str "Hello, " (or (:name @user) "Guest"))]]))
```

### How It Works

Context uses DOM event bubbling:

1. `provide` attaches a listener on the host element for `"su-context-request"` events
2. `use-context` dispatches a `CustomEvent` from the consumer element
3. The event bubbles up through the DOM (including across Shadow DOM via `composed: true`)
4. The nearest matching provider responds with the value

This means:

- Nested providers work — the closest ancestor wins
- Context crosses Shadow DOM boundaries automatically
- No explicit wiring needed between provider and consumer

### Context Keys

Any value can be used as a context key. Keywords are conventional:

```clojure
(su/provide :theme theme-atom)
(su/provide :auth auth-atom)
(su/provide :i18n translations)
```

## Props Channeling

Props Channeling passes JavaScript values (atoms, objects, collections) as
component properties, bypassing HTML attribute serialization.

### Defining Atom Props

Declare the prop type as `:atom`:

```clojure
(defc task-list
  {:props {:tasks :atom}}
  [{:keys [tasks]}]
  [:ul
    (map (fn [t] [:li (:text t)]) @tasks)])
```

### Passing Atom Props

Pass the atom directly in hiccup:

```clojure
(defc app []
  (let [tasks (atom [{:text "Buy milk"} {:text "Write docs"}])]
    [:div
      [::task-list {:tasks tasks}]]))
```

The `tasks` atom is set as a JavaScript property on the Custom Element, not
as an HTML attribute. The component receives the actual atom object.

## Context vs Props Channeling

| Feature          | Context API                | Props Channeling         |
|------------------|----------------------------|--------------------------|
| Scope            | Any descendant             | Direct child only        |
| Shadow DOM       | Crosses automatically      | Crosses automatically    |
| Coupling         | Loose (key-based lookup)   | Tight (explicit prop)    |
| Use case         | App-wide state, themes     | Parent-child data flow   |
| Setup            | `provide` + `use-context`  | `:atom` prop type        |

**Use Context** when:
- State is used by many components at different tree depths
- You want to avoid prop-drilling through intermediate components
- The state is "global" in nature (theme, auth, locale)

**Use Props Channeling** when:
- A parent directly renders a child and wants to share an atom
- The relationship is clear and explicit
- You want to see the data flow in the component tree

## Architecture Example

The task-manager app demonstrates both patterns:

```
task-app (root)
│
│  Owns: tasks, next-id, filter-mode atoms
│  Provides via Context: :tasks, :next-id, :filter-mode
│
├── stat-card ×3          (props: label, count, color)
├── task-input            (context: :tasks, :next-id)
├── filter-bar            (context: :filter-mode)
└── task-list             (props channeling: tasks atom)
    │                     (context: :filter-mode)
    └── task-item ×N      (props: task-id, text, done)
                          (context: :tasks)
```

The root component owns all state and provides it via Context. Most children
use Context to access what they need. `task-list` receives the tasks atom
via Props Channeling because it's a direct child that needs the atom reference.

## Mutating Shared State

Helper functions that mutate atoms work regardless of how the atom was shared:

```clojure
(defn add-task! [tasks next-id text]
  (when (not= text "")
    (let [id (swap! next-id inc)]
      (swap! tasks conj {:id id :text text :done false}))))

(defn toggle-task! [tasks id]
  (swap! tasks
    (fn [ts]
      (map (fn [t]
             (if (= (:id t) id)
               (assoc t :done (not (:done t)))
               t))
           ts))))
```

Components call these helpers with the atoms they received from Context or
Props Channeling:

```clojure
(defc task-input []
  (let [tasks   (su/use-context :tasks)
        next-id (su/use-context :next-id)]
    [:button {:on-click (fn [_] (add-task! tasks next-id "New task"))}
      "Add"]))
```

## Summary

| Concept           | Description                                          |
|-------------------|------------------------------------------------------|
| Local atom        | Private state inside one component                   |
| `su/provide`      | Share a value with all descendants                   |
| `su/use-context`  | Retrieve a provided value from an ancestor           |
| Props Channeling  | Pass atoms as JS properties via `:atom` prop type    |
| State ownership   | Root component owns, descendants consume             |
