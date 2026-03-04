// clojure.string — String manipulation functions matching ClojureScript semantics.

/** Returns true if s is nil, empty, or contains only whitespace. */
export function blank_p(s: string | null | undefined): boolean {
  if (s == null) return true;
  return /^\s*$/.test(s);
}

/** Converts first character to upper-case, rest to lower-case. */
export function capitalize(s: string): string {
  if (s.length === 0) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/** True if s ends with substr. */
export function ends_with_p(s: string, substr: string): boolean {
  return s.endsWith(substr);
}

/** Escapes characters in s using a character map. */
export function escape(s: string, cmap: Record<string, string>): string {
  let result = '';
  for (const ch of s) {
    result += cmap[ch] ?? ch;
  }
  return result;
}

/** True if s includes substr. */
export function includes_p(s: string, substr: string): boolean {
  return s.includes(substr);
}

/** Returns the index of value in s, optionally starting from fromIndex. */
export function index_of(s: string, value: string, fromIndex?: number): number {
  return fromIndex != null ? s.indexOf(value, fromIndex) : s.indexOf(value);
}

/** Returns a string of all elements in coll separated by an optional separator. */
export function join(separator: string | unknown[], coll?: unknown[]): string {
  if (coll === undefined) {
    // join(coll) — no separator
    const items = separator as unknown[];
    return items.map(String).join('');
  }
  return coll.map(String).join(separator as string);
}

/** Returns the last index of value in s. */
export function last_index_of(s: string, value: string): number {
  return s.lastIndexOf(value);
}

/** Converts string to all lower-case. */
export function lower_case(s: string): string {
  return s.toLowerCase();
}

/**
 * Replaces all occurrences of match in s.
 * match can be a string or regex. String match replaces ALL occurrences.
 */
export function replace(s: string, match: string | RegExp, replacement: string): string {
  if (typeof match === 'string') {
    return s.split(match).join(replacement);
  }
  return s.replace(match, replacement);
}

/** Replaces only the first occurrence of match in s. */
export function replace_first(s: string, match: string | RegExp, replacement: string): string {
  if (typeof match === 'string') {
    const idx = s.indexOf(match);
    if (idx === -1) return s;
    return s.slice(0, idx) + replacement + s.slice(idx + match.length);
  }
  // For regex, ensure no global flag for first-only behavior
  const nonGlobal = new RegExp(match.source, match.flags.replace('g', ''));
  return s.replace(nonGlobal, replacement);
}

/** Returns s reversed. */
export function reverse(s: string): string {
  return s.split('').reverse().join('');
}

/** Splits string by pattern, optionally with a limit. */
export function split(s: string, re: RegExp, limit?: number): string[] {
  if (limit === undefined) return s.split(re);
  if (limit <= 0) return s.split(re);
  const parts = s.split(re);
  if (parts.length <= limit) return parts;
  const head = parts.slice(0, limit - 1);
  const rest = parts.slice(limit - 1).join(
    // Reconstruct with original separator — find first match to get separator
    (s.match(re)?.[0]) ?? ''
  );
  head.push(rest);
  return head;
}

/** Splits s by line breaks. */
export function split_lines(s: string): string[] {
  return s.split(/\r?\n/);
}

/** True if s starts with substr. */
export function starts_with_p(s: string, substr: string): boolean {
  return s.startsWith(substr);
}

/** Removes whitespace from both ends. */
export function trim(s: string): string {
  return s.trim();
}

/** Removes trailing newline (\\n or \\r\\n) characters only. */
export function trim_newline(s: string): string {
  return s.replace(/[\r\n]+$/, '');
}

/** Removes whitespace from the left side. */
export function triml(s: string): string {
  return s.trimStart();
}

/** Removes whitespace from the right side. */
export function trimr(s: string): string {
  return s.trimEnd();
}

/** Converts string to all upper-case. */
export function upper_case(s: string): string {
  return s.toUpperCase();
}
