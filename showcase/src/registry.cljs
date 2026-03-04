(ns showcase.registry)

;; Sample registry: ordered list of samples with metadata
(def samples
  [{:id "counter"          :label "Counter"          :category :components :live true}
   {:id "todo"             :label "Todo App"         :category :components :live true}
   {:id "task-manager"     :label "Task Manager"     :category :components :live true}
   {:id "basics"           :label "Basics"           :category :code}
   {:id "data-structures"  :label "Data Structures"  :category :code}
   {:id "higher-order"     :label "Higher-Order Fns" :category :code}
   {:id "destructuring"    :label "Destructuring"    :category :code}
   {:id "threading"        :label "Threading"        :category :code}
   {:id "protocols"        :label "Protocols"        :category :code}])

(def categories
  [{:key :components :label "Components"}
   {:key :code       :label "Code Samples"}])

(defn sample-by-id [id]
  (first (filter (fn [s] (= (:id s) id)) samples)))

(def default-sample "counter")
