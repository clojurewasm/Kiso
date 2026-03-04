import { describe, it, expect } from 'vitest';
import { compile } from '@clojurewasm/kiso/compiler';
import { suCodegenHooks } from '../src/codegen-hooks.js';

function compileWithHooks(src: string): string {
  return compile(src, { codegenHooks: suCodegenHooks }).code;
}

describe('su codegen hooks', () => {
  it('emits define-component with object literal config', () => {
    const js = compileWithHooks(`
      (ns app.core (:require [su.core]))
      (su.core/define-component "my-card"
        {:observed-attrs ["title"] :prop-types {:title "string"}}
        (fn [props] [:div]))
    `);
    expect(js).toContain('su.defineComponent(');
    expect(js).toContain('observedAttrs: ["title"]');
    expect(js).toContain('propTypes: { title: "string" }');
  });

  it('emits create-stylesheet as su.createSheet', () => {
    const js = compileWithHooks(`
      (ns app.core (:require [su.core]))
      (su.core/create-stylesheet "my-card" ".host { display: block; }")
    `);
    expect(js).toContain('su.createSheet(');
    expect(js).toContain('.host { display: block; }');
  });

  it('falls through for non-hooked su calls', () => {
    const js = compileWithHooks(`
      (ns app.core (:require [su.core]))
      (su.core/effect (fn [] nil))
    `);
    expect(js).toContain('su.core.effect(');
    expect(js).not.toContain('su.defineComponent');
  });

  it('handles defc macro end-to-end', () => {
    const js = compileWithHooks(`
      (ns app.core (:require [su.core]))
      (defc my-widget [{:keys [title]}]
        [:div title])
    `);
    expect(js).toContain('su.defineComponent(');
    expect(js).toContain('observedAttrs:');
  });
});
