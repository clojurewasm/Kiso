(ns showcase.main
  (:require [showcase.app :as app]))

(app/init! (js/document.getElementById "app"))
