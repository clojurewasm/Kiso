import { describe, it, expect } from 'vitest';
import { compile } from '../../src/api/compiler.js';
import { CompileError } from '../../src/api/errors.js';

describe('CompileError', () => {
  it('format() includes phase and location', () => {
    const err = new CompileError('bad syntax', 'read', 'foo.cljs', 3, 5);
    expect(err.format()).toBe('[read] foo.cljs:3:5: bad syntax');
  });

  it('format() without filename', () => {
    const err = new CompileError('unexpected', 'analyze', undefined, 10, 1);
    expect(err.format()).toBe('[analyze] 10:1: unexpected');
  });

  it('format() without location', () => {
    const err = new CompileError('unknown', 'codegen');
    expect(err.format()).toBe('[codegen] unknown');
  });
});

describe('compile error wrapping', () => {
  it('reader error has phase and location', () => {
    try {
      compile('(def x', { filename: 'test.cljs' });
      expect.fail('should throw');
    } catch (err) {
      expect(err).toBeInstanceOf(CompileError);
      const ce = err as CompileError;
      expect(ce.phase).toBe('read');
      expect(ce.filename).toBe('test.cljs');
      expect(ce.line).toBeTypeOf('number');
    }
  });

  it('analyzer error has phase and location', () => {
    try {
      compile('(def 42)', { filename: 'bad.cljs' });
      expect.fail('should throw');
    } catch (err) {
      expect(err).toBeInstanceOf(CompileError);
      const ce = err as CompileError;
      expect(ce.phase).toBe('analyze');
      expect(ce.filename).toBe('bad.cljs');
      expect(ce.line).toBe(1);
    }
  });

  it('error message is human-readable via format()', () => {
    try {
      compile('(let [x])', { filename: 'src/app.cljs' });
      expect.fail('should throw');
    } catch (err) {
      const ce = err as CompileError;
      const msg = ce.format();
      expect(msg).toContain('[analyze]');
      expect(msg).toContain('src/app.cljs');
    }
  });
});
