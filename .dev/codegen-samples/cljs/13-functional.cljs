(ns sample.functional)

(def items [{:name "Apple" :price 1.5 :qty 3}
            {:name "Banana" :price 0.5 :qty 12}
            {:name "Cherry" :price 3.0 :qty 1}])

(defn total-cost [items]
  (reduce (fn [sum item]
            (+ sum (* (:price item) (:qty item))))
          0
          items))

(defn expensive-items [items min-price]
  (filter #(> (:price %) min-price) items))

(defn item-names [items]
  (map :name items))
