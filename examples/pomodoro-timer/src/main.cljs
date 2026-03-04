(ns pomodoro-timer.core
  (:require [su.core :as su :refer [defc defstyle]]))

(def work-secs (* 25 60))
(def break-secs (* 5 60))

(defn format-time [secs]
  (let [m (quot secs 60)
        s (rem secs 60)]
    (str (when (< m 10) "0") m ":" (when (< s 10) "0") s)))

;; -- Styles --

(defstyle pomo-styles
  [:host {:display "block"
          :font-family "'Inter', system-ui, sans-serif"
          :text-align "center"}]
  [:.card {:max-width "360px"
           :margin "0 auto"
           :padding "40px 24px"
           :background "#fff"
           :border-radius "16px"
           :box-shadow "0 4px 20px rgba(0,0,0,0.08)"}]
  [:.mode {:font-size "14px"
           :font-weight "600"
           :text-transform "uppercase"
           :letter-spacing "2px"
           :margin-bottom "8px"}]
  [:.mode.work {:color "#ef4444"}]
  [:.mode.break-mode {:color "#22c55e"}]
  [:.time {:font-size "72px"
           :font-weight "200"
           :color "#1e293b"
           :font-variant-numeric "tabular-nums"
           :margin "8px 0 24px"}]
  [:.controls {:display "flex"
               :gap "12px"
               :justify-content "center"}]
  [:.btn {:padding "10px 28px"
          :font-size "15px"
          :font-weight "500"
          :border "none"
          :border-radius "8px"
          :cursor "pointer"
          :transition "background 0.15s"}]
  [:.btn-start {:background "#6366f1" :color "#fff"}
   [:&:hover {:background "#4f46e5"}]]
  [:.btn-reset {:background "#e2e8f0" :color "#475569"}
   [:&:hover {:background "#cbd5e1"}]]
  [:.sessions {:margin-top "24px"
               :font-size "13px"
               :color "#94a3b8"}])

;; -- Component --

(defc pomodoro-app
  {:style [pomo-styles]}
  []
  (let [remaining (atom work-secs)
        running (atom false)
        is-work (atom true)
        sessions (atom 0)
        timer-id (atom nil)]
    (su/on-unmount
     (fn []
       (when @timer-id (js/clearInterval @timer-id))))
    (letfn [(tick []
              (swap! remaining dec)
              (when (<= @remaining 0)
                (when @timer-id (js/clearInterval @timer-id))
                (reset! timer-id nil)
                (reset! running false)
                (if @is-work
                  (do (swap! sessions inc)
                      (reset! is-work false)
                      (reset! remaining break-secs))
                  (do (reset! is-work true)
                      (reset! remaining work-secs)))))
            (toggle! []
              (if @running
                (do (when @timer-id (js/clearInterval @timer-id))
                    (reset! timer-id nil)
                    (reset! running false))
                (do (reset! running true)
                    (reset! timer-id (js/setInterval tick 1000)))))
            (reset-timer! []
              (when @timer-id (js/clearInterval @timer-id))
              (reset! timer-id nil)
              (reset! running false)
              (reset! is-work true)
              (reset! remaining work-secs))]
      [:div {:class "card"}
       [:div {:class (fn [] (str "mode" (if @is-work " work" " break-mode")))}
        (fn [] (if @is-work "Work" "Break"))]
       [:div {:class "time"} (fn [] (format-time @remaining))]
       [:div {:class "controls"}
        [:button {:class "btn btn-start"
                  :on-click (fn [_] (toggle!))}
         (fn [] (if @running "Pause" "Start"))]
        [:button {:class "btn btn-reset"
                  :on-click (fn [_] (reset-timer!))}
         "Reset"]]
       [:div {:class "sessions"}
        (fn [] (str "Sessions completed: " @sessions))]])))

(su/mount (js/document.getElementById "app") [::pomodoro-app])
