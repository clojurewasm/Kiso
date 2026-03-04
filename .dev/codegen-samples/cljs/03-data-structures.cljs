(ns sample.data-structures)

(def colors [:red :green :blue])

(def config {:host "localhost"
             :port 8080
             :debug true})

(def unique-ids #{1 2 3 4 5})

(defn get-host []
  (:host config))
