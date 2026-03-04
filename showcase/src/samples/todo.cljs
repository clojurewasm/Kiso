(ns showcase.samples.todo
  (:require [su.core :as su :refer [defc defstyle]]))

(defstyle todo-item-styles
  [:.item {:display "flex"
           :align-items "center"
           :gap "8px"
           :padding "8px 12px"
           :border-bottom "1px solid #eee"}
   [:span {:flex "1"}]
   [:button {:cursor "pointer"
             :border "none"
             :background "transparent"
             :color "#e74c3c"}
    [:&:hover {:color "#c0392b"
               :font-weight "bold"}]]])

(defstyle todo-app-styles
  [:host {:display "block"
          :font-family "sans-serif"
          :max-width "400px"
          :margin "0 auto"}]
  [:.header {:display "flex"
             :gap "8px"
             :margin-bottom "16px"}
   [:input {:flex "1"
            :padding "8px"
            :border "1px solid #ccc"
            :border-radius "4px"}]
   [:button {:padding "8px 16px"
             :background "#3498db"
             :color "white"
             :border "none"
             :border-radius "4px"
             :cursor "pointer"}
    [:&:hover {:background "#2980b9"}]]]
  [:.empty {:color "#999"
            :text-align "center"
            :padding "24px"}])

(defc todo-item
  {:props {:text :string
           :on-delete :atom}
   :style [todo-item-styles]}
  [{:keys [text on-delete]}]
  [:div.item
   [:span text]
   [:button {:on-click on-delete} "x"]])

(defc todo-app
  {:style [todo-app-styles]}
  []
  (let [items (atom [])
        input-val (atom "")]
    [:div
     [:h2 "My Tasks"]
     [:div.header
      [:input {:value @input-val
               :on-input (fn [e] (reset! input-val (.-value (.-target e))))}]
      [:button {:on-click (fn [_]
                            (swap! items conj @input-val)
                            (reset! input-val ""))}
       "Add"]]
     (if (empty? @items)
       [:p.empty "No tasks yet"]
       [:div
        (map-indexed
         (fn [i item]
           [::todo-item {:text item
                         :on-delete (fn [_]
                                      (swap! items
                                             (fn [xs]
                                               (into [] (concat (subvec xs 0 i)
                                                                (subvec xs (inc i)))))))}])
         @items)])]))

(defn mount! [container]
  (su/mount container [::todo-app]))
