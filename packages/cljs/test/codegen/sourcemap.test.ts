import { describe, it, expect } from 'vitest';
import { encodeVLQ, SourceMapBuilder } from '../../src/codegen/sourcemap.js';

describe('encodeVLQ', () => {
  it('encodes 0', () => {
    expect(encodeVLQ(0)).toBe('A');
  });

  it('encodes small positive', () => {
    expect(encodeVLQ(1)).toBe('C');
  });

  it('encodes small negative', () => {
    expect(encodeVLQ(-1)).toBe('D');
  });

  it('encodes larger values with continuation bits', () => {
    // 16 → requires continuation: 100000 in VLQ
    expect(encodeVLQ(16)).toBe('gB');
  });

  it('encodes various known values', () => {
    // Known test vectors from the spec
    expect(encodeVLQ(0)).toBe('A');
    expect(encodeVLQ(1)).toBe('C');
    expect(encodeVLQ(-1)).toBe('D');
    expect(encodeVLQ(5)).toBe('K');
    expect(encodeVLQ(-5)).toBe('L');
  });
});

describe('SourceMapBuilder', () => {
  it('generates valid V3 source map JSON', () => {
    const builder = new SourceMapBuilder('output.js', 'input.cljs');
    // Map generated col 0 → source line 0, col 0
    builder.addMapping(0, 0, 0, 0);
    const map = builder.toJSON();
    expect(map.version).toBe(3);
    expect(map.file).toBe('output.js');
    expect(map.sources).toEqual(['input.cljs']);
    expect(typeof map.mappings).toBe('string');
  });

  it('encodes single mapping', () => {
    const builder = new SourceMapBuilder('out.js', 'in.cljs');
    builder.addMapping(0, 0, 0, 0);
    const map = builder.toJSON();
    // genCol=0, srcIdx=0, srcLine=0, srcCol=0 → all zeros → "AAAA"
    expect(map.mappings).toBe('AAAA');
  });

  it('encodes multiple mappings on same line', () => {
    const builder = new SourceMapBuilder('out.js', 'in.cljs');
    builder.addMapping(0, 0, 0, 0);
    builder.addMapping(0, 10, 0, 5);
    const map = builder.toJSON();
    // Two segments separated by comma on same generated line
    expect(map.mappings).toContain(',');
  });

  it('encodes mappings across lines with semicolons', () => {
    const builder = new SourceMapBuilder('out.js', 'in.cljs');
    builder.addMapping(0, 0, 0, 0);
    builder.addMapping(1, 0, 1, 0);
    const map = builder.toJSON();
    // Lines separated by semicolons
    expect(map.mappings).toContain(';');
  });

  it('produces string output', () => {
    const builder = new SourceMapBuilder('out.js', 'in.cljs');
    builder.addMapping(0, 0, 0, 0);
    const str = builder.toString();
    const parsed = JSON.parse(str);
    expect(parsed.version).toBe(3);
  });
});
