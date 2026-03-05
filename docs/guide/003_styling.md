# 2. Styling

su uses Shadow DOM for style encapsulation. Each component's styles are
completely isolated — they don't leak out, and external styles don't leak in.

## Defining Styles with `defstyle`

Use `defstyle` to create a scoped stylesheet:

```clojure
(defstyle my-button
  [:button {:padding "8px 16px"
            :border "none"
            :border-radius "6px"
            :background "#6366f1"
            :color "#fff"
            :cursor "pointer"}]
  [":button:hover" {:background "#4f46e5"}])
```

The syntax is Garden-style CSS-as-data:

```clojure
[selector {property value, ...}]
```

### Linking Styles to Components

Pass the stylesheet to `defc` via the `:style` option:

```clojure
(defstyle my-card-styles
  [:.card {:padding "16px" :border-radius "8px"}])

(defc my-card
  {:style [my-card-styles]}
  []
  [:div {:class "card"}
    "Card content"])
```

The `:style` vector can include multiple stylesheets:

```clojure
(defc my-widget
  {:style [base-styles theme-styles widget-styles]}
  []
  [:div "Styled widget"])
```

## Selector Syntax

| Selector                | CSS Output                   | Description               |
|-------------------------|------------------------------|---------------------------|
| `[:button {...}]`       | `button { ... }`             | Element selector          |
| `[:.card {...}]`        | `.card { ... }`              | Class selector            |
| `["#app" {...}]`        | `#app { ... }`               | ID selector               |
| `[:host {...}]`         | `:host { ... }`              | Component host element    |
| `[":host(.active)" {...}]` | `:host(.active) { ... }` | Host with condition       |
| `["::slotted(p)" {...}]`  | `::slotted(p) { ... }`   | Slotted content           |

### Host Selector

`:host` styles the Custom Element itself (the outer wrapper):

```clojure
(defstyle my-widget
  [:host {:display "block"
          :padding "16px"
          :border "1px solid #e5e7eb"}]
  [:.content {:font-size "14px"}])
```

Use `:host` for layout properties (`display`, `margin`, `width`) that affect
how the component sits in its parent.

## Property Syntax

CSS properties use kebab-case strings as keys:

```clojure
[:.card {:padding "16px"
         :background-color "#fff"
         :border-radius "12px"
         :box-shadow "0 1px 3px rgba(0,0,0,0.1)"
         :font-size "14px"}]
```

## Theming with CSS Custom Properties

CSS custom properties (variables) **penetrate** Shadow DOM boundaries. Use
them for theming:

```clojure
;; Component uses custom properties with fallbacks
(defstyle themed-button
  [:button {:background "var(--btn-bg, #6366f1)"
            :color "var(--btn-color, #fff)"
            :padding "var(--btn-padding, 8px 16px)"}])
```

Set the properties from the host page or a parent component:

```html
<!-- In host page CSS -->
<style>
  themed-button {
    --btn-bg: #10b981;
    --btn-color: #fff;
  }
</style>
```

Or from a parent component's defstyle:

```clojure
(defstyle my-app
  ;; Theme child components via custom properties
  ["themed-button" {:--btn-bg "#10b981"
                    :--btn-color "#fff"}])
```

## External Styling with `::part`

Expose internal elements for external styling using the `part` attribute:

```clojure
;; Component exposes a "btn" part
(defc styled-button []
  [:button {:part "btn"} "Click me"])
```

The host page can now style it:

```css
styled-button::part(btn) {
  background: red;
  font-size: 18px;
}
```

## Dynamic Styles

For styles that change based on state, use inline `:style` maps in hiccup:

```clojure
(defc status-badge
  {:props {:status "string"}}
  [{:keys [status]}]
  [:span {:class "badge"
          :style {:background (case status
                                "active" "#10b981"
                                "inactive" "#94a3b8"
                                "#6366f1")
                  :color "#fff"
                  :padding "4px 12px"
                  :border-radius "12px"}}
    status])
```

Use `defstyle` for static styles and inline `:style` for dynamic values.

### Global Styles

Use `global-style!` to apply a stylesheet to the document (outside Shadow DOM):

```clojure
(defstyle reset-styles
  [:body {:margin "0" :font-family "sans-serif"}])

(su/global-style! reset-styles)
```

## Complete Example

```clojure
(defstyle stat-card-styles
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
  {:props {:label "string" :count "number" :color "string"}
   :style [stat-card-styles]}
  [{:keys [label count color]}]
  [:div {:class "card"
         :style {:border-top (str "3px solid " (or color "#6366f1"))}}
    [:div {:class "count"
           :style {:color (or color "#6366f1")}}
      (str count)]
    [:div {:class "label"} label]])
```

## Summary

| Concept                  | Description                                   |
|--------------------------|-----------------------------------------------|
| `defstyle`               | Define scoped CSS (Garden-style syntax)       |
| `:style [...]`           | Pass stylesheets to `defc` explicitly         |
| `global-style!`          | Apply stylesheet to document (outside Shadow) |
| `:host`                  | Style the component's outer element           |
| CSS custom properties    | Penetrate Shadow DOM for theming              |
| `::part`                 | Expose internals for external styling         |
| Inline `:style`          | Dynamic styles in hiccup                      |
