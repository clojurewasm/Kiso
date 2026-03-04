(ns app.components.note-input
  (:require [su.core :as su :refer [defc defstyle]]
            [app.state :refer [add-note!]]))

(defstyle note-input-style
  [:.input-row {:display "flex" :gap "8px" :margin-bottom "16px"}]
  [".input-row input" {:flex "1"
                       :padding "8px 12px"
                       :border "1px solid #e2e8f0"
                       :border-radius "6px"
                       :font-size "14px"}]
  [".input-row button" {:padding "8px 16px"
                        :background "#3b82f6"
                        :color "white"
                        :border "none"
                        :border-radius "6px"
                        :cursor "pointer"
                        :font-size "14px"}])

(defc note-input
  "Input component for adding new notes."
  {:style [note-input-style]}
  []
  (let [text (atom "" "input-text")]
    (fn []
      [:div {:class "input-row"}
       [:input {:type "text"
                :placeholder "Add a note..."
                :value @text
                :on-input (fn [e] (reset! text (.-value (.-target e))))}]
       [:button {:on-click (fn [_e]
                             (add-note! @text)
                             (reset! text ""))}
        "Add"]])))
