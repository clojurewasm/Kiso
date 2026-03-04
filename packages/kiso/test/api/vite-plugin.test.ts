import { describe, it, expect } from 'vitest';
import { cljs } from '../../src/api/vite-plugin.js';

describe('vite-plugin-cljs', () => {
  it('creates a plugin with correct name', () => {
    const plugin = cljs();
    expect(plugin.name).toBe('vite-plugin-clojurescript');
  });

  it('transforms .cljs files', () => {
    const plugin = cljs();
    const transform = plugin.transform as (code: string, id: string) => { code: string; map?: unknown } | null;
    const result = transform('(def x 42)', '/app/src/core.cljs');
    expect(result).not.toBeNull();
    expect(result!.code).toContain('x');
    expect(result!.code).toContain('42');
  });

  it('ignores non-cljs files', () => {
    const plugin = cljs();
    const transform = plugin.transform as (code: string, id: string) => unknown | null;
    const result = transform('const x = 42;', '/app/src/core.ts');
    expect(result).toBeNull();
  });

  it('transforms .cljc files', () => {
    const plugin = cljs();
    const transform = plugin.transform as (code: string, id: string) => { code: string } | null;
    const result = transform('(def y 10)', '/app/src/shared.cljc');
    expect(result).not.toBeNull();
    expect(result!.code).toContain('y');
  });

  it('includes source map', () => {
    const plugin = cljs();
    const transform = plugin.transform as (code: string, id: string) => { code: string; map?: unknown } | null;
    const result = transform('(def x 42)', '/app/src/core.cljs');
    expect(result).not.toBeNull();
    expect(result!.map).toBeDefined();
  });

  it('has handleHotUpdate for cljs files', () => {
    const plugin = cljs();
    expect(plugin.handleHotUpdate).toBeDefined();
  });

  it('handleHotUpdate returns affected modules for cljs files', () => {
    const plugin = cljs();
    const mockModule = { file: '/app/src/core.cljs', type: 'js' };
    const mockCtx = {
      file: '/app/src/core.cljs',
      modules: [mockModule],
    };
    const result = (plugin.handleHotUpdate as (ctx: typeof mockCtx) => unknown)(mockCtx);
    expect(result).toEqual([mockModule]);
  });

  it('handleHotUpdate ignores non-cljs files', () => {
    const plugin = cljs();
    const mockCtx = {
      file: '/app/src/core.ts',
      modules: [{ file: '/app/src/core.ts' }],
    };
    const result = (plugin.handleHotUpdate as (ctx: typeof mockCtx) => unknown)(mockCtx);
    expect(result).toBeUndefined();
  });
});
