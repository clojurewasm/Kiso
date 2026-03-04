(ns showcase.samples.loop-recur)

;; Basic loop/recur: factorial
(defn factorial [n]
  (loop [i n acc 1]
    (if (<= i 1)
      acc
      (recur (dec i) (* acc i)))))

(def fact-10 (factorial 10))

;; Fibonacci with loop/recur
(defn fibonacci [n]
  (loop [i 0 a 0 b 1]
    (if (= i n)
      a
      (recur (inc i) b (+ a b)))))

(def fib-10 (fibonacci 10))

;; dotimes: side effects n times
(def log (atom []))
(dotimes [i 5]
  (swap! log conj (str "step-" i)))

;; while: loop with condition
(def x (atom 1))
(while (< @x 100)
  (swap! x * 2))

;; recur in fn (tail-call)
(defn sum-to [n]
  (loop [i 1 total 0]
    (if (> i n)
      total
      (recur (inc i) (+ total i)))))

(def sum-100 (sum-to 100))
