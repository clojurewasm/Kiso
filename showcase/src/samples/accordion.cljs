(ns showcase.samples.accordion
  (:require [su.core :as su :refer [defc defstyle]]))

(defstyle accordion-styles
  [:host {:display "block"
          :font-family "'Inter', system-ui, sans-serif"
          :max-width "480px"
          :margin "0 auto"
          :padding "20px"}]
  [:.item {:border "1px solid #e2e8f0"
           :border-radius "8px"
           :margin-bottom "8px"
           :overflow "hidden"}]
  [:.header {:padding "14px 16px"
             :background "#f8fafc"
             :cursor "pointer"
             :display "flex"
             :justify-content "space-between"
             :align-items "center"
             :font-weight "500"
             :color "#1e293b"
             :user-select "none"}
   [:&:hover {:background "#f1f5f9"}]]
  [:.arrow {:transition "transform 0.2s"
            :font-size "12px"
            :color "#94a3b8"}]
  [:.arrow.open {:transform "rotate(90deg)"}]
  [:.body {:padding "0 16px"
           :max-height "0"
           :overflow "hidden"
           :transition "max-height 0.3s, padding 0.3s"
           :color "#475569"
           :font-size "14px"
           :line-height "1.6"}]
  [:.body.open {:max-height "200px"
                :padding "12px 16px"}])

(def faq-items
  [{:title "What is Kiso?"
    :content "A ClojureScript-to-JavaScript compiler written in TypeScript with zero dependencies."}
   {:title "What is the su framework?"
    :content "A component framework built on web components with Shadow DOM, reactive atoms, and CSS-in-CLJS."}
   {:title "How do I get started?"
    :content "Install @clojurewasm/kiso and @clojurewasm/su, add the Vite plugin, and write .cljs files."}])

(defc sample-accordion
  {:style [accordion-styles]}
  []
  (let [open-idx (atom #{})]
    (fn []
      [:div
       (map-indexed
        (fn [i item]
          [:div {:class "item"}
           [:div {:class "header"
                  :on-click (fn [_]
                              (swap! open-idx
                                     (fn [s] (if (s i) (disj s i) (conj s i)))))}
            (:title item)
            [:span {:class (str "arrow" (when (@open-idx i) " open"))}
             "\u25B6"]]
           [:div {:class (str "body" (when (@open-idx i) " open"))}
            (:content item)]])
        faq-items)])))

(defn mount! [container]
  (su/mount container [::sample-accordion]))
