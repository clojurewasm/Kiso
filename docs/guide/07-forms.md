# 7. Forms

Shadow DOM creates a challenge for HTML forms: form controls inside a Shadow
Root are invisible to the parent `<form>` element. su provides options to
bridge this gap.

## The Problem

By default, a Custom Element with Shadow DOM is not a form participant. If you
place `<my-input>` inside a `<form>`, the form won't see its value.

## formAssociated

Set `formAssociated` to `true` in the component options to make it a
form-associated Custom Element:

```clojure
(defc my-input
  {:props {:name "string" :value "string"}
   :formAssociated true}
  [{:keys [name value]}]
  [:input {:type "text"
           :name name
           :value value}])
```

With `formAssociated: true`, the browser treats the Custom Element as a form
control. It can participate in form submission, validation, and the
`FormData` API.

## delegatesFocus

Set `delegatesFocus` to `true` to delegate focus into the Shadow Root:

```clojure
(defc my-input
  {:props {:placeholder "string"}
   :delegatesFocus true}
  [{:keys [placeholder]}]
  [:input {:type "text"
           :placeholder placeholder}])
```

When the Custom Element receives focus (e.g., via tab navigation or
programmatic `.focus()`), focus is automatically forwarded to the first
focusable element inside the Shadow Root.

This improves keyboard navigation and accessibility.

## Accessibility Tips

1. **Use semantic HTML** inside components — `<button>`, `<input>`, `<label>`,
   not styled `<div>` elements
2. **Add labels** — pair inputs with `<label>` elements or use `aria-label`
3. **Keyboard support** — handle `on-keydown` for Enter/Escape in custom
   interactions
4. **Focus management** — use `delegatesFocus` for input components

```clojure
(defc accessible-input
  {:props {:label "string" :name "string"}
   :delegatesFocus true
   :formAssociated true}
  [{:keys [label name]}]
  [:div
    [:label {:for "field"} label]
    [:input {:id "field"
             :type "text"
             :name name
             :aria-label label}]])
```

## Summary

| Option             | Purpose                                   |
|--------------------|-------------------------------------------|
| `formAssociated`   | Make component participate in `<form>`    |
| `delegatesFocus`   | Forward focus into Shadow Root            |
