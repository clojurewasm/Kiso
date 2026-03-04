import { describe, it, expect } from 'vitest';
import { compile } from '../../src/api/compiler.js';
import type { CodegenHook } from '../../src/codegen/emitter.js';

describe('codegen hooks', () => {
  it('intercepts namespace-qualified invocation', () => {
    const hook: CodegenHook = (args, helpers) => {
      return `CUSTOM(${args.map(a => helpers.emit(a)).join(', ')})`;
    };
    const result = compile(
      '(ns test (:require [my.lib :as m]))\n(my.lib/foo 1 2)',
      { codegenHooks: { 'my.lib/foo': hook } },
    );
    expect(result.code).toContain('CUSTOM(1, 2)');
  });

  it('does not intercept non-matching invocations', () => {
    const hook: CodegenHook = () => 'CUSTOM()';
    const result = compile(
      '(ns test (:require [my.lib :as m]))\n(my.lib/bar 1)',
      { codegenHooks: { 'my.lib/foo': hook } },
    );
    expect(result.code).not.toContain('CUSTOM');
    expect(result.code).toContain('m.bar(1)');
  });

  it('provides indent and deeper helpers', () => {
    const hook: CodegenHook = (_args, helpers) => {
      const inner = helpers.deeper();
      return `{\n${inner.indent}body\n${helpers.indent}}`;
    };
    const result = compile(
      '(ns test (:require [my.lib :as m]))\n(my.lib/foo)',
      { codegenHooks: { 'my.lib/foo': hook } },
    );
    expect(result.code).toContain('{\n');
    expect(result.code).toContain('body');
  });

  it('provides extractLiteral helper', () => {
    const hook: CodegenHook = (args, helpers) => {
      const val = helpers.extractLiteral(args[0]!);
      return `literal(${JSON.stringify(val)})`;
    };
    const result = compile(
      '(ns test (:require [my.lib :as m]))\n(my.lib/foo "hello")',
      { codegenHooks: { 'my.lib/foo': hook } },
    );
    expect(result.code).toContain('literal("hello")');
  });
});
