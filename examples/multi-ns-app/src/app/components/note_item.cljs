(ns app.components.note-item
  (:require [su.core :as su :refer [defc defstyle]]
            [app.utils :refer [truncate]]
            [app.state :refer [remove-note!]]))

(defstyle note-item-style
  [:.note {:padding "12px"
           :background "white"
           :border-radius "6px"
           :margin-bottom "8px"
           :display "flex"
           :justify-content "space-between"
           :align-items "center"
           :box-shadow "0 1px 3px rgba(0,0,0,0.1)"}]
  [".note .text" {:flex "1"}]
  [".note .meta" {:font-size "12px" :color "#94a3b8" :margin-left "12px"}]
  [".note button" {:background "#ef4444"
                   :color "white"
                   :border "none"
                   :border-radius "4px"
                   :padding "4px 8px"
                   :cursor "pointer"}])

(defc note-item
  "Displays a single note with delete button."
  {:style [note-item-style]}
  [{:keys [note-id note-text created]}]
  [:div {:class "note"}
   [:span {:class "text"} (truncate note-text 80)]
   [:span {:class "meta"} created]
   [:button {:on-click (fn [_e] (remove-note! note-id))} "x"]])
