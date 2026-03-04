(ns showcase.samples.regex)

;; re-find: first match in string
(def found (re-find #"\d+" "abc 123 def"))

;; re-matches: full string must match
(def full-match (re-matches #"\d{3}-\d{4}" "555-1234"))
(def no-match (re-matches #"\d{3}-\d{4}" "hello"))

;; re-seq: all matches as sequence
(def all-nums (re-seq #"\d+" "a1 b22 c333"))

;; re-find with groups (returns vector)
(def parsed (re-find #"(\w+)@(\w+)\.(\w+)" "user@example.com"))

;; re-pattern: build regex from string
(def pat (re-pattern "foo|bar"))
(def matches (re-seq pat "foo baz bar qux foo"))

;; Practical: extract hashtags
(def tweet "Learning #clojure and #kiso today!")
(def tags (re-seq #"#\w+" tweet))

;; Practical: validate email shape
(defn valid-email? [s]
  (some? (re-matches #".+@.+\..+" s)))

(def check1 (valid-email? "a@b.com"))
(def check2 (valid-email? "not-email"))
