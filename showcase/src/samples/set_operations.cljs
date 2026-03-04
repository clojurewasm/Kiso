(ns showcase.samples.set-operations
  (:require [clojure.set :as cset]))

;; Basic set operations
(def a #{1 2 3 4 5})
(def b #{3 4 5 6 7})

(def union-ab (cset/union a b))
(def inter-ab (cset/intersection a b))
(def diff-ab (cset/difference a b))

;; subset? / superset?
(def small #{1 2})
(def is-sub (cset/subset? small a))
(def is-sup (cset/superset? a small))

;; Sets as functions (lookup)
(def fruits #{"apple" "banana" "cherry"})
(def has-apple (fruits "apple"))
(def has-grape (fruits "grape"))

;; select: filter a set by predicate
(def evens (cset/select even? #{1 2 3 4 5 6}))

;; Practical: tag intersection
(def alice-skills #{"clojure" "javascript" "rust"})
(def bob-skills #{"python" "javascript" "go"})
(def shared-skills (cset/intersection alice-skills bob-skills))
(def all-skills (cset/union alice-skills bob-skills))
(def alice-only (cset/difference alice-skills bob-skills))

;; rename-keys
(def record {:name "Alice" :age 30})
(def renamed (cset/rename-keys record {:name :full-name :age :years}))

;; map-invert
(def codes {:us "United States" :jp "Japan"})
(def inverted (cset/map-invert codes))
