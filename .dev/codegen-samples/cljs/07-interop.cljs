(ns sample.interop)

(defn now []
  (js/Date.))

(defn get-length [s]
  (.-length s))

(defn upper [s]
  (.toUpperCase s))

(defn fetch-json [url]
  (.then (js/fetch url)
         (fn [res] (.json res))))
