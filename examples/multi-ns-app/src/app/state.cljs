(ns app.state)

(def notes (atom [] "notes"))
(def next-id (atom 0 "next-id"))

(defn add-note! [text]
  (when (not= text "")
    (let [id (swap! next-id inc)]
      (swap! notes conj {:id id :text text :created (str (js/Date.))}))))

(defn remove-note! [id]
  (swap! notes
         (fn [ns]
           (filter (fn [n] (not= (:id n) id)) ns))))
