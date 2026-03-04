import { describe, it, expect } from 'vitest';
import { version } from '../src/version.js';

describe('version', () => {
  it('returns the current version', () => {
    expect(version).toBe('0.1.1');
  });
});
