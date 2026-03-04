(ns showcase.code-viewer
  (:require [su.core :as su :refer [defc defstyle]]
            [showcase.highlight :as hl]))

(defstyle viewer-styles
  [:host {:display "block" :height "100%"}]
  [:.wrap {:height "100%"
           :overflow "auto"
           :background "#1e293b"
           :border-radius "8px"
           :padding "16px"}]
  [:.code {:font-family "'JetBrains Mono', monospace"
           :font-size "13px"
           :line-height "1.6"
           :white-space "pre-wrap"
           :word-break "break-word"
           :color "#e2e8f0"
           :margin "0"}]
  [:.comment  {:color "#64748b"}]
  [:.string   {:color "#a5d6ff"}]
  [:.keyword  {:color "#7dd3fc"}]
  [:.number   {:color "#fbbf24"}]
  [:.special  {:color "#c084fc"}]
  [:.boolean  {:color "#f472b6"}]
  [:.loading  {:color "#94a3b8" :font-style "italic"}]
  [:.error    {:color "#f87171"}])

(defc code-viewer
  {:props {:source "string" :mode "string"}
   :style [viewer-styles]}
  [{:keys [source mode]}]
  (let [compiled-js (atom nil)
        compile-err (atom nil)
        compiling   (atom false)]
    (fn []
      (cond
        (= mode "cljs")
        [:div {:class "wrap"}
         [:pre {:class "code"} (hl/highlight source)]]

        (= mode "js")
        (do
          ;; Trigger compilation on render if not started
          (when (and (nil? @compiled-js) (nil? @compile-err) (not @compiling))
            (reset! compiling true)
            (-> (js/import "@clojurewasm/kiso")
                (.then (fn [mod]
                         (let [result (.compile mod source)]
                           (reset! compiled-js result)
                           (reset! compiling false))))
                (.catch (fn [err]
                          (reset! compile-err (str err))
                          (reset! compiling false)))))
          [:div {:class "wrap"}
           [:pre {:class "code"}
            (cond
              @compiling   [:span {:class "loading"} "Compiling..."]
              @compile-err [:span {:class "error"} @compile-err]
              @compiled-js @compiled-js
              :else        [:span {:class "loading"} "Compiling..."])]])

        :else
        [:div {:class "wrap"}
         [:pre {:class "code"} source]]))))
