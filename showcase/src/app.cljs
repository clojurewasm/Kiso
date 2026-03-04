(ns showcase.app
  (:require [clojure.string]
            [showcase.registry :as reg]
            [showcase.highlight :as hl]))

;; Helpers: source loading via JS module
(def sources-mod (js/await (js/import "./helpers/sources.js")))

(defn- get-source [id]
  (let [key (clojure.string/replace id "-" "_")]
    (aget (.-sources sources-mod) key)))

(defn- load-sample [id]
  (let [key (clojure.string/replace id "-" "_")]
    (.loadSample sources-mod key)))

;; State
(def current (atom nil))
(def active-tab (atom "preview"))
(def unmount-ref (atom nil))

;; Hash routing
(defn- get-hash []
  (let [h (.-hash js/location)]
    (if (and h (> (count h) 1))
      (.substring h 1)
      reg/default-sample)))

;; DOM helpers
(defn- $ [sel]
  (js/document.querySelector sel))

(defn- create-el [tag attrs & children]
  (let [el (js/document.createElement tag)]
    (doseq [[k v] attrs]
      (cond
        (= k :class)    (set! (.-className el) v)
        (= k :style)    (set! (.-style.cssText el) v)
        (= k :on-click) (.addEventListener el "click" v)
        :else            (.setAttribute el (name k) v)))
    (doseq [c children]
      (when c
        (if (string? c)
          (.appendChild el (js/document.createTextNode c))
          (.appendChild el c))))
    el))

;; Render highlighted code
(defn- render-highlighted [container source]
  (set! (.-innerHTML container) "")
  (let [pre (js/document.createElement "pre")]
    (set! (.-className pre) "code-block")
    (doseq [part (hl/highlight source)]
      (if (string? part)
        (.appendChild pre (js/document.createTextNode part))
        (let [[_ attrs text] part
              span (js/document.createElement "span")]
          (set! (.-className span) (:class attrs))
          (.appendChild span (js/document.createTextNode text))
          (.appendChild pre span))))
    (.appendChild container pre)))

;; Compile and render JS
(defn- render-js [container source]
  (set! (.-innerHTML container) "<pre class='code-block loading'>Compiling...</pre>")
  (-> (js/import "@clojurewasm/kiso/compiler")
      (.then (fn [mod]
               (let [result (.-code (.compile mod source))]
                 (set! (.-innerHTML container) "")
                 (let [pre (js/document.createElement "pre")]
                   (set! (.-className pre) "code-block")
                   (set! (.-textContent pre) result)
                   (.appendChild container pre)))))
      (.catch (fn [err]
                (set! (.-innerHTML container)
                      (str "<pre class='code-block error'>" err "</pre>"))))))

;; Mount live sample
(defn- mount-sample! [container id]
  ;; Unmount previous
  (when-let [f @unmount-ref]
    (f)
    (reset! unmount-ref nil))
  (set! (.-innerHTML container) "")
  (-> (load-sample id)
      (.then (fn [mod]
               (let [cleanup (.mount_m mod container)]
                 (reset! unmount-ref cleanup))))
      (.catch (fn [err]
                (set! (.-innerHTML container)
                      (str "<pre class='error'>" err "</pre>"))))))

;; Update content area
(defn- update-content []
  (let [id     @current
        sample (reg/sample-by-id id)
        source (get-source id)
        tab    @active-tab
        el     ($ "#content")]
    (when el
      (set! (.-innerHTML el) "")
      (cond
        (= tab "preview")
        (if (:live sample)
          (let [mount-div (js/document.createElement "div")]
            (set! (.-className mount-div) "preview-mount")
            (.appendChild el mount-div)
            (mount-sample! mount-div id))
          (set! (.-innerHTML el)
                "<div class='placeholder'>This is a code-only sample. Switch to the CLJS or JS tab to view the code.</div>"))

        (= tab "cljs")
        (when source
          (render-highlighted el source))

        (= tab "js")
        (when source
          (render-js el source))))))

;; Update sidebar active state
(defn- update-sidebar []
  (let [id @current]
    (doseq [btn (js/Array.from (js/document.querySelectorAll ".sidebar-item"))]
      (let [item-id (.getAttribute btn "data-id")]
        (if (= item-id id)
          (.add (.-classList btn) "active")
          (.remove (.-classList btn) "active"))))))

;; Update tab bar active state
(defn- update-tabs []
  (let [tab @active-tab]
    (doseq [btn (js/Array.from (js/document.querySelectorAll ".tab-btn"))]
      (let [tab-id (.getAttribute btn "data-tab")]
        (if (= tab-id tab)
          (.add (.-classList btn) "tab-active")
          (.remove (.-classList btn) "tab-active"))))))

;; Build the shell DOM
(defn init! [root]
  ;; Inject styles
  (let [style (js/document.createElement "style")]
    (set! (.-textContent style) "
      .shell { display: grid; grid-template-columns: 220px 1fr; grid-template-rows: 56px 1fr; height: 100%; }
      .header { grid-column: 1 / -1; display: flex; align-items: center; padding: 0 20px; background: #1e293b; border-bottom: 1px solid #334155; gap: 12px; }
      .logo { font-size: 18px; font-weight: 700; color: #e2e8f0; }
      .logo-accent { color: #818cf8; }
      .badge { font-size: 11px; color: #94a3b8; background: #334155; padding: 2px 8px; border-radius: 4px; }
      .sidebar { background: #1e293b; border-right: 1px solid #334155; overflow-y: auto; padding: 12px; }
      .cat-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; padding: 4px 8px; margin-bottom: 4px; margin-top: 12px; }
      .sidebar-item { display: block; width: 100%; text-align: left; padding: 8px 12px; border: none; background: transparent; color: #cbd5e1; font-size: 13px; font-family: 'Inter', system-ui, sans-serif; cursor: pointer; border-radius: 6px; transition: background 0.15s; }
      .sidebar-item:hover { background: rgba(99,102,241,0.15); }
      .sidebar-item.active { background: rgba(99,102,241,0.25); color: #a5b4fc; font-weight: 500; }
      .main { display: flex; flex-direction: column; overflow: hidden; background: #0f172a; }
      .tab-bar { display: flex; gap: 0; padding: 8px 16px 0; border-bottom: 1px solid #334155; }
      .tab-btn { padding: 8px 16px; font-size: 13px; font-weight: 500; border: none; background: transparent; color: #94a3b8; cursor: pointer; border-bottom: 2px solid transparent; font-family: 'Inter', system-ui, sans-serif; transition: color 0.15s; }
      .tab-btn:hover { color: #e2e8f0; }
      .tab-btn.tab-active { color: #a5b4fc; border-bottom-color: #6366f1; }
      #content { flex: 1; overflow: auto; padding: 16px; }
      .preview-mount { height: calc(100vh - 120px); background: #1e293b; border-radius: 8px; padding: 16px; overflow: auto; display: flex; align-items: center; justify-content: center; }
      .placeholder { color: #64748b; font-size: 14px; text-align: center; padding: 60px 20px; }
      .code-block { font-family: 'JetBrains Mono', monospace; font-size: 13px; line-height: 1.6; white-space: pre-wrap; word-break: break-word; color: #e2e8f0; margin: 0; background: #1e293b; border-radius: 8px; padding: 16px; }
      .comment { color: #64748b; } .string { color: #a5d6ff; } .keyword { color: #7dd3fc; }
      .number { color: #fbbf24; } .special { color: #c084fc; } .boolean { color: #f472b6; }
      .loading { color: #94a3b8; font-style: italic; } .error { color: #f87171; }
    ")
    (.appendChild js/document.head style))

  (set! (.-innerHTML root) "")
  (let [shell (create-el "div" {:class "shell"})]
    ;; Header
    (let [header (create-el "div" {:class "header"})]
      (.appendChild header
                    (create-el "span" {:class "logo"}
                               (create-el "span" {:class "logo-accent"} "Kiso")
                               " Showcase"))
      (.appendChild header
                    (create-el "span" {:class "badge"} "ClojureScript Compiler"))
      (.appendChild shell header))

    ;; Sidebar
    (let [sidebar (create-el "div" {:class "sidebar"})]
      (doseq [cat reg/categories]
        (let [label (create-el "div" {:class "cat-label"} (:label cat))]
          (.appendChild sidebar label))
        (doseq [s (filter (fn [s] (= (:category s) (:key cat))) reg/samples)]
          (let [btn (create-el "button"
                               {:class "sidebar-item"
                                :data-id (:id s)
                                :on-click (fn [_]
                                            (set! js/location.hash (:id s)))}
                               (:label s))]
            (.appendChild sidebar btn))))
      (.appendChild shell sidebar))

    ;; Main
    (let [main (create-el "div" {:class "main"})]
      ;; Tab bar
      (let [tab-bar (create-el "div" {:class "tab-bar"})]
        (doseq [t [{:key "preview" :label "Preview"}
                   {:key "cljs"    :label "CLJS"}
                   {:key "js"      :label "JS"}]]
          (let [btn (create-el "button"
                               {:class "tab-btn"
                                :data-tab (:key t)
                                :on-click (fn [_]
                                            (reset! active-tab (:key t))
                                            (update-tabs)
                                            (update-content))}
                               (:label t))]
            (.appendChild tab-bar btn)))
        (.appendChild main tab-bar))

      ;; Content
      (let [content (create-el "div" {:id "content"})]
        (.appendChild main content))
      (.appendChild shell main))

    (.appendChild root shell))

  ;; Initialize
  (reset! current (get-hash))
  (update-sidebar)
  (update-tabs)
  (update-content)

  ;; Hash change listener
  (.addEventListener js/window "hashchange"
                     (fn [_]
                       (reset! current (get-hash))
                       (reset! active-tab "preview")
                       (update-sidebar)
                       (update-tabs)
                       (update-content))))
