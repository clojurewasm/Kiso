(ns sample.let-loop)

(defn factorial [n]
  (loop [i n acc 1]
    (if (<= i 1)
      acc
      (recur (dec i) (* acc i)))))

(defn sum-range [start end]
  (let [n (- end start)]
    (/ (* n (+ start end)) 2)))
