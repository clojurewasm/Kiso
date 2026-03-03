(ns hello-counter.core)

(def message "Hello from Kiso!")

(defn greet [name]
  (str "Hello, " name "!"))

(js/console.log message)
(js/console.log (greet "World"))

;; DOM manipulation
(let [app (js/document.getElementById "app")
      heading (js/document.createElement "h1")
      counter-display (js/document.createElement "p")
      btn-inc (js/document.createElement "button")
      btn-dec (js/document.createElement "button")
      state (atom 0)]

  (set! (.-textContent heading) message)
  (set! (.-textContent counter-display) (str "Count: " @state))
  (set! (.-textContent btn-inc) "+")
  (set! (.-textContent btn-dec) "-")

  (.addEventListener btn-inc "click"
                     (fn [_e]
                       (swap! state inc)
                       (set! (.-textContent counter-display) (str "Count: " @state))))

  (.addEventListener btn-dec "click"
                     (fn [_e]
                       (swap! state dec)
                       (set! (.-textContent counter-display) (str "Count: " @state))))

  (.appendChild app heading)
  (.appendChild app counter-display)
  (.appendChild app btn-inc)
  (.appendChild app btn-dec))
