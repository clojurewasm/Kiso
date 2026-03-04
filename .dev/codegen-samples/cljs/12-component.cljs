(ns sample.component
  (:require [su.core :as su :refer [defc defstyle]]))

(defstyle my-card
  [:host {:display "block"}]
  [:.title {:font-size "18px" :font-weight "bold"}]
  [:.body {:padding "16px"}])

(defc my-card
  {:props {:title "string" :subtitle "string"}}
  [{:keys [title subtitle]}]
  [:div {:class "body"}
   [:h2 {:class "title"} title]
   [:p subtitle]])
