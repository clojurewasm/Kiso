(ns showcase.samples.string-operations
  (:require [clojure.string :as str]))

;; split and join
(def words (str/split "hello world foo" #" "))
(def rejoined (str/join ", " words))

;; replace
(def censored (str/replace "damn bad ugly" #"\w{3,4}" "***"))

;; trim family
(def trimmed (str/trim "  hello  "))
(def left-trimmed (str/triml "  hello  "))
(def right-trimmed (str/trimr "  hello  "))

;; Case conversion
(def upper (str/upper-case "hello"))
(def lower (str/lower-case "HELLO"))
(def capped (str/capitalize "hello world"))

;; Predicates
(def starts (str/starts-with? "foobar" "foo"))
(def ends (str/ends-with? "foobar" "bar"))
(def has-it (str/includes? "foobar" "oba"))

;; blank? checks nil, empty, whitespace
(def b1 (str/blank? ""))
(def b2 (str/blank? "  "))
(def b3 (str/blank? "hi"))

;; Practical: title case
(defn title-case [s]
  (str/join " " (map str/capitalize (str/split s #" "))))

(def titled (title-case "hello beautiful world"))
