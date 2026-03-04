(ns contact-book.core
  (:require [su.core :as su :refer [defc defstyle]]
            [clojure.string :as string]))

;; -- Sample data --

(def initial-contacts
  [{:id 1 :name "Alice Johnson" :email "alice@example.com" :tags #{"engineering" "team-lead"}}
   {:id 2 :name "Bob Smith" :email "bob@example.com" :tags #{"design" "ux"}}
   {:id 3 :name "Charlie Brown" :email "charlie@example.com" :tags #{"engineering" "backend"}}
   {:id 4 :name "Diana Prince" :email "diana@example.com" :tags #{"management"}}
   {:id 5 :name "Eve Williams" :email "eve@example.com" :tags #{"engineering" "frontend"}}])

;; -- Helpers --

(defn matches-search? [contact query]
  (let [q (string/lower-case query)]
    (or (string/includes? (string/lower-case (:name contact)) q)
        (string/includes? (string/lower-case (:email contact)) q))))

(defn all-tags [contacts]
  (reduce (fn [acc c] (into acc (:tags c))) #{} contacts))

;; -- Styles --

(defstyle contact-styles
  [:host {:display "block"
          :font-family "'Inter', system-ui, sans-serif"}]
  [:.app {:max-width "560px"
          :margin "0 auto"
          :background "#fff"
          :border-radius "16px"
          :padding "24px"
          :box-shadow "0 4px 20px rgba(0,0,0,0.08)"}]
  [:.title {:font-size "22px"
            :font-weight "600"
            :color "#1e293b"
            :margin-bottom "16px"}]
  [:.search {:width "100%"
             :padding "10px 14px"
             :border "1px solid #d1d5db"
             :border-radius "8px"
             :font-size "14px"
             :margin-bottom "12px"
             :outline "none"}
   [:&:focus {:border-color "#6366f1"}]]
  [:.tags {:display "flex"
           :gap "6px"
           :flex-wrap "wrap"
           :margin-bottom "16px"}]
  [:.tag {:padding "4px 12px"
          :border-radius "20px"
          :font-size "12px"
          :cursor "pointer"
          :border "1px solid #e2e8f0"
          :background "#fff"
          :color "#64748b"
          :transition "all 0.15s"}
   [:&:hover {:border-color "#6366f1"}]]
  [:.tag.active {:background "#6366f1"
                 :color "#fff"
                 :border-color "#6366f1"}]
  [:.list {:border-top "1px solid #f1f5f9"}]
  [:.contact {:display "flex"
              :align-items "center"
              :padding "12px 0"
              :border-bottom "1px solid #f1f5f9"
              :gap "12px"}]
  [:.avatar {:width "40px"
             :height "40px"
             :border-radius "50%"
             :background "#6366f1"
             :color "#fff"
             :display "flex"
             :align-items "center"
             :justify-content "center"
             :font-weight "600"
             :font-size "16px"
             :flex-shrink "0"}]
  [:.info {:flex "1"}]
  [:.name {:font-size "14px" :font-weight "500" :color "#1e293b"}]
  [:.email {:font-size "12px" :color "#94a3b8"}]
  [:.contact-tags {:display "flex" :gap "4px" :margin-top "4px"}]
  [:.contact-tag {:font-size "10px"
                  :padding "2px 8px"
                  :border-radius "10px"
                  :background "#f1f5f9"
                  :color "#64748b"}]
  [:.count {:font-size "13px"
            :color "#94a3b8"
            :margin-bottom "8px"}]
  [:.empty {:text-align "center"
            :color "#94a3b8"
            :padding "24px"
            :font-size "14px"}])

;; -- Component --

(defc contact-app
  {:style [contact-styles]}
  []
  (let [contacts (atom initial-contacts)
        search (atom "")
        tag-filter (atom nil)]
    [:div {:class "app"}
     [:div {:class "title"} "Contact Book"]
     [:input {:class "search"
              :placeholder "Search by name or email..."
              :on-input (fn [e] (reset! search (.-value (.-target e))))}]
     (fn []
       (let [tags (sort (all-tags @contacts))]
         [:div {:class "tags"}
          [:button {:class (str "tag" (when (nil? @tag-filter) " active"))
                    :on-click (fn [_] (reset! tag-filter nil))}
           "All"]
          (map (fn [t]
                 [:button {:class (str "tag" (when (= @tag-filter t) " active"))
                           :on-click (fn [_]
                                       (reset! tag-filter
                                               (if (= @tag-filter t) nil t)))}
                  t])
               tags)]))
     (fn []
       (let [q @search
             tf @tag-filter
             filtered (filter (fn [c]
                                (and (or (string/blank? q) (matches-search? c q))
                                     (or (nil? tf) (contains? (:tags c) tf))))
                              @contacts)
             sorted (sort-by :name filtered)]
         [:div
          [:div {:class "count"} (str (count sorted) " contacts")]
          (if (empty? sorted)
            [:div {:class "empty"} "No contacts match your search."]
            [:div {:class "list"}
             (map (fn [c]
                    [:div {:class "contact"}
                     [:div {:class "avatar"}
                      (first (:name c))]
                     [:div {:class "info"}
                      [:div {:class "name"} (:name c)]
                      [:div {:class "email"} (:email c)]
                      [:div {:class "contact-tags"}
                       (map (fn [t]
                              [:span {:class "contact-tag"} t])
                            (sort (:tags c)))]]])
                  sorted)])]))]))

(su/mount (js/document.getElementById "app") [::contact-app])
