(ns sample.control-flow)

(defn classify [n]
  (cond
    (< n 0)   :negative
    (= n 0)   :zero
    (< n 10)  :small
    (< n 100) :medium
    :else     :large))

(defn weekday? [day]
  (case day
    (:mon :tue :wed :thu :fri) true
    (:sat :sun) false
    (throw (js/Error. "unknown day"))))
