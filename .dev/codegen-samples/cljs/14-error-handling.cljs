(ns sample.error-handling)

(defn safe-divide [a b]
  (if (= b 0)
    (throw (js/Error. "Division by zero"))
    (/ a b)))

(defn parse-int [s]
  (try
    (let [n (js/parseInt s 10)]
      (if (js/isNaN n)
        nil
        n))
    (catch js/Error e
      (println "Parse error:" (.-message e))
      nil)))
