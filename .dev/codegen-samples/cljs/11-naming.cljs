(ns sample.naming)

(defn empty? [coll]
  (= 0 (count coll)))

(defn valid? [x]
  (not (nil? x)))

(defn add! [coll item]
  (conj coll item))

(def max-retries 3)
(def *debug* false)
(def foo->bar identity)
(def a=b 42)
