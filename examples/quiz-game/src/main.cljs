(ns quiz-game.core
  (:require [su.core :as su :refer [defc defstyle]]))

;; -- Quiz data --

(def questions
  [{:q "What is the primary data structure for ordered sequences in Clojure?"
    :choices ["List" "Vector" "Map" "Set"]
    :answer 1}
   {:q "Which macro creates a lazy sequence?"
    :choices ["loop" "lazy-seq" "recur" "delay"]
    :answer 1}
   {:q "What does (conj [1 2] 3) return?"
    :choices ["[3 1 2]" "[1 2 3]" "(1 2 3)" "Error"]
    :answer 1}
   {:q "Which function dispatches on type in Clojure?"
    :choices ["defn" "defrecord" "defmulti" "deftype"]
    :answer 2}
   {:q "What does @ (deref) do?"
    :choices ["Creates an atom" "Resets an atom" "Reads an atom's value" "Swaps an atom"]
    :answer 2}])

;; -- Styles --

(defstyle quiz-styles
  [:host {:display "block"
          :font-family "'Inter', system-ui, sans-serif"}]
  [:.card {:max-width "520px"
           :margin "0 auto"
           :background "#fff"
           :border-radius "16px"
           :padding "32px"
           :box-shadow "0 4px 20px rgba(0,0,0,0.08)"}]
  [:.progress {:font-size "13px"
               :color "#94a3b8"
               :margin-bottom "8px"}]
  [:.question {:font-size "18px"
               :font-weight "600"
               :color "#1e293b"
               :margin-bottom "20px"
               :line-height "1.4"}]
  [:.choices {:display "flex"
              :flex-direction "column"
              :gap "8px"}]
  [:.choice {:padding "12px 16px"
             :border "2px solid #e2e8f0"
             :border-radius "8px"
             :cursor "pointer"
             :font-size "14px"
             :color "#334155"
             :background "#fff"
             :text-align "left"
             :transition "border-color 0.15s, background 0.15s"}
   [:&:hover {:border-color "#6366f1" :background "#eef2ff"}]]
  [:.choice.correct {:border-color "#22c55e" :background "#f0fdf4" :color "#166534"}]
  [:.choice.wrong {:border-color "#ef4444" :background "#fef2f2" :color "#991b1b"}]
  [:.choice.disabled {:cursor "default" :opacity "0.7"}]
  [:.next-btn {:margin-top "20px"
               :padding "10px 24px"
               :background "#6366f1"
               :color "#fff"
               :border "none"
               :border-radius "8px"
               :font-size "14px"
               :font-weight "500"
               :cursor "pointer"}
   [:&:hover {:background "#4f46e5"}]]
  [:.result {:text-align "center"}]
  [:.score {:font-size "48px"
            :font-weight "700"
            :color "#6366f1"
            :margin "16px 0"}]
  [:.msg {:font-size "16px"
          :color "#475569"
          :margin-bottom "20px"}])

;; -- Component --

(defc quiz-app
  {:style [quiz-styles]}
  []
  (let [idx (atom 0)
        score (atom 0)
        answered (atom nil)
        finished (atom false)]
    (letfn [(select-answer [choice-idx]
              (when (nil? @answered)
                (let [q (nth questions @idx)
                      correct (= choice-idx (:answer q))]
                  (reset! answered {:chosen choice-idx :correct correct})
                  (when correct (swap! score inc)))))
            (next-question []
              (reset! answered nil)
              (if (< (inc @idx) (count questions))
                (swap! idx inc)
                (reset! finished true)))
            (restart []
              (reset! idx 0)
              (reset! score 0)
              (reset! answered nil)
              (reset! finished false))]
      (fn []
        (if @finished
          [:div {:class "card"}
           [:div {:class "result"}
            [:div {:class "question"} "Quiz Complete!"]
            [:div {:class "score"} (str @score "/" (count questions))]
            [:div {:class "msg"}
             (cond
               (= @score (count questions)) "Perfect score!"
               (>= @score 3) "Great job!"
               :else "Keep learning!")]
            [:button {:class "next-btn" :on-click (fn [_] (restart))} "Try Again"]]]
          (let [q (nth questions @idx)
                ans @answered]
            [:div {:class "card"}
             [:div {:class "progress"}
              (str "Question " (inc @idx) " of " (count questions))]
             [:div {:class "question"} (:q q)]
             [:div {:class "choices"}
              (map-indexed
               (fn [i choice]
                 (let [cls (cond
                             (nil? ans) "choice"
                             (= i (:answer q)) "choice correct"
                             (= i (:chosen ans)) "choice wrong"
                             :else "choice disabled")]
                   [:button {:class cls
                             :on-click (fn [_] (select-answer i))}
                    choice]))
               (:choices q))]
             (when ans
               [:button {:class "next-btn"
                         :on-click (fn [_] (next-question))}
                (if (< (inc @idx) (count questions)) "Next" "See Results")])]))))))

(su/mount (js/document.getElementById "app") [::quiz-app])
