(ns markdown-editor.core
  (:require [su.core :as su :refer [defc defstyle]]
            [clojure.string :as string]))

;; -- Simple markdown to hiccup --

(defn md-line->hiccup [line]
  (cond
    (string/starts-with? line "### ") [:h3 (.substring line 4)]
    (string/starts-with? line "## ")  [:h2 (.substring line 3)]
    (string/starts-with? line "# ")   [:h1 (.substring line 2)]
    (string/starts-with? line "- ")   [:li (.substring line 2)]
    (string/starts-with? line "> ")   [:blockquote (.substring line 2)]
    (string/blank? line)              [:br]
    :else                             [:p line]))

(defn markdown->hiccup [text]
  (into [:div] (map md-line->hiccup (string/split text #"\n"))))

;; -- Styles --

(defstyle editor-styles
  [:host {:display "block"
          :font-family "'Inter', system-ui, sans-serif"}]
  [:.app {:max-width "900px"
          :margin "0 auto"
          :background "#fff"
          :border-radius "16px"
          :padding "24px"
          :box-shadow "0 4px 20px rgba(0,0,0,0.08)"}]
  [:.title {:font-size "22px"
            :font-weight "600"
            :color "#1e293b"
            :margin-bottom "16px"}]
  [:.panes {:display "grid"
            :grid-template-columns "1fr 1fr"
            :gap "16px"
            :min-height "400px"}]
  [:.pane-label {:font-size "12px"
                 :font-weight "600"
                 :color "#94a3b8"
                 :text-transform "uppercase"
                 :letter-spacing "1px"
                 :margin-bottom "8px"}]
  [:textarea {:width "100%"
              :height "100%"
              :min-height "380px"
              :padding "12px"
              :border "1px solid #e2e8f0"
              :border-radius "8px"
              :font-family "'JetBrains Mono', 'Fira Code', monospace"
              :font-size "13px"
              :line-height "1.6"
              :resize "vertical"
              :outline "none"
              :color "#334155"}
   [:&:focus {:border-color "#6366f1"}]]
  [:.preview {:padding "16px"
              :border "1px solid #e2e8f0"
              :border-radius "8px"
              :font-size "14px"
              :line-height "1.6"
              :color "#334155"
              :overflow-y "auto"
              :max-height "420px"}]
  [:.preview>h1 {:font-size "24px" :font-weight "700" :margin "8px 0" :color "#1e293b"}]
  [:.preview>h2 {:font-size "20px" :font-weight "600" :margin "8px 0" :color "#1e293b"}]
  [:.preview>h3 {:font-size "16px" :font-weight "600" :margin "6px 0" :color "#334155"}]
  [:.preview>p {:margin "4px 0"}]
  [:.preview>li {:margin-left "20px" :list-style "disc"}]
  [:.preview>blockquote {:border-left "3px solid #6366f1"
                         :padding-left "12px"
                         :color "#64748b"
                         :font-style "italic"
                         :margin "8px 0"}])

(def sample-md "# Hello Kiso\n\nThis is a markdown editor built with ClojureScript.\n\n## Features\n\n- Real-time preview\n- Basic markdown support\n- Built with su framework\n\n> Clojure is a language that gets out of your way.\n\n### Try editing this text!")

;; -- Component --

(defc editor-app
  {:style [editor-styles]}
  []
  (let [source (atom sample-md)]
    [:div {:class "app"}
     [:div {:class "title"} "Markdown Editor"]
     [:div {:class "panes"}
      [:div
       [:div {:class "pane-label"} "Markdown"]
       [:textarea {:on-input (fn [e] (reset! source (.-value (.-target e))))}
        sample-md]]
      [:div
       [:div {:class "pane-label"} "Preview"]
       [:div {:class "preview"}
        (fn []
          (try
            (markdown->hiccup @source)
            (catch js/Error _e
              [:div {:style {:color "#ef4444"}} "Parse error"])))]]]]))

(su/mount (js/document.getElementById "app") [::editor-app])
