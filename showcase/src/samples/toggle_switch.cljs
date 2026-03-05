(ns showcase.samples.toggle-switch
  (:require [su.core :as su :refer [defc defstyle]]))

(defstyle toggle-styles
  [:host {:display "block"
          :font-family "'Inter', system-ui, sans-serif"
          :padding "40px"
          :text-align "center"}]
  [:.track {:width "56px"
            :height "30px"
            :border-radius "15px"
            :background "#475569"
            :position "relative"
            :cursor "pointer"
            :transition "background 0.2s"
            :display "inline-block"}]
  [:.track.on {:background "#6366f1"}]
  [:.thumb {:width "26px"
            :height "26px"
            :border-radius "50%"
            :background "#fff"
            :position "absolute"
            :top "2px"
            :left "2px"
            :transition "left 0.2s"
            :box-shadow "0 1px 3px rgba(0,0,0,0.2)"}]
  [:.thumb.on {:left "28px"}]
  [:.label {:margin-top "16px"
            :font-size "15px"
            :color "#cbd5e1"}])

(defc sample-toggle
  {:style [toggle-styles]}
  []
  (let [active (atom false)]
    [:div
     [:div {:class (str "track" (when @active " on"))
            :on-click (fn [_] (swap! active not))}
      [:div {:class (str "thumb" (when @active " on"))}]]
     [:div {:class "label"}
      (if @active "ON" "OFF")]]))

(defn mount! [container]
  (su/mount container [::sample-toggle]))
