(ns showcase.samples.todo
  (:require [su.core :as su :refer [defc defstyle]]))

(defstyle todo-item-styles
  [:.item {:display "flex"
           :align-items "center"
           :gap "8px"
           :padding "8px 12px"
           :border-bottom "1px solid #334155"}
   [:span {:flex "1" :color "#e2e8f0"}]
   [:button {:cursor "pointer"
             :border "none"
             :background "transparent"
             :color "#f87171"}
    [:&:hover {:color "#ef4444"
               :font-weight "bold"}]]])

(defstyle todo-app-styles
  [:host {:display "block"
          :font-family "sans-serif"
          :max-width "400px"
          :margin "0 auto"
          :color "#e2e8f0"}]
  [:.header {:display "flex"
             :gap "8px"
             :margin-bottom "16px"}
   [:input {:flex "1"
            :padding "8px"
            :border "1px solid #475569"
            :border-radius "4px"
            :background "#0f172a"
            :color "#e2e8f0"}]
   [:button {:padding "8px 16px"
             :background "#6366f1"
             :color "white"
             :border "none"
             :border-radius "4px"
             :cursor "pointer"}
    [:&:hover {:background "#4f46e5"}]]]
  [:.empty {:color "#94a3b8"
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
      [:input {:on-input (fn [e] (reset! input-val (.-value (.-target e))))}]
      [:button {:on-click (fn [e]
                            (let [text @input-val]
                              (when (not= text "")
                                (swap! items conj text)
                                (reset! input-val "")
                                ;; Clear the input element
                                (let [root (.getRootNode (.-target e))
                                      input (.querySelector root "input")]
                                  (set! (.-value input) "")))))}
       "Add"]]
     (fn []
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
           @items)]))]))

(defn mount! [container]
  (su/mount container [::todo-app]))
