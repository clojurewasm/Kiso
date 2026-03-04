(ns showcase.samples.modal-dialog
  (:require [su.core :as su :refer [defc defstyle]]))

(defstyle modal-styles
  [:host {:display "block"
          :font-family "'Inter', system-ui, sans-serif"
          :padding "40px"
          :text-align "center"}]
  [:.trigger {:padding "12px 28px"
              :background "#6366f1"
              :color "#fff"
              :border "none"
              :border-radius "8px"
              :font-size "15px"
              :font-weight "600"
              :cursor "pointer"}
   [:&:hover {:background "#4f46e5"}]]
  [:.overlay {:position "fixed"
              :inset "0"
              :background "rgba(0,0,0,0.5)"
              :display "flex"
              :align-items "center"
              :justify-content "center"
              :z-index "1000"}]
  [:.dialog {:background "#1e293b"
             :border "1px solid #334155"
             :border-radius "16px"
             :padding "32px"
             :max-width "420px"
             :width "90%"
             :box-shadow "0 20px 60px rgba(0,0,0,0.5)"
             :text-align "left"}]
  [:.title {:font-size "20px"
            :font-weight "600"
            :color "#e2e8f0"
            :margin "0 0 12px"}]
  [:.body {:font-size "14px"
           :color "#94a3b8"
           :line-height "1.6"
           :margin-bottom "24px"}]
  [:.actions {:display "flex"
              :gap "8px"
              :justify-content "flex-end"}]
  [:.btn {:padding "8px 20px"
          :border "none"
          :border-radius "8px"
          :font-size "14px"
          :font-weight "500"
          :cursor "pointer"}]
  [:.btn-cancel {:background "#334155" :color "#cbd5e1"}]
  [:.btn-confirm {:background "#6366f1" :color "#fff"}])

(defc sample-modal
  {:style [modal-styles]}
  []
  (let [open (atom false)]
    [:div
     [:button {:class "trigger"
               :on-click (fn [_] (reset! open true))}
      "Open Modal"]
     (fn []
       (when @open
         [:div {:class "overlay"
                :on-click (fn [e]
                            (when (= (.-target e) (.-currentTarget e))
                              (reset! open false)))}
          [:div {:class "dialog"}
           [:h2 {:class "title"} "Confirm Action"]
           [:p {:class "body"}
            "This is a modal dialog built with su components. Click the overlay or Cancel to close."]
           [:div {:class "actions"}
            [:button {:class "btn btn-cancel"
                      :on-click (fn [_] (reset! open false))}
             "Cancel"]
            [:button {:class "btn btn-confirm"
                      :on-click (fn [_] (reset! open false))}
             "Confirm"]]]]))]))

(defn mount! [container]
  (su/mount container [::sample-modal]))
