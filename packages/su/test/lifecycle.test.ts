import { describe, it, expect, vi } from 'vitest';
import {
  onMount, onUnmount, collectLifecycleHooks,
  type LifecycleHooks,
} from '../src/lifecycle.js';

describe('lifecycle hooks', () => {
  it('collectLifecycleHooks captures onMount callbacks', () => {
    const mountFn = vi.fn();
    const hooks = collectLifecycleHooks(() => {
      onMount(mountFn);
    });
    expect(hooks.mounts).toHaveLength(1);
    hooks.mounts[0]();
    expect(mountFn).toHaveBeenCalledTimes(1);
  });

  it('collectLifecycleHooks captures onUnmount callbacks', () => {
    const unmountFn = vi.fn();
    const hooks = collectLifecycleHooks(() => {
      onUnmount(unmountFn);
    });
    expect(hooks.unmounts).toHaveLength(1);
    hooks.unmounts[0]();
    expect(unmountFn).toHaveBeenCalledTimes(1);
  });

  it('captures multiple hooks in order', () => {
    const calls: string[] = [];
    const hooks = collectLifecycleHooks(() => {
      onMount(() => calls.push('mount1'));
      onMount(() => calls.push('mount2'));
      onUnmount(() => calls.push('unmount1'));
    });
    expect(hooks.mounts).toHaveLength(2);
    expect(hooks.unmounts).toHaveLength(1);
    hooks.mounts[0]();
    hooks.mounts[1]();
    hooks.unmounts[0]();
    expect(calls).toEqual(['mount1', 'mount2', 'unmount1']);
  });

  it('nested collectLifecycleHooks restores context', () => {
    const outerMount = vi.fn();
    const innerMount = vi.fn();

    let innerHooks: LifecycleHooks;
    const outerHooks = collectLifecycleHooks(() => {
      onMount(outerMount);
      innerHooks = collectLifecycleHooks(() => {
        onMount(innerMount);
      });
    });

    expect(outerHooks.mounts).toHaveLength(1);
    expect(innerHooks!.mounts).toHaveLength(1);
    outerHooks.mounts[0]();
    innerHooks!.mounts[0]();
    expect(outerMount).toHaveBeenCalledTimes(1);
    expect(innerMount).toHaveBeenCalledTimes(1);
  });

  it('throws if onMount called outside collectLifecycleHooks', () => {
    expect(() => onMount(() => {})).toThrow('outside');
  });

  it('throws if onUnmount called outside collectLifecycleHooks', () => {
    expect(() => onUnmount(() => {})).toThrow('outside');
  });
});
