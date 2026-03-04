(ns sample.multi-arity)

(defn greet
  ([] (greet "World"))
  ([name] (greet name "Hello"))
  ([name greeting]
   (str greeting ", " name "!")))

(defn log [& args]
  (apply js/console.log args))
