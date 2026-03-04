(ns showcase.samples.sequences)

;; lazy-seq: infinite sequence of natural numbers
(defn naturals
  ([] (naturals 0))
  ([n] (lazy-seq (cons n (naturals (inc n))))))

(def first-10 (take 10 (naturals)))

;; iterate: repeated function application
(def powers-of-2 (take 10 (iterate (fn [x] (* x 2)) 1)))

;; cycle: infinite repetition
(def cycled (take 7 (cycle [1 2 3])))

;; partition: split into groups
(def pairs (partition 2 (range 10)))
(def triples (partition-all 3 (range 10)))

;; partition-by: split when predicate changes
(def grouped (partition-by even? [1 1 2 2 3 3 4]))

;; reductions: intermediate reduce results
(def running-sum (reductions + (range 1 6)))

;; take-while / drop-while
(def small-nums (take-while (fn [x] (< x 5)) (range 10)))
(def after-5 (drop-while (fn [x] (< x 5)) (range 10)))

;; interleave / interpose
(def merged (interleave [:a :b :c] [1 2 3]))
(def with-sep (interpose "," ["a" "b" "c"]))

;; mapcat: map + concat
(def expanded (mapcat (fn [x] [x (* x x)]) [1 2 3 4]))

;; keep: map, dropping nils
(def parsed (keep (fn [s] (re-find #"\d+" s)) ["a1" "bb" "c3"]))
