import { describe, it, expect, vi, afterEach } from 'vitest';
import { enableTrace, disableTrace } from '../src/devtools.js';
import { atom, Atom } from '@clojurewasm/kiso/runtime';

describe('DevTools Trace', () => {
  afterEach(() => {
    disableTrace();
  });

  it('enableTrace logs atom changes', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    enableTrace();
    const a = atom(1, 'counter');
    a.reset(2);
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy.mock.calls[0]![0]).toBe('[atom:counter]');
    expect(logSpy.mock.calls[0]![1]).toBe(1);
    expect(logSpy.mock.calls[0]![3]).toBe(2);
    logSpy.mockRestore();
  });

  it('enableTrace uses ? for unlabeled atoms', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    enableTrace();
    const a = atom(0);
    a.reset(1);
    expect(logSpy.mock.calls[0]![0]).toBe('[atom:?]');
    logSpy.mockRestore();
  });

  it('enableTrace with filter', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    enableTrace({ filter: (a) => a.label === 'counter' });
    const a = atom(0, 'counter');
    const b = atom(0, 'other');
    a.reset(1);
    b.reset(1);
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy.mock.calls[0]![0]).toBe('[atom:counter]');
    logSpy.mockRestore();
  });

  it('disableTrace stops logging', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    enableTrace();
    const a = atom(0, 'x');
    a.reset(1);
    expect(logSpy).toHaveBeenCalledTimes(1);
    disableTrace();
    a.reset(2);
    expect(logSpy).toHaveBeenCalledTimes(1); // no new calls
    logSpy.mockRestore();
  });

  it('enableTrace captures swap changes', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    enableTrace();
    const a = atom(10, 'val');
    a.swap((v: number) => v + 5);
    expect(logSpy.mock.calls[0]![0]).toBe('[atom:val]');
    expect(logSpy.mock.calls[0]![1]).toBe(10);
    expect(logSpy.mock.calls[0]![3]).toBe(15);
    logSpy.mockRestore();
  });
});
