(ns calculator.core
  (:require [su.core :as su :refer [defc defstyle]]))

;; -- State machine for calculator --

(defn initial-state []
  {:display "0" :acc nil :op nil :fresh true})

(defn apply-op [op a b]
  (case op
    "+" (+ a b)
    "-" (- a b)
    "*" (* a b)
    "/" (if (zero? b) "Error" (/ a b))
    b))

(defn press-digit [state d]
  (let [display (:display state)]
    (if (:fresh state)
      (assoc state :display d :fresh false)
      (assoc state :display (if (= display "0") d (str display d))))))

(defn press-op [state op]
  (let [display (js/parseFloat (:display state))
        acc (:acc state)
        prev-op (:op state)
        result (if (and acc prev-op)
                 (apply-op prev-op acc display)
                 display)]
    {:display (str result) :acc result :op op :fresh true}))

(defn press-equals [state]
  (let [display (js/parseFloat (:display state))
        acc (:acc state)
        op (:op state)
        result (if (and acc op)
                 (apply-op op acc display)
                 display)]
    {:display (str result) :acc nil :op nil :fresh true}))

(defn press-clear [_state]
  (initial-state))

;; -- Styles --

(defstyle calc-styles
  [:host {:display "block"
          :font-family "'Inter', system-ui, sans-serif"}]
  [:.calc {:max-width "280px"
           :margin "0 auto"
           :background "#1e293b"
           :border-radius "16px"
           :padding "20px"
           :box-shadow "0 8px 32px rgba(0,0,0,0.2)"}]
  [:.display {:background "#0f172a"
              :color "#f8fafc"
              :font-size "32px"
              :text-align "right"
              :padding "16px"
              :border-radius "8px"
              :margin-bottom "16px"
              :overflow "hidden"
              :min-height "56px"
              :font-weight "300"}]
  [:.grid {:display "grid"
           :grid-template-columns "repeat(4, 1fr)"
           :gap "8px"}]
  [:.btn {:padding "14px 0"
          :font-size "18px"
          :font-weight "500"
          :border "none"
          :border-radius "8px"
          :cursor "pointer"
          :background "#334155"
          :color "#f8fafc"
          :transition "background 0.1s"}
   [:&:hover {:background "#475569"}]]
  [:.btn-op {:background "#6366f1"}
   [:&:hover {:background "#4f46e5"}]]
  [:.btn-eq {:background "#22c55e"}
   [:&:hover {:background "#16a34a"}]]
  [:.btn-clear {:background "#ef4444"
                :grid-column "span 2"}
   [:&:hover {:background "#dc2626"}]])

;; -- Component --

(defc calc-app
  {:style [calc-styles]}
  []
  (let [state (atom (initial-state))]
    [:div {:class "calc"}
     [:div {:class "display"} (fn [] (:display @state))]
     [:div {:class "grid"}
      (map (fn [d]
             [:button {:class "btn"
                       :on-click (fn [_] (swap! state press-digit d))}
              d])
           ["7" "8" "9"])
      [:button {:class "btn btn-op" :on-click (fn [_] (swap! state press-op "/"))} "\u00F7"]
      (map (fn [d]
             [:button {:class "btn"
                       :on-click (fn [_] (swap! state press-digit d))}
              d])
           ["4" "5" "6"])
      [:button {:class "btn btn-op" :on-click (fn [_] (swap! state press-op "*"))} "\u00D7"]
      (map (fn [d]
             [:button {:class "btn"
                       :on-click (fn [_] (swap! state press-digit d))}
              d])
           ["1" "2" "3"])
      [:button {:class "btn btn-op" :on-click (fn [_] (swap! state press-op "-"))} "\u2212"]
      [:button {:class "btn" :on-click (fn [_] (swap! state press-digit "0"))} "0"]
      [:button {:class "btn" :on-click (fn [_] (swap! state press-digit "."))} "."]
      [:button {:class "btn btn-eq" :on-click (fn [_] (swap! state press-equals))} "="]
      [:button {:class "btn btn-op" :on-click (fn [_] (swap! state press-op "+"))} "+"]
      [:button {:class "btn btn-clear" :on-click (fn [_] (swap! state press-clear))} "C"]]]))

(su/mount (js/document.getElementById "app") [::calc-app])
