(ns showcase.sidebar
  (:require [su.core :as su :refer [defc defstyle]]
            [showcase.registry :as reg]))

(defstyle sidebar-styles
  [:host {:display "block" :height "100%"}]
  [:.nav {:height "100%"
          :overflow-y "auto"
          :padding "12px"}]
  [:.category {:margin-bottom "16px"}]
  [:.cat-label {:font-size "11px"
                :font-weight "600"
                :text-transform "uppercase"
                :letter-spacing "0.05em"
                :color "#64748b"
                :padding "4px 8px"
                :margin-bottom "4px"}]
  [:.item {:display "block"
           :width "100%"
           :text-align "left"
           :padding "8px 12px"
           :border "none"
           :background "transparent"
           :color "#cbd5e1"
           :font-size "13px"
           :font-family "'Inter', system-ui, sans-serif"
           :cursor "pointer"
           :border-radius "6px"
           :transition "background 0.15s"}]
  [:.item:hover {:background "rgba(99,102,241,0.15)"}]
  [:.active {:background "rgba(99,102,241,0.25)"
             :color "#a5b4fc"
             :font-weight "500"}])

(defc sidebar-component
  {:props {:current "string"}
   :style [sidebar-styles]}
  [{:keys [current]}]
  [:nav {:class "nav"}
   (map (fn [cat]
          [:div {:class "category"}
           [:div {:class "cat-label"} (:label cat)]
           (map (fn [s]
                  [:button {:class (str "item" (when (= (:id s) current) " active"))
                            :on-click (fn [_]
                                        (set! js/location.hash (:id s)))}
                   (:label s)])
                (filter (fn [s] (= (:category s) (:key cat))) reg/samples))])
        reg/categories)])
