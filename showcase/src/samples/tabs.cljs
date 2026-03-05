(ns showcase.samples.tabs
  (:require [su.core :as su :refer [defc defstyle]]))

(defstyle tab-styles
  [:host {:display "block"
          :font-family "'Inter', system-ui, sans-serif"
          :max-width "500px"
          :margin "0 auto"
          :padding "20px"}]
  [:.tab-bar {:display "flex"
              :border-bottom "2px solid #334155"
              :margin-bottom "16px"}]
  [:.tab {:padding "10px 20px"
          :cursor "pointer"
          :border "none"
          :background "none"
          :font-size "14px"
          :font-weight "500"
          :color "#94a3b8"
          :border-bottom "2px solid transparent"
          :margin-bottom "-2px"
          :transition "color 0.15s, border-color 0.15s"}
   [:&:hover {:color "#818cf8"}]]
  [:.tab.active {:color "#818cf8"
                 :border-bottom-color "#818cf8"}]
  [:.content {:padding "16px"
              :color "#cbd5e1"
              :font-size "14px"
              :line-height "1.6"
              :background "#0f172a"
              :border-radius "8px"
              :min-height "80px"}])

(def tab-data
  [{:id :overview :label "Overview"
    :body "Kiso compiles ClojureScript to clean, readable JavaScript. It supports persistent data structures, protocols, multimethods, and more."}
   {:id :features :label "Features"
    :body "330+ core vars, tree-shakeable runtime, source maps, Vite integration, hot module replacement, and zero dependencies."}
   {:id :su :label "su Framework"
    :body "Web components with Shadow DOM isolation, reactive atoms, hiccup templating, CSS-in-CLJS with defstyle, and Context API."}])

(defc sample-tabs
  {:style [tab-styles]}
  []
  (let [active (atom :overview)]
    [:div
     [:div {:class "tab-bar"}
      (map (fn [t]
             [:button {:class (str "tab" (when (= @active (:id t)) " active"))
                       :on-click (fn [_] (reset! active (:id t)))}
              (:label t)])
           tab-data)]
     [:div {:class "content"}
      (let [tab (first (filter (fn [t] (= (:id t) @active)) tab-data))]
        (:body tab))]]))

(defn mount! [container]
  (su/mount container [::sample-tabs]))
