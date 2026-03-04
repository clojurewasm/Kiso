(ns showcase.samples.string-operations
  (:require [clojure.string :as string]))

;; split and join
(def words (string/split "hello world foo" #" "))
(def rejoined (string/join ", " words))

;; replace
(def censored (string/replace "damn bad ugly" #"\w{3,4}" "***"))

;; trim family
(def trimmed (string/trim "  hello  "))
(def left-trimmed (string/triml "  hello  "))
(def right-trimmed (string/trimr "  hello  "))

;; Case conversion
(def upper (string/upper-case "hello"))
(def lower (string/lower-case "HELLO"))
(def capped (string/capitalize "hello world"))

;; Predicates
(def starts (string/starts-with? "foobar" "foo"))
(def ends (string/ends-with? "foobar" "bar"))
(def has-it (string/includes? "foobar" "oba"))

;; blank? checks nil, empty, whitespace
(def b1 (string/blank? ""))
(def b2 (string/blank? "  "))
(def b3 (string/blank? "hi"))

;; Practical: title case
(defn title-case [s]
  (string/join " " (map string/capitalize (string/split s #" "))))

(def titled (title-case "hello beautiful world"))
