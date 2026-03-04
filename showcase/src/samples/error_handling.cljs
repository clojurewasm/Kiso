(ns showcase.samples.error-handling)

;; Basic try/catch/finally
(def result
  (try
    (/ 10 2)
    (catch js/Error e
      (str "Error: " (.-message e)))
    (finally
      (println "division done"))))

;; Catching specific error types
(defn safe-parse [s]
  (try
    (js/JSON.parse s)
    (catch js/Error e
      {:error (.-message e) :input s})))

(def good (safe-parse "{\"a\": 1}"))
(def bad (safe-parse "not json"))

;; throw: raise an error
(defn safe-divide [a b]
  (if (zero? b)
    (throw (js/Error. "Division by zero"))
    (/ a b)))

(def div-ok (safe-divide 10 3))
(def div-err
  (try
    (safe-divide 10 0)
    (catch js/Error e
      (.-message e))))

;; Practical: safe property access
(defn safe-get [obj path]
  (try
    (reduce aget obj path)
    (catch js/Error _e
      nil)))

(def nested (js-obj "a" (js-obj "b" 42)))
(def found (safe-get nested ["a" "b"]))
(def missing (safe-get nested ["x" "y"]))

;; Re-throwing after logging
(defn process [data]
  (try
    (when (nil? data)
      (throw (js/Error. "data is nil")))
    (str "processed: " data)
    (catch js/Error e
      (println "Error in process:" (.-message e))
      (throw e))))
