(ns showcase.samples.counter
  (:require [su.core :as su :refer [defc defstyle]]))

(defstyle counter-styles
  [:host {:display "block"
          :font-family "'Inter', system-ui, sans-serif"
          :color "#e2e8f0"}]
  [:.wrap {:text-align "center" :padding "40px"}]
  [:.count {:font-size "72px"
            :font-weight "700"
            :color "#818cf8"
            :margin "16px 0"}]
  [:.buttons {:display "flex"
              :gap "12px"
              :justify-content "center"}]
  [:.btn {:padding "10px 24px"
          :font-size "18px"
          :font-weight "600"
          :border "none"
          :border-radius "8px"
          :cursor "pointer"
          :background "#6366f1"
          :color "#fff"
          :transition "background 0.15s"}])

(defc sample-counter
  {:style [counter-styles]}
  []
  (let [n (atom 0)]
    [:div {:class "wrap"}
     [:div "Click the buttons to change the count:"]
     [:div {:class "count"} (str @n)]
     [:div {:class "buttons"}
      [:button {:class "btn" :on-click (fn [_] (swap! n dec))} "-"]
      [:button {:class "btn" :on-click (fn [_] (swap! n inc))} "+"]]]))

(defn mount! [container]
  (su/mount container [::sample-counter]))
