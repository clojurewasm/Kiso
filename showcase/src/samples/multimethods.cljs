(ns showcase.samples.multimethods)

;; Dispatch by type keyword
(defmulti area :shape)

(defmethod area :circle [{:keys [radius]}]
  (* js/Math.PI radius radius))

(defmethod area :rectangle [{:keys [width height]}]
  (* width height))

(defmethod area :triangle [{:keys [base height]}]
  (/ (* base height) 2))

(defmethod area :default [shape]
  (str "Unknown shape: " (:shape shape)))

(def circle-area (area {:shape :circle :radius 5}))
(def rect-area (area {:shape :rectangle :width 4 :height 6}))
(def tri-area (area {:shape :triangle :base 3 :height 8}))

;; Dispatch by computed value
(defmulti greeting (fn [person] (:language person)))

(defmethod greeting :en [{:keys [name]}]
  (str "Hello, " name "!"))

(defmethod greeting :ja [{:keys [name]}]
  (str "こんにちは、" name "！"))

(defmethod greeting :es [{:keys [name]}]
  (str "¡Hola, " name "!"))

(defmethod greeting :default [{:keys [name]}]
  (str "Hi, " name "!"))

(def g1 (greeting {:name "Alice" :language :en}))
(def g2 (greeting {:name "太郎" :language :ja}))
(def g3 (greeting {:name "Carlos" :language :es}))

;; Dispatch by arity-like pattern
(defmulti describe (fn [x] (cond
                             (number? x) :number
                             (string? x) :string
                             (coll? x) :collection
                             :else :other)))

(defmethod describe :number [x] (str x " is a number"))
(defmethod describe :string [x] (str "\"" x "\" is a string"))
(defmethod describe :collection [x] (str "collection with " (count x) " items"))
(defmethod describe :other [_x] "something else")
