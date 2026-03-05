(ns app.core
  (:require [su.core :as su :refer [defc defstyle]]
            [app.state :refer [notes]]
            [app.components.header]
            [app.components.note-input]
            [app.components.note-item]))

(su/enable-trace)

(defstyle app-style
  [:.app {:max-width "600px" :margin "0 auto"}]
  [:.note-list {:display "flex" :flex-direction "column"}])

(defc notes-app
  "Root component. Assembles header, input, and note list."
  {:style [app-style]}
  []
  [:div {:class "app"}
   [::app-header {:note-count notes}]
   [::note-input]
   [:div {:class "note-list"}
    (map (fn [note]
           [::note-item {:note-id (:id note)
                         :note-text (:text note)
                         :created (:created note)}])
         @notes)]])

(su/mount (js/document.getElementById "app")
          [::notes-app])
