// Source Map V3 — VLQ encoding and source map builder.
//
// Implements the Source Map V3 format used by browsers and bundlers.
// Reference: https://sourcemaps.info/spec.html

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Encode a single integer as a Base64 VLQ string. */
export function encodeVLQ(value: number): string {
  let vlq = value < 0 ? ((-value) << 1) | 1 : value << 1;
  let result = '';
  do {
    let digit = vlq & 0x1f;
    vlq >>>= 5;
    if (vlq > 0) digit |= 0x20; // continuation bit
    result += B64[digit];
  } while (vlq > 0);
  return result;
}

export type SourceMapV3 = {
  version: 3;
  file: string;
  sources: string[];
  sourcesContent?: (string | null)[];
  mappings: string;
};

type Mapping = {
  genLine: number;
  genCol: number;
  srcLine: number;
  srcCol: number;
  srcIdx: number;
};

/** Build a Source Map V3 incrementally. */
export class SourceMapBuilder {
  private mappings: Mapping[] = [];
  private readonly srcIdx: number = 0;

  constructor(
    private readonly file: string,
    private readonly source: string,
    private readonly sourcesContent?: string,
  ) {}

  /** Add a mapping from generated position to source position. */
  addMapping(genLine: number, genCol: number, srcLine: number, srcCol: number): void {
    this.mappings.push({ genLine, genCol, srcLine, srcCol, srcIdx: this.srcIdx });
  }

  /** Generate the V3 source map object. */
  toJSON(): SourceMapV3 {
    // Sort by generated position
    this.mappings.sort((a, b) => a.genLine - b.genLine || a.genCol - b.genCol);

    let prevGenCol = 0;
    let prevSrcIdx = 0;
    let prevSrcLine = 0;
    let prevSrcCol = 0;
    let prevGenLine = 0;

    const lines: string[] = [];
    let currentSegments: string[] = [];

    for (const m of this.mappings) {
      // Emit semicolons for skipped generated lines
      while (prevGenLine < m.genLine) {
        lines.push(currentSegments.join(','));
        currentSegments = [];
        prevGenLine++;
        prevGenCol = 0;
      }

      // Encode segment: genCol, srcIdx, srcLine, srcCol (all relative)
      let segment = encodeVLQ(m.genCol - prevGenCol);
      segment += encodeVLQ(m.srcIdx - prevSrcIdx);
      segment += encodeVLQ(m.srcLine - prevSrcLine);
      segment += encodeVLQ(m.srcCol - prevSrcCol);

      currentSegments.push(segment);
      prevGenCol = m.genCol;
      prevSrcIdx = m.srcIdx;
      prevSrcLine = m.srcLine;
      prevSrcCol = m.srcCol;
    }

    lines.push(currentSegments.join(','));

    const result: SourceMapV3 = {
      version: 3,
      file: this.file,
      sources: [this.source],
      mappings: lines.join(';'),
    };

    if (this.sourcesContent !== undefined) {
      result.sourcesContent = [this.sourcesContent];
    }

    return result;
  }

  /** Generate the V3 source map as a JSON string. */
  toString(): string {
    return JSON.stringify(this.toJSON());
  }
}
