# Patterns

Common recipes for su applications.

## Conditional Rendering

Use `when` for optional elements and `if` for alternatives:

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

`nil` values are skipped in hiccup, so `when` works naturally.

## List Rendering

Use `map` to render collections:

```clojure
(fn []
  [:ul
    (map (fn [item]
           [:li {:key (:id item)} (:name item)])
         @items)])
```

### Rendering Components from a List

```clojure
(fn []
  [:div
    (map (fn [user]
           [::user-card {:name (:name user)
                         :email (:email user)}])
         @users)])
```

## Two-Way Input Binding

Bind an input to an atom:

```clojure
(defc text-input []
  (let [value (atom "" "value")]
    [:div
      [:input {:placeholder "Type here..."
               :on-input (fn [e]
                           (reset! value (.-value (.-target e))))}]
      (fn [] [:p "You typed: " @value])]))
```

### Checkbox Binding

```clojure
(defc toggle-switch []
  (let [checked (atom false "checked")]
    [:div
      [:input {:type "checkbox"
               :on-click (fn [_] (swap! checked not))}]
      (fn []
        [:span (if @checked "ON" "OFF")])]))
```

## Timer with Cleanup

Set up a timer on mount and clean it up on unmount:

```clojure
(defc countdown-timer []
  (let [seconds (atom 60 "seconds")]
    (su/on-mount
      (fn []
        (let [id (js/setInterval
                   (fn []
                     (swap! seconds (fn [s] (max 0 (dec s)))))
                   1000)]
          (su/on-unmount
            (fn [] (js/clearInterval id))))))

    (fn []
      [:div
        [:span (str @seconds " seconds remaining")]
        (when (= 0 @seconds)
          [:p "Time's up!"])])))
```

## Fetch Data on Mount

Load data from an API when the component mounts:

```clojure
(defc user-list []
  (let [users (atom nil "users")
        error (atom nil "error")]
    (su/on-mount
      (fn []
        (-> (js/fetch "/api/users")
            (.then (fn [res]
                     (if (.-ok res)
                       (.json res)
                       (throw (js/Error. "Failed to fetch")))))
            (.then (fn [data]
                     (reset! users (js->clj data :keywordize-keys true))))
            (.catch (fn [err]
                      (reset! error (.-message err)))))))

    (fn []
      (cond
        @error [:p {:style {:color "red"}} (str "Error: " @error)]
        (nil? @users) [:p "Loading..."]
        :else [:ul
                (map (fn [u] [:li (:name u)]) @users)]))))
```

## Context for Theming

Share a theme across the component tree:

```clojure
;; Root component provides theme
(defc themed-app []
  (let [theme (atom :light "theme")]
    (su/provide :theme theme)
    [:div
      [:button {:on-click (fn [_]
                            (swap! theme
                              (fn [t] (if (= t :light) :dark :light))))}
        "Toggle Theme"]
      [::themed-content]]))

;; Any descendant consumes it
(defc themed-content []
  (let [theme (su/use-context :theme)]
    (fn []
      [:div {:style {:background (if (= @theme :dark) "#1e293b" "#fff")
                     :color (if (= @theme :dark) "#f1f5f9" "#1e293b")
                     :padding "20px"}}
        "Themed content"])))
```

## Dynamic Styles

Compute styles from state:

```clojure
(defc progress-bar
  {:props {:percent "number"}}
  [{:keys [percent]}]
  [:div {:style {:width "100%"
                 :height "8px"
                 :background "#e5e7eb"
                 :border-radius "4px"
                 :overflow "hidden"}}
    [:div {:style {:width (str percent "%")
                   :height "100%"
                   :background (cond
                                 (< percent 30) "#ef4444"
                                 (< percent 70) "#f59e0b"
                                 :else "#10b981")
                   :transition "width 0.3s ease"}}]])
```

## Debounced Input

Debounce user input before processing:

```clojure
(defc search-box []
  (let [query (atom "" "query")
        debounced (atom "" "debounced")]
    (su/on-mount
      (fn []
        (let [timer (atom nil)]
          (su/effect
            (fn []
              (let [q @query]
                (when @timer (js/clearTimeout @timer))
                (reset! timer
                  (js/setTimeout
                    (fn [] (reset! debounced q))
                    300))))))))

    [:div
      [:input {:placeholder "Search..."
               :on-input (fn [e]
                           (reset! query (.-value (.-target e))))}]
      (fn [] [:p "Searching for: " @debounced])]))
```

## Multiple Contexts

Provide multiple values from the root:

```clojure
(defc app-root []
  (let [auth   (atom {:user nil :token nil} "auth")
        theme  (atom :light "theme")
        locale (atom :en "locale")]
    (su/provide :auth auth)
    (su/provide :theme theme)
    (su/provide :locale locale)
    [:div [::app-shell]]))
```

Descendants pick only what they need:

```clojure
(defc user-menu []
  (let [auth (su/use-context :auth)]
    (fn []
      (if (:user @auth)
        [:span (str "Hello, " (:name (:user @auth)))]
        [:a {:href "/login"} "Log in"]))))

(defc language-picker []
  (let [locale (su/use-context :locale)]
    (fn []
      [:select {:on-change (fn [e]
                             (reset! locale
                               (keyword (.-value (.-target e)))))}
        [:option {:value "en"} "English"]
        [:option {:value "ja"} "Japanese"]])))
```

## Component Composition

Build complex UIs by nesting components:

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

## Computed Values

Derive values from atoms without redundant state:

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
