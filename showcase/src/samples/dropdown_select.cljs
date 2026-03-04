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
            :color "#94a3b8"
            :margin-bottom "6px"}]
  [:.select {:position "relative"}]
  [:.trigger {:width "100%"
              :padding "10px 14px"
              :border "1px solid #475569"
              :border-radius "8px"
              :background "#0f172a"
              :font-size "14px"
              :color "#e2e8f0"
              :cursor "pointer"
              :display "flex"
              :justify-content "space-between"
              :align-items "center"
              :text-align "left"}
   [:&:hover {:border-color "#818cf8"}]]
  [:.arrow {:font-size "10px" :color "#94a3b8"}]
  [:.menu {:position "absolute"
           :top "calc(100% + 4px)"
           :left "0"
           :right "0"
           :background "#0f172a"
           :border "1px solid #334155"
           :border-radius "8px"
           :box-shadow "0 4px 12px rgba(0,0,0,0.4)"
           :z-index "10"
           :overflow "hidden"}]
  [:.option {:padding "10px 14px"
             :font-size "14px"
             :cursor "pointer"
             :color "#cbd5e1"}
   [:&:hover {:background "#1e293b"}]]
  [:.option.selected {:background "rgba(99,102,241,0.15)"
                      :color "#818cf8"
                      :font-weight "500"}]
  [:.selected-display {:margin-top "16px"
                       :font-size "14px"
                       :color "#94a3b8"}])

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
    (fn []
      (let [sel @selected
            is-open @open
            sel-label (if sel
                        (:label (first (filter (fn [o] (= (:value o) sel)) options)))
                        "Select...")]
        [:div
         [:div {:class "label"} "Choose a framework:"]
         [:div {:class "select"}
          [:button {:class "trigger"
                    :on-click (fn [_] (swap! open not))}
           [:span sel-label]
           [:span {:class "arrow"} "\u25BC"]]
          (when is-open
            [:div {:class "menu"}
             (map (fn [opt]
                    [:div {:class (str "option" (when (= sel (:value opt)) " selected"))
                           :on-click (fn [_]
                                       (reset! selected (:value opt))
                                       (reset! open false))}
                     (:label opt)])
                  options)])]
         [:div {:class "selected-display"}
          (str "Selected: " (or sel "none"))]]))))

(defn mount! [container]
  (su/mount container [::sample-dropdown]))
