(ns showcase.samples.destructuring)

(defn process-user [{:keys [name age email]}]
  (str name " (" age ") - " email))

(defn first-two [[a b & rest]]
  [a b (count rest)])
