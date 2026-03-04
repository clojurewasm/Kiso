(ns showcase.samples.progress-bar
  (:require [su.core :as su :refer [defc defstyle]]))

(defstyle progress-styles
  [:host {:display "block"
          :font-family "'Inter', system-ui, sans-serif"
          :max-width "400px"
          :margin "0 auto"
          :padding "40px 20px"
          :text-align "center"}]
  [:.track {:height "24px"
            :background "#e2e8f0"
            :border-radius "12px"
            :overflow "hidden"
            :margin "20px 0"}]
  [:.fill {:height "100%"
           :background "linear-gradient(90deg, #6366f1, #8b5cf6)"
           :border-radius "12px"
           :transition "width 0.3s"}]
  [:.pct {:font-size "28px"
          :font-weight "700"
          :color "#6366f1"}]
  [:.controls {:display "flex"
               :gap "8px"
               :justify-content "center"
               :margin-top "16px"}]
  [:.btn {:padding "8px 20px"
          :border "none"
          :border-radius "8px"
          :cursor "pointer"
          :font-size "14px"
          :font-weight "500"
          :background "#6366f1"
          :color "#fff"}
   [:&:hover {:background "#4f46e5"}]]
  [:.btn.reset {:background "#e2e8f0"
                :color "#475569"}])

(defc sample-progress
  {:style [progress-styles]}
  []
  (let [pct (atom 0)
        timer-id (atom nil)]
    (su/on-mount
     (fn []
       (reset! timer-id
               (js/setInterval
                (fn [] (swap! pct (fn [p] (if (>= p 100) 0 (+ p 2)))))
                100))))
    (su/on-unmount
     (fn []
       (when @timer-id
         (js/clearInterval @timer-id))))
    (fn []
      [:div
       [:div {:class "pct"} (str @pct "%")]
       [:div {:class "track"}
        [:div {:class "fill"
               :style {:width (str @pct "%")}}]]
       [:div {:class "controls"}
        [:button {:class "btn"
                  :on-click (fn [_] (swap! pct (fn [p] (min 100 (+ p 10)))))}
         "+10%"]
        [:button {:class "btn reset"
                  :on-click (fn [_] (reset! pct 0))}
         "Reset"]]])))

(defn mount! [container]
  (su/mount container [::sample-progress]))
