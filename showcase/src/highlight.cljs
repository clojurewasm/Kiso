(ns showcase.highlight
  (:require [clojure.string]))

;; Minimal regex-based CLJS syntax highlighter
;; Returns a vector of [:span {:class "..."} text] hiccup elements

(def rules
  [;; Comments
   {:re ";[^\n]*"     :cls "comment"}
   ;; Strings
   {:re "\"[^\"\\\\]*(?:\\\\.[^\"\\\\]*)*\"" :cls "string"}
   ;; Keywords
   {:re ":[a-zA-Z_\\-][a-zA-Z0-9_\\-./]*" :cls "keyword"}
   ;; Numbers
   {:re "\\b[0-9][0-9.]*\\b" :cls "number"}
   ;; Special forms / macros
   {:re "\\b(?:ns|def|defn|defonce|defmacro|defprotocol|deftype|defrecord|defmulti|defmethod|defc|defstyle|fn|if|when|when-let|when-not|cond|case|let|loop|recur|do|try|catch|throw|require|import|quote|var|set!|new)\\b" :cls "special"}
   ;; Booleans / nil
   {:re "\\b(?:true|false|nil)\\b" :cls "boolean"}])

(defn- build-pattern []
  (let [parts (map (fn [r] (str "(" (:re r) ")")) rules)]
    (js/RegExp. (clojure.string/join "|" parts) "g")))

(defn highlight [source]
  (let [pattern (build-pattern)
        result (atom [])
        last-idx (atom 0)
        len (count source)]
    ;; Use exec loop
    (loop []
      (let [m (.exec pattern source)]
        (when m
          (let [start (.-index m)
                text (aget m 0)]
            ;; Plain text before match
            (when (> start @last-idx)
              (swap! result conj (.substring source @last-idx start)))
            ;; Find which group matched
            (let [cls (loop [i 0]
                        (if (>= i (count rules))
                          nil
                          (if (some? (aget m (inc i)))
                            (:cls (nth rules i))
                            (recur (inc i)))))]
              (swap! result conj [:span {:class (or cls "")} text]))
            (reset! last-idx (+ start (count text))))
          (recur))))
    ;; Trailing text
    (when (< @last-idx len)
      (swap! result conj (.substring source @last-idx len)))
    @result))
