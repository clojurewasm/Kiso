(ns showcase.samples.data-table
  (:require [su.core :as su :refer [defc defstyle]]))

(defstyle table-styles
  [:host {:display "block"
          :font-family "'Inter', system-ui, sans-serif"
          :max-width "560px"
          :margin "0 auto"
          :padding "20px"}]
  [:.title {:font-size "18px"
            :font-weight "600"
            :color "#e2e8f0"
            :margin-bottom "12px"}]
  [:table {:width "100%"
           :border-collapse "collapse"}]
  [:th {:padding "10px 12px"
        :text-align "left"
        :font-size "13px"
        :font-weight "600"
        :color "#94a3b8"
        :border-bottom "2px solid #334155"
        :cursor "pointer"
        :user-select "none"}
   [:&:hover {:color "#818cf8"}]]
  [:.sort-icon {:margin-left "4px"
                :font-size "10px"}]
  [:td {:padding "10px 12px"
        :font-size "14px"
        :color "#cbd5e1"
        :border-bottom "1px solid #1e293b"}]
  [:tr:hover>td {:background "#0f172a"}])

(def data
  [{:name "Alice"   :role "Engineer"  :score 95}
   {:name "Bob"     :role "Designer"  :score 87}
   {:name "Charlie" :role "Manager"   :score 78}
   {:name "Diana"   :role "Engineer"  :score 92}
   {:name "Eve"     :role "Designer"  :score 88}])

(def columns
  [{:key :name  :label "Name"}
   {:key :role  :label "Role"}
   {:key :score :label "Score"}])

(defc sample-table
  {:style [table-styles]}
  []
  (let [sort-key (atom :name)
        sort-asc (atom true)]
    [:div
     [:div {:class "title"} "Team Members"]
     [:table
      [:thead
       [:tr
        (map (fn [col]
               [:th {:on-click (fn [_]
                                 (if (= @sort-key (:key col))
                                   (swap! sort-asc not)
                                   (do (reset! sort-key (:key col))
                                       (reset! sort-asc true))))}
                (:label col)
                [:span {:class "sort-icon"}
                 (fn []
                   (if (= @sort-key (:key col))
                     (if @sort-asc "\u25B2" "\u25BC")
                     "\u25C6"))]])
             columns)]]
      (fn []
        (let [k @sort-key
              asc @sort-asc
              sorted (sort-by k data)
              rows (if asc sorted (reverse sorted))]
          [:tbody
           (map (fn [row]
                  [:tr
                   (map (fn [col]
                          [:td (str (get row (:key col)))])
                        columns)])
                rows)]))]]))

(defn mount! [container]
  (su/mount container [::sample-table]))
