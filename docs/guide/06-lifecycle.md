# 6. Lifecycle

su provides two lifecycle hooks: `on-mount` and `on-unmount`. These run after
the component is added to or removed from the DOM.

## on-mount

Runs once after the component is mounted to the DOM:

```clojure
(defc my-widget []
  (su/on-mount
    (fn []
      (js/console.log "Widget mounted!")))
  [:div "Hello"])
```

Use `on-mount` for:

- Fetching data
- Setting up timers or subscriptions
- Measuring DOM elements
- Integrating with third-party libraries

## on-unmount

Runs once when the component is removed from the DOM:

```clojure
(defc my-widget []
  (su/on-unmount
    (fn []
      (js/console.log "Widget unmounted!")))
  [:div "Hello"])
```

Use `on-unmount` for:

- Clearing timers (`clearInterval`, `clearTimeout`)
- Removing event listeners
- Cleaning up subscriptions
- Releasing resources

## Timer Example

A common pattern — set up an interval on mount, clean it up on unmount:

```clojure
(defc live-clock []
  (let [time (atom (js/Date.) "time")]
    ;; Start interval on mount
    (su/on-mount
      (fn []
        (let [id (js/setInterval
                   (fn [] (reset! time (js/Date.)))
                   1000)]
          ;; Clean up on unmount
          (su/on-unmount
            (fn [] (js/clearInterval id))))))

    (fn []
      [:div (.toLocaleTimeString @time)])))
```

## Fetch on Mount

```clojure
(defc user-profile
  {:props {:user-id "number"}}
  [{:keys [user-id]}]
  (let [user (atom nil "user")]
    (su/on-mount
      (fn []
        (-> (js/fetch (str "/api/users/" user-id))
            (.then (fn [res] (.json res)))
            (.then (fn [data] (reset! user (js->clj data)))))))

    (fn []
      (if @user
        [:div
          [:h2 (:name @user)]
          [:p (:email @user)]]
        [:p "Loading..."]))))
```

## Constraints

Lifecycle hooks must be called during component setup (the outer function),
**not** inside the reactive render function:

```clojure
;; WRONG — called inside render function
(defc broken []
  (fn []
    (su/on-mount (fn [] ...))  ;; ERROR: outside lifecycle context
    [:div "oops"]))

;; RIGHT — called during setup
(defc correct []
  (su/on-mount (fn [] ...))    ;; setup phase
  (fn []
    [:div "works"]))
```

Multiple hooks of the same type are allowed. They execute in the order they
were registered:

```clojure
(defc multi-hook []
  (su/on-mount (fn [] (js/console.log "First")))
  (su/on-mount (fn [] (js/console.log "Second")))
  [:div "Multiple hooks"])
```

## Summary

| Hook           | When It Runs              | Use Cases                    |
|----------------|---------------------------|------------------------------|
| `su/on-mount`  | After DOM mount           | Fetch, timers, DOM access    |
| `su/on-unmount`| Before DOM removal        | Cleanup timers, listeners    |
