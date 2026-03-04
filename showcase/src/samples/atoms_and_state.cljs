(ns showcase.samples.atoms-and-state)

;; Create an atom with initial value
(def counter (atom 0))

;; Dereference
(def initial @counter)

;; swap! applies a function
(swap! counter inc)
(swap! counter + 10)

;; reset! sets a new value directly
(reset! counter 42)

;; Atom with a collection
(def items (atom []))
(swap! items conj "apple")
(swap! items conj "banana")

;; Nested state with assoc-in
(def state (atom {:user {:name "Alice" :score 0}}))
(swap! state assoc-in [:user :score] 100)
(def score (get-in @state [:user :score]))

;; compare-and-set! (manual CAS)
(def flag (atom false))
(reset! flag false)
;; Only updates if current value matches expected
(.compareAndSet flag false true)
