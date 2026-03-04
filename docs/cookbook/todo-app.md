# Todo App

An annotated walkthrough of the task-manager example application. This app
demonstrates state management, Context API, Props Channeling, reactive
rendering, and component composition.

Source: [`examples/task-manager/src/main.cljs`](../../examples/task-manager/src/main.cljs)

## Component Tree

```
task-app (root)
├── stat-card ×3        (total, active, done)
├── task-input          (text input + add button)
├── filter-bar          (all / active / done)
└── task-list
    └── task-item ×N    (checkbox + text + delete)
```

## Data Flow

```
task-app
│  owns: tasks (atom), next-id (atom), filter-mode (atom)
│  provides via Context: :tasks, :next-id, :filter-mode
│
├── stat-card           receives: label, count, color (props)
│                       reads: nothing from context
│
├── task-input          reads context: :tasks, :next-id
│                       local state: input-text (atom)
│
├── filter-bar          reads context: :filter-mode
│
└── task-list           receives: tasks (Props Channeling)
    │                   reads context: :filter-mode
    │
    └── task-item       receives: task-id, text, done (props)
                        reads context: :tasks
```

## Project Setup

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
  <title>Kiso Task Manager</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #f1f5f9; min-height: 100vh; padding: 40px 16px; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.cljs"></script>
</body>
</html>
```

Note: the `.cljs` file is imported directly. Vite handles compilation.

## Namespace and DevTools

```clojure
(ns task-manager.core
  (:require [su.core :as su :refer [defc defstyle]]))

(su/enable-trace)
```

`enable-trace` logs all atom state changes to the console, making it easy
to follow data flow during development.

## Helper Functions

Pure functions that mutate atoms. They are defined at the namespace level
so any component can call them:

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

(defn remove-task! [tasks id]
  (swap! tasks
    (fn [ts]
      (filter (fn [t] (not= (:id t) id)) ts))))

(defn filtered-tasks [tasks filter-mode]
  (let [mode @filter-mode
        ts @tasks]
    (cond
      (= mode :active) (filter (fn [t] (not (:done t))) ts)
      (= mode :done)   (filter (fn [t] (:done t)) ts)
      :else            ts)))
```

These functions take atoms as arguments — they don't care whether the atom
came from Context or Props Channeling.

## stat-card — Simple Props Component

A presentational component with no state:

```clojure
(defstyle stat-card
  [:host {:display "block"}]
  [:.card {:padding "16px"
           :background "#fff"
           :border-radius "12px"
           :box-shadow "0 1px 3px rgba(0,0,0,0.1)"
           :text-align "center"
           :min-width "100px"}]
  [:.count {:font-size "28px" :font-weight "700"}]
  [:.label {:font-size "13px" :color "#64748b" :margin-top "4px"}])

(defc stat-card
  {:props {:label "string" :count "number" :color "string"}}
  [{:keys [label count color]}]
  [:div {:class "card"
         :style {:border-top (str "3px solid " (or color "#6366f1"))}}
    [:div {:class "count" :style {:color (or color "#6366f1")}}
      (str count)]
    [:div {:class "label"} label]])
```

**Patterns used:**
- `defstyle` + `defc` share the name `stat-card` (auto-linked)
- `:host {:display "block"}` makes the component block-level
- Dynamic inline styles via `:style` map
- Prop defaults with `(or color "#6366f1")`

## task-item — Context Consumer

Each task row uses Context to access the shared `tasks` atom:

```clojure
(defc task-item
  {:props {:task-id "number" :text "string" :done "boolean"}}
  [{:keys [task-id text done]}]
  (let [tasks (su/use-context :tasks)]
    [:div {:class "row"}
      [:input {:type "checkbox"
               :class "checkbox"
               :on-click (fn [_] (toggle-task! tasks task-id))}]
      [:span {:class "text"
              :style {:text-decoration (if done "line-through" "none")
                      :color (if done "#94a3b8" "#1e293b")}}
        text]
      [:button {:class "delete"
                :on-click (fn [_] (remove-task! tasks task-id))}
        "\u00D7"]]))
```

**Patterns used:**
- Display data via props (task-id, text, done)
- Mutation via Context (tasks atom from `use-context`)
- Conditional inline styles for done/active states
- Unicode character `×` for the delete button

## task-input — Context + Local State

Combines Context for shared state with a local atom for the input value:

```clojure
(defc task-input []
  (let [tasks   (su/use-context :tasks)
        next-id (su/use-context :next-id)
        input-text (atom "" "input-text")]
    [:div {:class "row"}
      [:input {:class "text-input"
               :placeholder "Add a new task..."
               :on-input (fn [e]
                           (reset! input-text (.-value (.-target e))))
               :on-keydown (fn [e]
                             (when (= (.-key e) "Enter")
                               (add-task! tasks next-id @input-text)
                               (set! (.-value (.-target e)) "")
                               (reset! input-text "")))}]
      [:button {:class "add-btn"
                :on-click (fn [_]
                            (add-task! tasks next-id @input-text)
                            (reset! input-text ""))}
        "Add"]]))
```

**Patterns used:**
- Two context lookups: `:tasks` and `:next-id`
- Local atom `input-text` with label for DevTools
- Enter key handling via `on-keydown`
- DOM manipulation via `(set! (.-value (.-target e)) "")`

## filter-bar — Reactive Context Consumer

The filter bar must re-render when the filter mode changes. Note the inner
`(fn [] ...)` wrapper:

```clojure
(defc filter-bar []
  (let [filter-mode (su/use-context :filter-mode)]
    (fn []
      (let [mode @filter-mode]
        [:div {:class "filters"}
          (map (fn [m]
                 [:button {:class "btn"
                           :style {:background (if (= mode m) "#6366f1" "#fff")
                                   :color (if (= mode m) "#fff" "#374151")}
                           :on-click (fn [_] (reset! filter-mode m))}
                  (name m)])
               [:all :active :done])]))))
```

**Patterns used:**
- Returns `(fn [] ...)` for reactive rendering
- `@filter-mode` inside the fn triggers re-render on change
- `map` over keywords to generate buttons
- `(name m)` converts keyword to string (`:all` → `"all"`)

## task-list — Props Channeling + Context

Receives the tasks atom via Props Channeling and filter-mode via Context:

```clojure
(defc task-list
  {:props {:tasks :atom}}
  [{:keys [tasks]}]
  (let [filter-mode (su/use-context :filter-mode)]
    (fn []
      (let [ts (filtered-tasks tasks filter-mode)]
        [:div
          (if (= 0 (count ts))
            [:p {:class "empty"} "No tasks yet. Add one above!"]
            (map (fn [t]
                   [::task-item {:task-id (:id t)
                                 :text (:text t)
                                 :done (:done t)}])
                 ts))]))))
```

**Patterns used:**
- `:atom` prop type for Props Channeling
- Context for filter-mode
- `filtered-tasks` helper derefs both atoms inside the reactive fn
- Conditional rendering: empty state vs task list
- `::task-item` references the component in the same namespace

## task-app — Root Component

Owns all state and provides it to descendants:

```clojure
(defc task-app []
  (let [tasks       (atom [] "tasks")
        next-id     (atom 0 "next-id")
        filter-mode (atom :all "filter-mode")]
    (su/provide :tasks tasks)
    (su/provide :next-id next-id)
    (su/provide :filter-mode filter-mode)
    [:div {:class "container"}
      [:div {:class "header"}
        [:h1 {:class "header-title"} "Task Manager"]
        [:p {:class "header-sub"} "Built with Kiso + su framework"]]
      [:div {:class "body"}
        (fn []
          (let [ts @tasks
                total (count ts)
                done-count (count (filter :done ts))
                active (- total done-count)]
            [:div {:class "stats"}
              [::stat-card {:label "Total" :count (str total) :color "#6366f1"}]
              [::stat-card {:label "Active" :count (str active) :color "#f59e0b"}]
              [::stat-card {:label "Done" :count (str done-count) :color "#10b981"}]]))
        [::task-input]
        [::filter-bar]
        [::task-list {:tasks tasks}]]]))
```

**Patterns used:**
- Labeled atoms for DevTools visibility
- Three `su/provide` calls to share state
- Inline `(fn [] ...)` for reactive stat cards (only re-renders the stats)
- Props Channeling for `task-list` (`:tasks tasks`)
- Static components (`task-input`, `filter-bar`) don't need reactive wrappers
  here because they handle their own reactivity internally

## Mounting

```clojure
(su/mount (js/document.getElementById "app")
          [::task-app])
```

## Running

```bash
cd examples/task-manager
npm install
npm run dev
```

Open `http://localhost:5173`.
