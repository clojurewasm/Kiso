(ns showcase.samples.task-manager
  (:require [su.core :as su :refer [defc defstyle]]))

;; Enable atom state tracing in dev console
(su/enable-trace)

;; -- Helpers --

(defn add-task! [tasks next-id text]
  (when (not= text "")
    (let [id (swap! next-id inc)]
      (swap! tasks conj {:id id :text text :done false}))))

(defn toggle-task! [tasks id]
  (swap! tasks
         (fn [ts]
           (map (fn [t]
                  (if (= (:id t) id)
                    (assoc t :done (not (:done t)))
                    t))
                ts))))

(defn remove-task! [tasks id]
  (swap! tasks
         (fn [ts]
           (filter (fn [t] (not= (:id t) id)) ts))))

(defn filtered-tasks [tasks filter-mode]
  (let [mode @filter-mode
        ts @tasks]
    (cond
      (= mode :active) (filter (fn [t] (not (:done t))) ts)
      (= mode :done)   (filter (fn [t] (:done t)) ts)
      :else            ts)))

;; -- stat-card --

(defstyle stat-card-styles
  [:host {:display "block"}]
  [:.card {:padding "16px"
           :background "#0f172a"
           :border-radius "12px"
           :border "1px solid #334155"
           :text-align "center"
           :min-width "100px"}]
  [:.count {:font-size "28px" :font-weight "700"}]
  [:.label {:font-size "13px" :color "#94a3b8" :margin-top "4px"}])

(defc stat-card
  {:props {:label "string" :count "number" :color "string"}
   :style [stat-card-styles]}
  [{:keys [label count color]}]
  [:div {:class "card"
         :style {:border-top (str "3px solid " (or color "#6366f1"))}}
   [:div {:class "count" :style {:color (or color "#6366f1")}}
    (str count)]
   [:div {:class "label"} label]])

;; -- task-item --

(defstyle task-item-styles
  [:host {:display "block"}]
  [:.row {:display "flex"
          :align-items "center"
          :padding "10px 12px"
          :background "#0f172a"
          :border-radius "8px"
          :margin-bottom "6px"
          :border "1px solid #334155"}]
  [:.checkbox {:margin-right "12px"
               :width "16px"
               :height "16px"
               :cursor "pointer"
               :accent-color "#6366f1"}]
  [:.text {:flex "1" :font-size "14px"}]
  [:.delete {:background "none"
             :border "none"
             :color "#64748b"
             :cursor "pointer"
             :font-size "16px"
             :padding "2px 6px"}])

(defc task-item
  {:props {:task-id "number" :text "string" :done "boolean"}
   :style [task-item-styles]}
  [{:keys [task-id text done]}]
  (let [tasks (su/use-context :tasks)]
    [:div {:class "row"}
     [:input {:type "checkbox"
              :class "checkbox"
              :checked done
              :on-click (fn [_] (toggle-task! tasks task-id))}]
     [:span {:class "text"
             :style {:text-decoration (if done "line-through" "none")
                     :color (if done "#64748b" "#e2e8f0")}}
      text]
     [:button {:class "delete"
               :on-click (fn [_] (remove-task! tasks task-id))}
      "\u00D7"]]))

;; -- task-input --

(defstyle task-input-styles
  [:host {:display "block"}]
  [:.row {:display "flex" :gap "8px" :margin-bottom "16px"}]
  [:.text-input {:flex "1"
                 :padding "10px 14px"
                 :border "1px solid #475569"
                 :border-radius "8px"
                 :font-size "14px"
                 :outline "none"
                 :background "#0f172a"
                 :color "#e2e8f0"}]
  [:.add-btn {:padding "10px 20px"
              :background "#6366f1"
              :color "#fff"
              :border "none"
              :border-radius "8px"
              :font-size "14px"
              :cursor "pointer"
              :font-weight "500"}])

(defc task-input
  {:style [task-input-styles]}
  []
  (let [tasks   (su/use-context :tasks)
        next-id (su/use-context :next-id)
        input-text (atom "" "input-text")]
    [:div {:class "row"}
     [:input {:class "text-input"
              :placeholder "Add a new task..."
              :on-input (fn [e]
                          (reset! input-text (.-value (.-target e))))
              :on-keydown (fn [e]
                            (when (= (.-key e) "Enter")
                              (add-task! tasks next-id @input-text)
                              (set! (.-value (.-target e)) "")
                              (reset! input-text "")))}]
     [:button {:class "add-btn"
               :on-click (fn [e]
                           (add-task! tasks next-id @input-text)
                           (reset! input-text "")
                           (let [root (.getRootNode (.-target e))
                                 input (.querySelector root ".text-input")]
                             (set! (.-value input) "")))}
      "Add"]]))

;; -- filter-bar --

(defstyle filter-bar-styles
  [:host {:display "block"}]
  [:.filters {:display "flex" :gap "6px" :margin-bottom "16px"}]
  [:.btn {:padding "6px 16px"
          :border-radius "20px"
          :border "1px solid #475569"
          :font-size "13px"
          :cursor "pointer"}])

(defc filter-bar
  {:style [filter-bar-styles]}
  []
  (let [filter-mode (su/use-context :filter-mode)]
    (fn []
      (let [mode @filter-mode]
        [:div {:class "filters"}
         (map (fn [m]
                [:button {:class "btn"
                          :style {:background (if (= mode m) "#6366f1" "transparent")
                                  :color (if (= mode m) "#fff" "#cbd5e1")}
                          :on-click (fn [_] (reset! filter-mode m))}
                 (name m)])
              [:all :active :done])]))))

;; -- task-list --

(defstyle task-list-styles
  [:host {:display "block"}]
  [:.empty {:text-align "center"
            :color "#94a3b8"
            :font-size "14px"
            :padding "24px 0"}])

(defc task-list
  {:props {:tasks :atom}
   :style [task-list-styles]}
  [{:keys [tasks]}]
  (let [filter-mode (su/use-context :filter-mode)]
    (fn []
      (let [ts (filtered-tasks tasks filter-mode)]
        [:div
         (if (= 0 (count ts))
           [:p {:class "empty"} "No tasks yet. Add one above!"]
           (map (fn [t]
                  [::task-item {:task-id (:id t)
                                :text (:text t)
                                :done (:done t)}])
                ts))]))))

;; -- task-app (root) --

(defstyle task-app-styles
  [:host {:font-family "'Inter', system-ui, sans-serif"
          :color "#e2e8f0"}]
  [:.container {:max-width "520px"
                :margin "0 auto"}]
  [:.header {:background "linear-gradient(135deg, #6366f1, #8b5cf6)"
             :padding "24px"
             :border-radius "16px 16px 0 0"
             :color "#fff"}]
  [:.header-title {:margin "0" :font-size "22px" :font-weight "600"}]
  [:.header-sub {:margin "4px 0 0" :font-size "13px" :opacity "0.85"}]
  [:.body {:background "#1e293b"
           :padding "20px"
           :border-radius "0 0 16px 16px"
           :border "1px solid #334155"
           :border-top "none"}]
  [:.stats {:display "flex" :gap "12px" :margin-bottom "20px"}])

(defc task-app
  {:style [task-app-styles]}
  []
  (let [tasks       (atom [] "tasks")
        next-id     (atom 0 "next-id")
        filter-mode (atom :all "filter-mode")]
    (su/provide :tasks tasks)
    (su/provide :next-id next-id)
    (su/provide :filter-mode filter-mode)
    [:div {:class "container"}
     [:div {:class "header"}
      [:h1 {:class "header-title"} "Task Manager"]
      [:p {:class "header-sub"} "Built with Kiso + su framework"]]
     [:div {:class "body"}
      (fn []
        (let [ts @tasks
              total (count ts)
              done-count (count (filter :done ts))
              active (- total done-count)]
          [:div {:class "stats"}
           [::stat-card {:label "Total" :count (str total) :color "#6366f1"}]
           [::stat-card {:label "Active" :count (str active) :color "#f59e0b"}]
           [::stat-card {:label "Done" :count (str done-count) :color "#10b981"}]]))
      [::task-input]
      [::filter-bar]
      [::task-list {:tasks tasks}]]]))

(defn mount! [container]
  (su/mount container [::task-app]))
