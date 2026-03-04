// Unified compiler error types with source location context.

export type CompilePhase = 'read' | 'analyze' | 'codegen';

export class CompileError extends Error {
  phase: CompilePhase;
  filename: string | null;
  line: number | null;
  col: number | null;

  constructor(message: string, phase: CompilePhase, filename?: string, line?: number, col?: number) {
    super(message);
    this.name = 'CompileError';
    this.phase = phase;
    this.filename = filename ?? null;
    this.line = line ?? null;
    this.col = col ?? null;
  }

  /** Format as a human-readable error string with location. */
  format(): string {
    const loc = this.formatLocation();
    const prefix = `[${this.phase}]`;
    return loc ? `${prefix} ${loc}: ${this.message}` : `${prefix} ${this.message}`;
  }

  /** Format location as "file:line:col" or subset. */
  formatLocation(): string {
    const parts: string[] = [];
    if (this.filename) parts.push(this.filename);
    if (this.line != null) parts.push(String(this.line));
    if (this.col != null) parts.push(String(this.col));
    return parts.join(':');
  }
}

/** Wrap an unknown error into a CompileError with context. */
export function wrapError(err: unknown, phase: CompilePhase, filename?: string): CompileError {
  if (err instanceof CompileError) {
    if (filename && !err.filename) err.filename = filename;
    return err;
  }

  const message = err instanceof Error ? err.message : String(err);

  // ReaderError already carries line/col in its message and fields
  if (err instanceof Error && 'line' in err && 'col' in err) {
    return new CompileError(
      message,
      phase,
      filename,
      (err as { line: number }).line,
      (err as { col: number }).col,
    );
  }

  return new CompileError(message, phase, filename);
}
