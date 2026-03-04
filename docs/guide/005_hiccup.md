# 4. Hiccup

Hiccup is a way to represent HTML using ClojureScript data structures. In su,
hiccup vectors are compiled to DOM nodes.

## Basic Syntax

A hiccup vector has the form:

```clojure
[:tag {:attr "value"} child1 child2 ...]
```

The simplest element:

```clojure
[:div "Hello"]
;; => <div>Hello</div>
```

## Tag Syntax

The tag string supports inline id and class shorthand:

```clojure
[:div#app.main.dark "Content"]
;; => <div id="app" class="main dark">Content</div>
```

| Syntax           | Result                           |
|------------------|----------------------------------|
| `[:div]`         | `<div></div>`                    |
| `[:div#app]`     | `<div id="app"></div>`           |
| `[:div.btn]`     | `<div class="btn"></div>`        |
| `[:div#x.a.b]`   | `<div id="x" class="a b"></div>` |
| `[:.card]`       | `<div class="card"></div>`       |

When the tag name is omitted (e.g., `[:.card]`), it defaults to `div`.

## Attribute Map

The optional second element can be a map of attributes:

```clojure
[:input {:type "text"
         :placeholder "Enter name"
         :class "input-field"
         :id "name-input"}]
```

### Class Attribute

The `:class` attribute merges with classes from the tag string:

```clojure
[:div.base {:class "extra"}]
;; => <div class="base extra"></div>
```

### Style Attribute

Pass a map for inline styles. Keys can be camelCase or kebab-case:

```clojure
[:div {:style {:color "red"
               :font-size "14px"
               :background-color "#f0f0f0"}}
  "Styled text"]
```

### CSS Custom Properties

Set CSS custom properties directly in attributes:

```clojure
[:div {:--su-color "red"
       :--su-size "16px"}
  "Custom properties"]
```

### Part Attribute

The `:part` attribute exposes an element for external styling via `::part`:

```clojure
[:button {:part "btn"} "Click"]
;; The host page can style this with: my-comp::part(btn) { ... }
```

## Event Handling

Event attributes use the `on-` prefix:

```clojure
[:button {:on-click (fn [e] (js/console.log "Clicked!"))}
  "Click me"]
```

Common events:

| Attribute       | DOM Event  |
|-----------------|------------|
| `:on-click`     | `click`    |
| `:on-input`     | `input`    |
| `:on-keydown`   | `keydown`  |
| `:on-keyup`     | `keyup`    |
| `:on-change`    | `change`   |
| `:on-submit`    | `submit`   |
| `:on-mouseover` | `mouseover`|
| `:on-focus`     | `focus`    |
| `:on-blur`      | `blur`     |

The event handler receives the native DOM event object:

```clojure
[:input {:on-input (fn [e]
                     (let [value (.-value (.-target e))]
                       (reset! text value)))}]
```

## Children

Children appear after the tag (and optional attribute map):

```clojure
[:div
  [:h1 "Title"]
  [:p "Paragraph 1"]
  [:p "Paragraph 2"]]
```

### Child Types

| Type     | Behavior                                    |
|----------|---------------------------------------------|
| String   | Rendered as text node                       |
| Number   | Coerced to string, rendered as text node    |
| `nil`    | Skipped (useful for conditional rendering)  |
| Vector   | Rendered as nested hiccup element           |
| Function | Wrapped in `bind()` for reactive rendering  |
| Sequence | Flattened (from `map`, `for`, etc.)         |

### Conditional Rendering

Use `when` or `if` — `nil` values are simply skipped:

```clojure
[:div
  (when show-header [:h1 "Header"])
  [:p "Always visible"]]
```

```clojure
[:div
  (if logged-in
    [:span "Welcome back!"]
    [:a {:href "/login"} "Log in"])]
```

### List Rendering

Use `map` to render a sequence of elements:

```clojure
[:ul
  (map (fn [item]
         [:li (:text item)])
       items)]
```

### Reactive Children

Within hiccup, wrap children in a function to make them individually reactive:

```clojure
(let [count (atom 0)]
  [:div
    (fn [] [:span (str "Count: " @count)])])
```

The `fn` wrapper creates a reactive binding that re-renders only that child
when the atom changes. This is useful for fine-grained updates within a larger
static structure.

```clojure
;; Static child — evaluated once:
[:span (str "Count: " @count)]

;; Reactive child — re-renders on change:
(fn [] [:span (str "Count: " @count)])
```

> **Note**: `defc` automatically wraps the component's final expression in a
> reactive function, so you only need explicit `(fn [] ...)` for fine-grained
> reactivity within hiccup children.

See the [Reactivity guide](004_reactivity.md) for more details.

## Component References

Reference other su components using keyword syntax:

```clojure
;; Same namespace — use ::
[::my-button {:label "Click"}]

;; Cross namespace — use full name
[:other.ns/my-widget {:title "Hello"}]
```

When the tag contains a hyphen, su treats it as a Custom Element and sets
non-primitive attribute values as JavaScript properties (instead of HTML
attributes).

## Complete Example

```clojure
(defc todo-item
  {:props {:text "string" :done "boolean"}}
  [{:keys [text done]}]
  [:div.item {:style {:opacity (if done "0.5" "1")}}
    [:input {:type "checkbox"
             :on-click (fn [_] (js/console.log "toggled"))}]
    [:span {:style {:text-decoration
                    (if done "line-through" "none")}}
      text]])
```

## Summary

| Feature              | Syntax                                   |
|----------------------|------------------------------------------|
| Element              | `[:tag "child"]`                         |
| ID + classes         | `[:tag#id.class1.class2]`                |
| Attributes           | `[:tag {:attr "val"}]`                   |
| Inline styles        | `{:style {:color "red"}}`                |
| Events               | `{:on-click (fn [e] ...)}`               |
| Conditional          | `(when cond [:tag])`                     |
| Lists                | `(map (fn [x] [:li x]) items)`           |
| Reactive             | `(fn [] [:span @atom])`                  |
| Component ref        | `[::my-comp {:prop "val"}]`              |
