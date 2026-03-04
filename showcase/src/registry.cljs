(ns showcase.registry)

;; Sample registry: ordered list of samples with metadata
(def samples
  [{:id "counter"          :label "Counter"          :category :components :live true}
   {:id "todo"             :label "Todo App"         :category :components :live true}
   {:id "task-manager"     :label "Task Manager"     :category :components :live true}
   {:id "toggle-switch"   :label "Toggle Switch"   :category :components :live true}
   {:id "accordion"       :label "Accordion"       :category :components :live true}
   {:id "tabs"            :label "Tab Panel"        :category :components :live true}
   {:id "progress-bar"    :label "Progress Bar"     :category :components :live true}
   {:id "modal-dialog"    :label "Modal Dialog"     :category :components :live true}
   {:id "dropdown-select" :label "Dropdown Select"  :category :components :live true}
   {:id "data-table"      :label "Data Table"       :category :components :live true}
   {:id "basics"           :label "Basics"           :category :code}
   {:id "data-structures"  :label "Data Structures"  :category :code}
   {:id "higher-order"     :label "Higher-Order Fns" :category :code}
   {:id "destructuring"    :label "Destructuring"    :category :code}
   {:id "threading"        :label "Threading"        :category :code}
   {:id "protocols"        :label "Protocols"        :category :code}
   {:id "interop"          :label "JS Interop"       :category :code}
   {:id "atoms-and-state"  :label "Atoms & State"    :category :code}
   {:id "loop-recur"       :label "Loop & Recur"     :category :code}
   {:id "regex"            :label "Regular Expressions" :category :code}
   {:id "string-operations" :label "String Operations" :category :code}
   {:id "set-operations"   :label "Set Operations"   :category :code}
   {:id "sequences"        :label "Sequences & Lazy" :category :code}
   {:id "multimethods"     :label "Multimethods"     :category :code}
   {:id "error-handling"   :label "Error Handling"   :category :code}])

(def categories
  [{:key :components :label "Components"}
   {:key :code       :label "Code Samples"}])

(defn sample-by-id [id]
  (first (filter (fn [s] (= (:id s) id)) samples)))

(def default-sample "counter")
