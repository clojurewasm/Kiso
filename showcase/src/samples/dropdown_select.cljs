(ns showcase.samples.dropdown-select
  (:require [su.core :as su :refer [defc defstyle]]))

(defstyle dropdown-styles
  [:host {:display "block"
          :font-family "'Inter', system-ui, sans-serif"
          :max-width "300px"
          :margin "0 auto"
          :padding "40px 20px"}]
  [:.label {:font-size "13px"
            :font-weight "500"
            :color "#64748b"
            :margin-bottom "6px"}]
  [:.select {:position "relative"}]
  [:.trigger {:width "100%"
              :padding "10px 14px"
              :border "1px solid #d1d5db"
              :border-radius "8px"
              :background "#fff"
              :font-size "14px"
              :color "#1e293b"
              :cursor "pointer"
              :display "flex"
              :justify-content "space-between"
              :align-items "center"
              :text-align "left"}
   [:&:hover {:border-color "#6366f1"}]]
  [:.arrow {:font-size "10px" :color "#94a3b8"}]
  [:.menu {:position "absolute"
           :top "calc(100% + 4px)"
           :left "0"
           :right "0"
           :background "#fff"
           :border "1px solid #e2e8f0"
           :border-radius "8px"
           :box-shadow "0 4px 12px rgba(0,0,0,0.1)"
           :z-index "10"
           :overflow "hidden"}]
  [:.option {:padding "10px 14px"
             :font-size "14px"
             :cursor "pointer"
             :color "#334155"}
   [:&:hover {:background "#f1f5f9"}]]
  [:.option.selected {:background "#eef2ff"
                      :color "#6366f1"
                      :font-weight "500"}]
  [:.selected-display {:margin-top "16px"
                       :font-size "14px"
                       :color "#475569"}])

(def options
  [{:value "react"   :label "React"}
   {:value "vue"     :label "Vue"}
   {:value "svelte"  :label "Svelte"}
   {:value "kiso"    :label "Kiso + su"}
   {:value "angular" :label "Angular"}])

(defc sample-dropdown
  {:style [dropdown-styles]}
  []
  (let [open (atom false)
        selected (atom nil)]
    [:div
     [:div {:class "label"} "Choose a framework:"]
     [:div {:class "select"}
      [:button {:class "trigger"
                :on-click (fn [_] (swap! open not))}
       (fn []
         (let [sel @selected
               label (if sel
                       (:label (first (filter (fn [o] (= (:value o) sel)) options)))
                       "Select...")]
           [:span label]))
       [:span {:class "arrow"} "\u25BC"]]
      (fn []
        (when @open
          [:div {:class "menu"}
           (map (fn [opt]
                  [:div {:class (fn [] (str "option" (when (= @selected (:value opt)) " selected")))
                         :on-click (fn [_]
                                     (reset! selected (:value opt))
                                     (reset! open false))}
                   (:label opt)])
                options)]))]
     [:div {:class "selected-display"}
      (fn [] (str "Selected: " (or @selected "none")))]]))

(defn mount! [container]
  (su/mount container [::sample-dropdown]))
