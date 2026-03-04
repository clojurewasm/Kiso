(ns color-palette.core
  (:require [su.core :as su :refer [defc defstyle]]))

(defn hsl-str [h s l]
  (str "hsl(" h ", " s "%, " l "%)"))

(defn generate-palette [base-hue count]
  (map (fn [i]
         (let [h (rem (+ base-hue (* i (/ 360 count))) 360)
               s (+ 60 (* (rem i 3) 10))
               l (+ 45 (* (rem i 2) 15))]
           {:hue h :sat s :light l :color (hsl-str h s l)}))
       (range count)))

;; -- Styles --

(defstyle palette-styles
  [:host {:display "block"
          :font-family "'Inter', system-ui, sans-serif"}]
  [:.card {:max-width "520px"
           :margin "0 auto"
           :background "#fff"
           :border-radius "16px"
           :padding "24px"
           :box-shadow "0 4px 20px rgba(0,0,0,0.08)"}]
  [:.title {:font-size "20px"
            :font-weight "600"
            :color "#1e293b"
            :margin-bottom "16px"}]
  [:.controls {:display "flex"
               :gap "16px"
               :align-items "center"
               :margin-bottom "20px"
               :flex-wrap "wrap"}]
  [:.slider-group {:display "flex"
                   :align-items "center"
                   :gap "8px"}]
  [:.label {:font-size "13px"
            :color "#64748b"
            :font-weight "500"}]
  [:input {:accent-color "#6366f1"}]
  [:.grid {:display "grid"
           :grid-template-columns "repeat(auto-fill, minmax(80px, 1fr))"
           :gap "8px"}]
  [:.swatch {:aspect-ratio "1"
             :border-radius "12px"
             :display "flex"
             :align-items "flex-end"
             :justify-content "center"
             :padding "6px"
             :font-size "10px"
             :color "#fff"
             :text-shadow "0 1px 2px rgba(0,0,0,0.3)"
             :font-weight "500"
             :cursor "pointer"
             :transition "transform 0.15s"}
   [:&:hover {:transform "scale(1.05)"}]])

;; -- Component --

(defc palette-app
  {:style [palette-styles]}
  []
  (let [base-hue (atom 210)
        num-colors (atom 12)]
    [:div {:class "card"}
     [:div {:class "title"} "Color Palette Generator"]
     [:div {:class "controls"}
      [:div {:class "slider-group"}
       [:span {:class "label"} "Hue:"]
       [:input {:type "range" :min "0" :max "359"
                :on-input (fn [e] (reset! base-hue (js/parseInt (.-value (.-target e)))))}]
       [:span {:class "label"} (fn [] (str @base-hue "\u00B0"))]]
      [:div {:class "slider-group"}
       [:span {:class "label"} "Colors:"]
       [:input {:type "range" :min "3" :max "24"
                :on-input (fn [e] (reset! num-colors (js/parseInt (.-value (.-target e)))))}]
       [:span {:class "label"} (fn [] (str @num-colors))]]]
     (fn []
       (let [colors (generate-palette @base-hue @num-colors)]
         [:div {:class "grid"}
          (map (fn [c]
                 [:div {:class "swatch"
                        :style {:background (:color c)}}
                  (str (js/Math.round (:hue c)) "\u00B0")])
               colors)]))]))

(su/mount (js/document.getElementById "app") [::palette-app])
