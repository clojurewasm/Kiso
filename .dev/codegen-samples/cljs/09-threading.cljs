(ns sample.threading)

(defn process [data]
  (-> data
      (assoc :processed true)
      (assoc :timestamp (js/Date.now))))

(defn transform [items]
  (->> items
       (filter :active)
       (map :name)
       (map clojure.string/upper-case)))
