(ns task-manager.core
  (:require [su.core :as su :refer [defc defstyle]]))

;; -- Styles --

(defstyle stat-card
  [:host {:display "block"}]
  [:.card {:padding "16px"
           :background "#fff"
           :border-radius "12px"
           :box-shadow "0 1px 3px rgba(0,0,0,0.1)"
           :text-align "center"
           :min-width "100px"}]
  [:.count {:font-size "28px" :font-weight "700"}]
  [:.label {:font-size "13px" :color "#64748b" :margin-top "4px"}])

(defstyle task-app
  [:host {:font-family "'Inter', system-ui, sans-serif"
          :color "#1e293b"}]
  [:.container {:max-width "520px"
                :margin "0 auto"}]
  [:.header {:background "linear-gradient(135deg, #6366f1, #8b5cf6)"
             :padding "24px"
             :border-radius "16px 16px 0 0"
             :color "#fff"}]
  [:.header-title {:margin "0" :font-size "22px" :font-weight "600"}]
  [:.header-sub {:margin "4px 0 0" :font-size "13px" :opacity "0.85"}]
  [:.body {:background "#f8fafc"
           :padding "20px"
           :border-radius "0 0 16px 16px"
           :border "1px solid #e2e8f0"
           :border-top "none"}]
  [:.stats {:display "flex" :gap "12px" :margin-bottom "20px"}]
  [:.input-row {:display "flex" :gap "8px" :margin-bottom "16px"}]
  [:.text-input {:flex "1"
                 :padding "10px 14px"
                 :border "1px solid #d1d5db"
                 :border-radius "8px"
                 :font-size "14px"
                 :outline "none"}]
  [:.add-btn {:padding "10px 20px"
              :background "#6366f1"
              :color "#fff"
              :border "none"
              :border-radius "8px"
              :font-size "14px"
              :cursor "pointer"
              :font-weight "500"}]
  [:.filters {:display "flex" :gap "6px" :margin-bottom "16px"}]
  [:.filter-btn {:padding "6px 16px"
                 :border-radius "20px"
                 :border "1px solid #d1d5db"
                 :font-size "13px"
                 :cursor "pointer"}]
  [:.empty-msg {:text-align "center"
                :color "#94a3b8"
                :font-size "14px"
                :padding "24px 0"}]
  [:.task-row {:display "flex"
               :align-items "center"
               :padding "10px 12px"
               :background "#fff"
               :border-radius "8px"
               :margin-bottom "6px"
               :border "1px solid #e5e7eb"}]
  [:.task-checkbox {:margin-right "12px"
                    :width "16px"
                    :height "16px"
                    :cursor "pointer"
                    :accent-color "#6366f1"}]
  [:.task-text {:flex "1" :font-size "14px"}]
  [:.delete-btn {:background "none"
                 :border "none"
                 :color "#94a3b8"
                 :cursor "pointer"
                 :font-size "16px"
                 :padding "2px 6px"}])

;; -- State --

(def tasks (atom []))
(def next-id (atom 0))
(def filter-mode (atom :all))

;; -- Helpers --

(defn add-task! [text]
  (when (not= text "")
    (let [id (swap! next-id inc)]
      (swap! tasks conj {:id id :text text :done false}))))

(defn toggle-task! [id]
  (swap! tasks
         (fn [ts]
           (map (fn [t]
                  (if (= (:id t) id)
                    (assoc t :done (not (:done t)))
                    t))
                ts))))

(defn remove-task! [id]
  (swap! tasks
         (fn [ts]
           (filter (fn [t] (not= (:id t) id)) ts))))

(defn filtered-tasks []
  (let [mode @filter-mode
        ts @tasks]
    (cond
      (= mode :active) (filter (fn [t] (not (:done t))) ts)
      (= mode :done)   (filter (fn [t] (:done t)) ts)
      :else            ts)))

;; -- Components --

(defc stat-card
  {:props {:label "string" :count "number" :color "string"}}
  [{:keys [label count color]}]
  [:div {:class "card"
         :style {:border-top (str "3px solid " (or color "#6366f1"))}}
   [:div {:class "count" :style {:color (or color "#6366f1")}}
    (str count)]
   [:div {:class "label"} label]])

(defc task-app []
  (let [input-text (atom "")]
    [:div {:class "container"}
     ;; Header
     [:div {:class "header"}
      [:h1 {:class "header-title"} "Task Manager"]
      [:p {:class "header-sub"} "Built with Kiso + su framework"]]

     [:div {:class "body"}

      ;; Stats
      (fn []
        (let [ts @tasks
              total (count ts)
              done-count (count (filter :done ts))
              active (- total done-count)]
          [:div {:class "stats"}
           [::stat-card {:label "Total" :count (str total) :color "#6366f1"}]
           [::stat-card {:label "Active" :count (str active) :color "#f59e0b"}]
           [::stat-card {:label "Done" :count (str done-count) :color "#10b981"}]]))

      ;; Input row
      [:div {:class "input-row"}
       [:input {:class "text-input"
                :placeholder "Add a new task..."
                :on-input (fn [e]
                            (reset! input-text (.-value (.-target e))))
                :on-keydown (fn [e]
                              (when (= (.-key e) "Enter")
                                (add-task! @input-text)
                                (set! (.-value (.-target e)) "")
                                (reset! input-text "")))}]
       [:button {:class "add-btn"
                 :on-click (fn [_]
                             (add-task! @input-text)
                             (reset! input-text ""))}
        "Add"]]

      ;; Filter buttons
      (fn []
        (let [mode @filter-mode]
          [:div {:class "filters"}
           (map (fn [m]
                  [:button {:class "filter-btn"
                            :style {:background (if (= mode m) "#6366f1" "#fff")
                                    :color (if (= mode m) "#fff" "#374151")}
                            :on-click (fn [_] (reset! filter-mode m))}
                   (name m)])
                [:all :active :done])]))

      ;; Task list
      (fn []
        (let [ts (filtered-tasks)]
          [:div
           (if (= 0 (count ts))
             [:p {:class "empty-msg"} "No tasks yet. Add one above!"]
             (map (fn [t]
                    [:div {:class "task-row"}
                     [:input {:type "checkbox"
                              :class "task-checkbox"
                              :on-click (fn [_] (toggle-task! (:id t)))}]
                     [:span {:class "task-text"
                             :style {:text-decoration (if (:done t) "line-through" "none")
                                     :color (if (:done t) "#94a3b8" "#1e293b")}}
                      (:text t)]
                     [:button {:class "delete-btn"
                               :on-click (fn [_] (remove-task! (:id t)))}
                      "\u00D7"]])
                  ts))]))]]))

;; Mount to page
(su/mount (js/document.getElementById "app")
          [::task-app])
