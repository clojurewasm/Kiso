(ns sample.atoms)

(def counter (atom 0))

(defn increment! []
  (swap! counter inc))

(defn reset-counter! []
  (reset! counter 0))

(defn current-value []
  @counter)
