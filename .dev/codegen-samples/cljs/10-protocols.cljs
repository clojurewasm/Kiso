(ns sample.protocols)

(defprotocol IGreetable
  (greet [this])
  (farewell [this name]))

(deftype Person [first-name last-name]
  IGreetable
  (greet [_this]
    (str "Hello, I'm " first-name " " last-name))
  (farewell [_this name]
    (str "Goodbye, " name "! - " first-name)))
