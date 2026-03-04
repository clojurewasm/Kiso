(ns app.components.header
  (:require [su.core :as su :refer [defc defstyle]]
            [app.utils :refer [format-count]]))

(defstyle header-style
  ".header { padding: 16px; background: #1e293b; color: white; border-radius: 8px; margin-bottom: 16px; }"
  ".header h1 { font-size: 24px; margin-bottom: 4px; }"
  ".header .count { font-size: 14px; opacity: 0.7; }")

(defc app-header
  "Header component showing app title and note count."
  [{:keys [note-count]} :atom]
  (fn []
    [:div {:class "header"}
     [:h1 "Notes App"]
     [:span {:class "count"} (format-count @note-count "note")]]))
