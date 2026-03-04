(ns showcase.samples.interop)

;; Property access
(def title (.-title js/document))

;; Method call
(def upper (.toUpperCase "hello"))

;; js/ global access
(def now (js/Date.now))

;; Constructor
(def date (new js/Date 2025 0 1))
(def year (.getFullYear date))

;; aget / aset on JS arrays
(def arr (js-array 10 20 30))
(aset arr 1 99)
(def second-val (aget arr 1))

;; js-obj
(def config (js-obj "host" "localhost" "port" 8080))
(def host (aget config "host"))

;; Chained property access
(def len (.-length (.keys js/Object config)))

;; Dynamic property set via set!
(def obj (js-obj))
(set! (.-greeting obj) "hello")
