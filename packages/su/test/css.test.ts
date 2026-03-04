import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSheet, getSheet, globalStyle } from '../src/css.js';

describe('createSheet', () => {
  let mockSheet: { replaceSync: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockSheet = { replaceSync: vi.fn() };
    vi.stubGlobal('CSSStyleSheet', class {
      replaceSync = mockSheet.replaceSync;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates a CSSStyleSheet with given CSS text', () => {
    const sheet = createSheet('test-style', '.foo { color: red; }');
    expect(sheet).toBeDefined();
    expect(mockSheet.replaceSync).toHaveBeenCalledWith('.foo { color: red; }');
  });

  it('caches sheets by name', () => {
    const sheet1 = createSheet('cached', '.a { }');
    const sheet2 = createSheet('cached', '.b { }');
    expect(sheet1).toBe(sheet2);
    // replaceSync called only once (first creation)
    expect(mockSheet.replaceSync).toHaveBeenCalledTimes(1);
  });

  it('creates separate sheets for different names', () => {
    const sheet1 = createSheet('style-a', '.a { }');
    const sheet2 = createSheet('style-b', '.b { }');
    expect(sheet1).not.toBe(sheet2);
  });
});

describe('getSheet', () => {
  let mockSheet: { replaceSync: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockSheet = { replaceSync: vi.fn() };
    vi.stubGlobal('CSSStyleSheet', class {
      replaceSync = mockSheet.replaceSync;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the same sheet created by createSheet', () => {
    const created = createSheet('get-test', '.x { color: blue; }');
    const retrieved = getSheet('get-test');
    expect(retrieved).toBe(created);
  });

  it('returns null for unknown names', () => {
    expect(getSheet('nonexistent')).toBeNull();
  });
});

describe('globalStyle', () => {
  let mockSheet: { replaceSync: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockSheet = { replaceSync: vi.fn() };
    vi.stubGlobal('CSSStyleSheet', class {
      replaceSync = mockSheet.replaceSync;
    });
    vi.stubGlobal('document', {
      adoptedStyleSheets: [] as unknown[],
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('adds a stylesheet to document.adoptedStyleSheets', () => {
    const sheet = createSheet('global-test', '.body { margin: 0; }');
    globalStyle(sheet);
    expect(document.adoptedStyleSheets).toContain(sheet);
  });

  it('does not add the same stylesheet twice', () => {
    const sheet = createSheet('global-dup', '.x { }');
    globalStyle(sheet);
    globalStyle(sheet);
    expect(document.adoptedStyleSheets.filter((s: unknown) => s === sheet)).toHaveLength(1);
  });

  it('supports multiple different stylesheets', () => {
    const sheet1 = createSheet('g1', '.a { }');
    const sheet2 = createSheet('g2', '.b { }');
    globalStyle(sheet1);
    globalStyle(sheet2);
    expect(document.adoptedStyleSheets).toContain(sheet1);
    expect(document.adoptedStyleSheets).toContain(sheet2);
    expect(document.adoptedStyleSheets).toHaveLength(2);
  });
});
