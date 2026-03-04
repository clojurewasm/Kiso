(ns sample.higher-order)

(defn apply-twice [f x]
  (f (f x)))

(defn make-adder [n]
  (fn [x] (+ n x)))

(def add5 (make-adder 5))
