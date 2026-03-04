(ns app.utils)

(defn format-count [n label]
  (str n " " label (if (not= n 1) "s" "")))

(defn truncate [s max-len]
  (if (> (count s) max-len)
    (str (.slice s 0 max-len) "...")
    s))

(defn timestamp []
  (let [d (js/Date.)]
    (str (.getHours d) ":" (.getMinutes d))))
