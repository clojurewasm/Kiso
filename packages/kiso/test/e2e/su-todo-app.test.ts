import { describe, it, expect } from 'vitest';
import { readAllStr } from '../../src/reader/reader.js';
import { expandAll } from '../../src/analyzer/macros.js';
import { Analyzer } from '../../src/analyzer/analyzer.js';
import { emit } from '../../src/codegen/emitter.js';

const analyzer = new Analyzer();

/** Expand macros, analyze, and emit JS for a single form. */
function compileForm(source: string): string {
  const forms = readAllStr(source);
  const results: string[] = [];
  for (const form of forms) {
    const expanded = expandAll(form);
    const node = analyzer.analyze(expanded);
    results.push(emit(node));
  }
  return results.join('\n');
}

describe('su todo-app dogfooding', () => {
  describe('defc → full pipeline', () => {
    it('compiles defc to define-component call', () => {
      const js = compileForm(`
        (defc my-counter [{:keys [initial]}]
          [:div.counter
            [:span "Count: " initial]])
      `);
      // Should contain the su.core/define-component call
      expect(js).toContain('define_component');
      expect(js).toContain('"my-counter"');
    });

    it('defc expansion includes observed attrs', () => {
      const js = compileForm(`
        (defc todo-item
          {:props {:title {:type :string} :done {:type :boolean}}}
          [{:keys [title done]}]
          [:li {:class (if done "done" "")} title])
      `);
      expect(js).toContain('"title"');
      expect(js).toContain('"done"');
      expect(js).toContain('define_component');
    });

    it('defc infers attrs from destructuring', () => {
      const js = compileForm(`
        (defc nav-bar [{:keys [brand links]}]
          [:nav [:span brand]])
      `);
      expect(js).toContain('"brand"');
      expect(js).toContain('"links"');
    });

    it('defc with explicit props and docstring', () => {
      const js = compileForm(`
        (defc search-box
          "A search input component"
          {:props {:placeholder {:type :string}}}
          [{:keys [placeholder]}]
          [:input {:type "text" :placeholder placeholder}])
      `);
      expect(js).toContain('define_component');
      expect(js).toContain('"search-box"');
      expect(js).toContain('"placeholder"');
    });
  });

  describe('defstyle → full pipeline', () => {
    it('compiles defstyle to const with create-stylesheet', () => {
      const js = compileForm(`
        (defstyle counter-style
          [:.counter {:display "flex" :gap "8px"}])
      `);
      expect(js).toContain('const counter_style');
      expect(js).toContain('create_stylesheet');
      expect(js).toContain('"counter-style"');
      expect(js).toContain('.counter');
      expect(js).toContain('display: flex');
    });

    it('compiles nested CSS rules', () => {
      const js = compileForm(`
        (defstyle card-style
          [:.card {:padding "16px"}
            [:h2 {:font-size "1.5em"}]
            [:&:hover {:box-shadow "0 2px 4px rgba(0,0,0,0.1)"}]])
      `);
      expect(js).toContain('.card { padding: 16px; }');
      expect(js).toContain('.card h2 { font-size: 1.5em; }');
      expect(js).toContain('.card:hover');
    });

    it('compiles defstyle with multiple top-level rule vectors', () => {
      const js = compileForm(`
        (defstyle stat-style
          [:host {:display "block"}]
          [:.card {:padding "16px"}]
          [:.count {:font-size "28px"}])
      `);
      expect(js).toContain(':host { display: block; }');
      expect(js).toContain('.card { padding: 16px; }');
      expect(js).toContain('.count { font-size: 28px; }');
    });
  });

  describe('macro expansion correctness', () => {
    it('defc expands to su.core/define-component with render fn', () => {
      const forms = readAllStr(`
        (defc my-widget [{:keys [label]}]
          [:div label])
      `);
      const expanded = expandAll(forms[0]!);
      // Should be a list starting with su.core/define-component
      expect(expanded.data.type).toBe('list');
      const items = (expanded.data as { items: unknown[] }).items as Array<{ data: { type: string; ns?: string; name?: string } }>;
      expect(items[0]!.data.type).toBe('symbol');
      expect(items[0]!.data.ns).toBe('su.core');
      expect(items[0]!.data.name).toBe('define-component');
    });

    it('defstyle expands to (def name (su.core/create-stylesheet ...))', () => {
      const forms = readAllStr(`
        (defstyle my-style
          [:.foo {:color "red"}])
      `);
      const expanded = expandAll(forms[0]!);
      expect(expanded.data.type).toBe('list');
      const outer = (expanded.data as { items: unknown[] }).items as Array<{ data: { type: string; ns?: string; name?: string; items?: unknown[] } }>;
      // outer: (def my-style (su.core/create-stylesheet ...))
      expect(outer[0]!.data.name).toBe('def');
      expect(outer[1]!.data.name).toBe('my-style');
      expect(outer[2]!.data.type).toBe('list');
      const inner = outer[2]!.data.items as Array<{ data: { type: string; ns?: string; name?: string } }>;
      expect(inner[0]!.data.ns).toBe('su.core');
      expect(inner[0]!.data.name).toBe('create-stylesheet');
    });

    it('rejects defc without hyphen', () => {
      expect(() => compileForm(`(defc counter [{:keys [x]}] [:div])`)).toThrow('hyphen');
    });

    it('defc passes form-associated option to config', () => {
      const js = compileForm(`
        (defc my-input
          {:form-associated true :props {:value {:type :string}}}
          [{:keys [value]}]
          [:input {:value value}])
      `);
      expect(js).toContain('keyword("form-associated")');
      expect(js).toContain(', true,');
    });

    it('defc passes delegates-focus option to config', () => {
      const js = compileForm(`
        (defc focus-comp
          {:delegates-focus true}
          [{:keys [label]}]
          [:input {:placeholder label}])
      `);
      expect(js).toContain('keyword("delegates-focus")');
      expect(js).toContain(', true,');
    });

    it('defc :style option adds styles vector to config', () => {
      const js = compileForm(`
        (defc my-card
          {:style card-styles}
          [{:keys [title]}]
          [:div title])
      `);
      expect(js).toContain('keyword("styles")');
      expect(js).toContain('card_styles');
    });

    it('defc without :style auto-lookups stylesheet by component name', () => {
      const js = compileForm(`
        (defc my-widget [{:keys [label]}]
          [:div label])
      `);
      expect(js).toContain('keyword("styles")');
      expect(js).toContain('get_stylesheet');
      expect(js).toContain('"my-widget"');
    });
  });

  describe('K10: CSS theming', () => {
    it('defstyle supports CSS custom property var()', () => {
      const js = compileForm(`
        (defstyle theme-style
          [:.themed {:color "var(--su-text, #333)"
                     :background "var(--su-bg, #fff)"}])
      `);
      expect(js).toContain('var(--su-text, #333)');
      expect(js).toContain('var(--su-bg, #fff)');
    });

    it('defstyle supports :host selector', () => {
      const js = compileForm(`
        (defstyle host-style
          [:host {:display "block" :padding "16px"}])
      `);
      expect(js).toContain(':host');
      expect(js).toContain('display: block');
    });
  });

  describe('end-to-end: realistic todo app snippet', () => {
    it('compiles a full todo component', () => {
      const js = compileForm(`
        (defc todo-app [{:keys [title]}]
          (let [items (atom [])
                new-text (atom "")]
            [:div.todo-app
              [:h1 title]
              [:div.input-row
                [:input {:type "text" :placeholder "Add todo..."}]
                [:button "Add"]]
              [:ul.todo-list]]))
      `);
      // Verify compilation succeeds and contains expected elements
      expect(js).toContain('define_component');
      expect(js).toContain('"todo-app"');
      // Should have atom calls
      expect(js).toContain('atom');
    });

    it('compiles todo styling', () => {
      const js = compileForm(`
        (defstyle todo-style
          [:.todo-app {:max-width "600px" :margin "0 auto"}
            [:.input-row {:display "flex" :gap "8px"}]
            [:.todo-list {:list-style "none" :padding "0"}]])
      `);
      expect(js).toContain('create_stylesheet');
      expect(js).toContain('.todo-app');
      expect(js).toContain('max-width: 600px');
      expect(js).toContain('.todo-app .input-row');
      expect(js).toContain('.todo-app .todo-list');
    });
  });
});
