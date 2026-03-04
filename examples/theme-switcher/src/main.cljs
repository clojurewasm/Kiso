(ns theme-switcher.core
  (:require [su.core :as su :refer [defc defstyle]]))

;; -- Theme definitions --

(def themes
  {:light {:bg "#f8fafc" :surface "#ffffff" :text "#1e293b"
           :accent "#6366f1" :muted "#94a3b8" :border "#e2e8f0"}
   :dark  {:bg "#0f172a" :surface "#1e293b" :text "#f1f5f9"
           :accent "#818cf8" :muted "#64748b" :border "#334155"}
   :warm  {:bg "#fef3c7" :surface "#fffbeb" :text "#78350f"
           :accent "#d97706" :muted "#a16207" :border "#fcd34d"}})

;; -- Styles --

(defstyle app-styles
  [:host {:display "block"
          :font-family "'Inter', system-ui, sans-serif"
          :transition "background 0.3s, color 0.3s"}]
  [:.page {:min-height "100vh"
           :padding "40px 20px"
           :transition "background 0.3s"}]
  [:.card {:max-width "480px"
           :margin "0 auto"
           :border-radius "16px"
           :padding "32px"
           :transition "background 0.3s, border-color 0.3s"
           :border "1px solid"}]
  [:.title {:font-size "22px"
            :font-weight "600"
            :margin-bottom "8px"}]
  [:.subtitle {:font-size "14px"
               :margin-bottom "24px"}]
  [:.theme-grid {:display "flex"
                 :gap "10px"
                 :margin-bottom "24px"}]
  [:.theme-btn {:padding "10px 20px"
                :border-radius "8px"
                :border "2px solid transparent"
                :font-size "14px"
                :font-weight "500"
                :cursor "pointer"
                :transition "border-color 0.2s"}]
  [:.theme-btn.active {:border-color "currentColor"}]
  [:.preview {:padding "16px"
              :border-radius "8px"
              :font-size "14px"
              :line-height "1.6"
              :transition "background 0.3s"}]
  [:.color-row {:display "flex"
                :gap "8px"
                :margin-top "16px"}]
  [:.color-dot {:width "32px"
                :height "32px"
                :border-radius "50%"
                :transition "background 0.3s"}])

;; -- Component --

(defc theme-app
  {:style [app-styles]}
  []
  (let [current-theme (atom :light)]
    (fn []
      (let [theme-key @current-theme
            t (get themes theme-key)]
        [:div {:class "page"
               :style {:background (:bg t) :color (:text t)}}
         [:div {:class "card"
                :style {:background (:surface t) :border-color (:border t)}}
          [:div {:class "title" :style {:color (:text t)}} "Theme Switcher"]
          [:div {:class "subtitle" :style {:color (:muted t)}}
           "Choose a theme to see dynamic CSS custom property switching"]
          [:div {:class "theme-grid"}
           (map (fn [k]
                  [:button {:class (str "theme-btn" (when (= k theme-key) " active"))
                            :style {:background (get-in themes [k :surface])
                                    :color (get-in themes [k :text])}
                            :on-click (fn [_] (reset! current-theme k))}
                   (name k)])
                [:light :dark :warm])]
          [:div {:class "preview"
                 :style {:background (:bg t)}}
           "This preview area adapts to the selected theme. All colors transition smoothly using inline styles driven by reactive atoms."]
          [:div {:class "color-row"}
           (map (fn [color-key]
                  [:div {:class "color-dot"
                         :style {:background (get t color-key)}}])
                [:accent :text :muted :border])]]]))))

(su/mount (js/document.getElementById "app") [::theme-app])
