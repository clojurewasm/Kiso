(ns expense-tracker.core
  (:require [su.core :as su :refer [defc defstyle]]
            [clojure.string :as string]))

;; -- Helpers --

(defn format-amount [n]
  (str "$" (.toFixed (js/Math.abs n) 2)))

(defn total-by-type [items type-key]
  (reduce + 0 (map :amount (filter (fn [i] (= (:type i) type-key)) items))))

;; -- Styles --

(defstyle expense-styles
  [:host {:display "block"
          :font-family "'Inter', system-ui, sans-serif"}]
  [:.card {:max-width "480px"
           :margin "0 auto"
           :background "#fff"
           :border-radius "16px"
           :padding "24px"
           :box-shadow "0 4px 20px rgba(0,0,0,0.08)"}]
  [:.title {:font-size "22px"
            :font-weight "600"
            :color "#1e293b"
            :margin-bottom "16px"}]
  [:.summary {:display "flex"
              :gap "12px"
              :margin-bottom "20px"}]
  [:.stat {:flex "1"
           :padding "12px"
           :border-radius "8px"
           :text-align "center"}]
  [:.stat-label {:font-size "12px" :font-weight "500" :text-transform "uppercase"}]
  [:.stat-value {:font-size "22px" :font-weight "700" :margin-top "4px"}]
  [:.income-stat {:background "#f0fdf4"}]
  [:.expense-stat {:background "#fef2f2"}]
  [:.balance-stat {:background "#eef2ff"}]
  [:.form {:display "flex"
           :gap "8px"
           :margin-bottom "16px"
           :flex-wrap "wrap"}]
  [:.input {:padding "8px 12px"
            :border "1px solid #d1d5db"
            :border-radius "6px"
            :font-size "14px"
            :flex "1"
            :min-width "100px"}]
  [:.type-select {:padding "8px 12px"
                  :border "1px solid #d1d5db"
                  :border-radius "6px"
                  :font-size "14px"
                  :background "#fff"}]
  [:.add-btn {:padding "8px 16px"
              :background "#6366f1"
              :color "#fff"
              :border "none"
              :border-radius "6px"
              :font-size "14px"
              :cursor "pointer"}]
  [:.list {:border-top "1px solid #f1f5f9"}]
  [:.item {:display "flex"
           :justify-content "space-between"
           :align-items "center"
           :padding "10px 0"
           :border-bottom "1px solid #f1f5f9"}]
  [:.item-name {:font-size "14px" :color "#334155"}]
  [:.item-cat {:font-size "12px" :color "#94a3b8"}]
  [:.item-amount {:font-size "14px" :font-weight "600"}]
  [:.amount-income {:color "#22c55e"}]
  [:.amount-expense {:color "#ef4444"}]
  [:.delete-btn {:border "none"
                 :background "none"
                 :color "#94a3b8"
                 :cursor "pointer"
                 :font-size "16px"
                 :padding "0 4px"}])

;; -- Component --

(defc expense-app
  {:style [expense-styles]}
  []
  (let [items (atom [])
        next-id (atom 0)
        name-val (atom "")
        amount-val (atom "")
        type-val (atom "expense")
        cat-val (atom "")]
    [:div {:class "card"}
     [:div {:class "title"} "Expense Tracker"]
     (fn []
       (let [xs @items
             income (total-by-type xs "income")
             expense (total-by-type xs "expense")
             balance (- income expense)]
         [:div {:class "summary"}
          [:div {:class "stat income-stat"}
           [:div {:class "stat-label"} "Income"]
           [:div {:class "stat-value" :style {:color "#22c55e"}} (format-amount income)]]
          [:div {:class "stat expense-stat"}
           [:div {:class "stat-label"} "Expenses"]
           [:div {:class "stat-value" :style {:color "#ef4444"}} (format-amount expense)]]
          [:div {:class "stat balance-stat"}
           [:div {:class "stat-label"} "Balance"]
           [:div {:class "stat-value" :style {:color "#6366f1"}} (format-amount balance)]]]))
     [:div {:class "form"}
      [:input {:class "input"
               :placeholder "Description"
               :on-input (fn [e] (reset! name-val (.-value (.-target e))))}]
      [:input {:class "input"
               :placeholder "Amount"
               :type "number"
               :on-input (fn [e] (reset! amount-val (.-value (.-target e))))}]
      [:input {:class "input"
               :placeholder "Category"
               :on-input (fn [e] (reset! cat-val (.-value (.-target e))))}]
      [:select {:class "type-select"
                :on-change (fn [e] (reset! type-val (.-value (.-target e))))}
       [:option {:value "expense"} "Expense"]
       [:option {:value "income"} "Income"]]
      [:button {:class "add-btn"
                :on-click (fn [e]
                            (let [n @name-val
                                  a (js/parseFloat @amount-val)]
                              (when (and (not (string/blank? n)) (not (js/isNaN a)) (> a 0))
                                (let [id (swap! next-id inc)]
                                  (swap! items conj {:id id :name n :amount a
                                                     :type @type-val :category @cat-val})
                                  (reset! name-val "")
                                  (reset! amount-val "")
                                  (reset! cat-val "")
                                  ;; Clear inputs
                                  (let [root (.getRootNode (.-target e))
                                        inputs (.querySelectorAll root ".input")]
                                    (.forEach inputs (fn [input] (set! (.-value input) ""))))))))}
       "Add"]]
     (fn []
       [:div {:class "list"}
        (map (fn [item]
               [:div {:class "item"}
                [:div
                 [:div {:class "item-name"} (:name item)]
                 [:div {:class "item-cat"} (:category item)]]
                [:div {:style {:display "flex" :align-items "center" :gap "8px"}}
                 [:span {:class (str "item-amount "
                                     (if (= (:type item) "income")
                                       "amount-income"
                                       "amount-expense"))}
                  (str (if (= (:type item) "income") "+" "-")
                       (format-amount (:amount item)))]
                 [:button {:class "delete-btn"
                           :on-click (fn [_]
                                       (swap! items (fn [xs] (filter (fn [x] (not= (:id x) (:id item))) xs))))}
                  "\u00D7"]]])
             @items)])]))

(su/mount (js/document.getElementById "app") [::expense-app])
