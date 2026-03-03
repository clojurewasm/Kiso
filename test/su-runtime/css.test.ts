import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSheet } from '../../src/su-runtime/css.js';

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
