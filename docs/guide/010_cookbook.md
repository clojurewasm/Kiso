# Cookbook

Practical examples and common patterns for su applications.

## Counter

A minimal counter app — the "hello world" of su.

```clojure
(ns counter.core
  (:require [su.core :as su :refer [defc defstyle]]))

(defstyle counter-styles
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

(defc my-counter
  {:style [counter-styles]}
  []
  (let [count (atom 0)]
    (fn []
      [:div {:class "counter"}
       [:button {:on-click (fn [_] (swap! count dec))} "-"]
       [:span (str @count)]
       [:button {:on-click (fn [_] (swap! count inc))} "+"]])))

(su/mount (js/document.getElementById "app")
          [::my-counter])
```

### How It Works

1. **`defstyle`** creates a scoped stylesheet — styles stay inside the Shadow DOM
2. **`defc`** defines a Custom Element. The outer `let` runs once (setup), the inner `fn` is the render function
3. **`(atom 0)`** creates reactive state. Dereferencing `@count` inside the render fn auto-subscribes
4. **`(swap! count inc)`** triggers a re-render of the reactive part

> su components follow the Solid.js model: the component function runs once,
> only the returned render function re-runs.

### Exercises

1. Add a "Reset" button: `(reset! count 0)`
2. Add an `initial` prop: `(defc my-counter [{:keys [initial]}] ...)`
3. Display "Even" or "Odd" below the counter

---

## Todo App

A full task manager showing state management, Context API, Props Channeling,
and component composition.

Source: [`examples/task-manager/src/main.cljs`](../../examples/task-manager/src/main.cljs)

### Component Tree

```
task-app (root)
├── stat-card ×3        (total, active, done)
├── task-input          (text input + add button)
├── filter-bar          (all / active / done)
└── task-list
    └── task-item ×N    (checkbox + text + delete)
```

### Data Flow

```
task-app
│  owns: tasks (atom), next-id (atom), filter-mode (atom)
│  provides via Context: :tasks, :next-id, :filter-mode
│
├── stat-card           receives: label, count, color (props)
├── task-input          reads context: :tasks, :next-id
├── filter-bar          reads context: :filter-mode
└── task-list           receives: tasks (Props Channeling)
    └── task-item       receives: task-id, text, done (props)
                        reads context: :tasks
```

### Root Component (owns state, provides context)

```clojure
(defc task-app
  {:style [task-app-styles]}
  []
  (let [tasks       (atom [] "tasks")
        next-id     (atom 0 "next-id")
        filter-mode (atom :all "filter-mode")]
    (su/provide :tasks tasks)
    (su/provide :next-id next-id)
    (su/provide :filter-mode filter-mode)
    [:div {:class "container"}
      [:div {:class "header"}
        [:h1 "Task Manager"]]
      [:div {:class "body"}
        [::task-input]
        [::filter-bar]
        [::task-list {:tasks tasks}]]]))
```

Key patterns:
- Labeled atoms (`"tasks"`) for DevTools visibility
- `su/provide` shares state with descendants
- Props Channeling (`{:tasks tasks}`) passes atom directly

### Context Consumer

```clojure
(defc task-item
  {:props {:task-id "number" :text "string" :done "boolean"}
   :style [task-item-styles]}
  [{:keys [task-id text done]}]
  (let [tasks (su/use-context :tasks)]
    [:div {:class "row"}
      [:input {:type "checkbox"
               :on-click (fn [_] (toggle-task! tasks task-id))}]
      [:span {:style {:text-decoration (if done "line-through" "none")}}
        text]
      [:button {:on-click (fn [_] (remove-task! tasks task-id))}
        "\u00D7"]]))
```

Display data via props, mutation via Context.

### Reactive Context Consumer

```clojure
(defc filter-bar
  {:style [filter-bar-styles]}
  []
  (let [filter-mode (su/use-context :filter-mode)]
    (fn []
      (let [mode @filter-mode]
        [:div {:class "filters"}
          (map (fn [m]
                 [:button {:style {:background (if (= mode m) "#6366f1" "#fff")}
                           :on-click (fn [_] (reset! filter-mode m))}
                  (name m)])
               [:all :active :done])]))))
```

Returns `(fn [] ...)` — `@filter-mode` inside triggers re-render on change.

---

## Common Patterns

### Conditional Rendering

```clojure
;; Show element conditionally
(fn []
  [:div
    (when @show-details
      [:p "Extra details here"])])

;; Show one or the other
(fn []
  [:div
    (if @logged-in
      [:span "Welcome back!"]
      [:a {:href "/login"} "Log in"])])
```

`nil` is skipped in hiccup, so `when` works naturally.

### List Rendering

```clojure
(fn []
  [:ul
    (map (fn [item]
           [:li {:key (:id item)} (:name item)])
         @items)])
```

### Two-Way Input Binding

```clojure
(defc text-input []
  (let [value (atom "" "value")]
    [:div
      [:input {:placeholder "Type here..."
               :on-input (fn [e]
                           (reset! value (.-value (.-target e))))}]
      (fn [] [:p "You typed: " @value])]))
```

### Timer with Cleanup

```clojure
(defc countdown-timer []
  (let [seconds (atom 60 "seconds")]
    (su/on-mount
      (fn []
        (let [id (js/setInterval
                   (fn [] (swap! seconds (fn [s] (max 0 (dec s)))))
                   1000)]
          (su/on-unmount
            (fn [] (js/clearInterval id))))))
    (fn []
      [:div
        [:span (str @seconds " seconds remaining")]
        (when (= 0 @seconds)
          [:p "Time's up!"])])))
```

### Fetch Data on Mount

```clojure
(defc user-list []
  (let [users (atom nil "users")
        error (atom nil "error")]
    (su/on-mount
      (fn []
        (-> (js/fetch "/api/users")
            (.then (fn [res] (.json res)))
            (.then (fn [data]
                     (reset! users (js->clj data :keywordize-keys true))))
            (.catch (fn [err]
                      (reset! error (.-message err)))))))
    (fn []
      (cond
        @error [:p {:style {:color "red"}} (str "Error: " @error)]
        (nil? @users) [:p "Loading..."]
        :else [:ul (map (fn [u] [:li (:name u)]) @users)]))))
```

### Context for Theming

```clojure
;; Root provides theme
(defc themed-app []
  (let [theme (atom :light "theme")]
    (su/provide :theme theme)
    [:div
      [:button {:on-click (fn [_]
                            (swap! theme
                              (fn [t] (if (= t :light) :dark :light))))}
        "Toggle Theme"]
      [::themed-content]]))

;; Descendant consumes it
(defc themed-content []
  (let [theme (su/use-context :theme)]
    (fn []
      [:div {:style {:background (if (= @theme :dark) "#1e293b" "#fff")
                     :color (if (= @theme :dark) "#f1f5f9" "#1e293b")
                     :padding "20px"}}
        "Themed content"])))
```

### Computed Values

```clojure
(defc shopping-cart []
  (let [items (atom [{:name "Widget" :price 9.99 :qty 2}
                     {:name "Gadget" :price 24.99 :qty 1}]
                "cart-items")
        total (su/computed
                (fn []
                  (reduce (fn [sum item]
                            (+ sum (* (:price item) (:qty item))))
                          0
                          @items)))]
    (fn []
      [:div
        [:ul
          (map (fn [item]
                 [:li (str (:name item) " x" (:qty item))])
               @items)]
        [:p {:style {:font-weight "bold"}}
          (str "Total: $" (.toFixed (.deref total) 2))]])))
```

### Component Composition with Slots

```clojure
(defc card
  {:props {:title "string"}}
  [{:keys [title]}]
  [:div {:class "card"}
    [:h3 title]
    [:slot]])   ;; slot for projected content

(defc dashboard []
  [:div {:class "grid"}
    [::card {:title "Revenue"}
      [:p "$12,345"]]
    [::card {:title "Users"}
      [:p "1,234"]]])
```
