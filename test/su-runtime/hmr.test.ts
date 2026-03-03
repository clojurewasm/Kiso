import { describe, it, expect, vi } from 'vitest';
import { hotReplace, getComponentRenderFn, registerRenderFn } from '../../src/su-runtime/hmr.js';

describe('su HMR', () => {
  it('registers and retrieves render functions', () => {
    const renderFn = vi.fn(() => ['div', 'hello']);
    registerRenderFn('my-comp', renderFn);
    expect(getComponentRenderFn('my-comp')).toBe(renderFn);
  });

  it('hotReplace updates the registered render function', () => {
    const oldFn = vi.fn(() => ['div', 'old']);
    const newFn = vi.fn(() => ['div', 'new']);
    registerRenderFn('hot-comp', oldFn);
    hotReplace('hot-comp', newFn);
    expect(getComponentRenderFn('hot-comp')).toBe(newFn);
  });

  it('hotReplace returns false for unregistered component', () => {
    const fn = vi.fn(() => ['div']);
    const result = hotReplace('unknown-comp', fn);
    expect(result).toBe(false);
  });

  it('hotReplace returns true for registered component', () => {
    const oldFn = vi.fn(() => ['div', 'old']);
    const newFn = vi.fn(() => ['div', 'new']);
    registerRenderFn('known-comp', oldFn);
    const result = hotReplace('known-comp', newFn);
    expect(result).toBe(true);
  });
});
