// CSS — stylesheet creation and caching for su framework.
//
// Uses Constructable Stylesheets (adoptedStyleSheets).
// Sheets are parsed once and shared across all component instances.

const sheetCache = new Map<string, CSSStyleSheet>();

/** Create (or retrieve cached) a CSSStyleSheet from CSS text. */
export function createSheet(name: string, cssText: string): CSSStyleSheet {
  let sheet = sheetCache.get(name);
  if (!sheet) {
    sheet = new CSSStyleSheet();
    sheet.replaceSync(cssText);
    sheetCache.set(name, sheet);
  }
  return sheet;
}

/** Retrieve a cached stylesheet by name. Returns null if not found. */
export function getSheet(name: string): CSSStyleSheet | null {
  return sheetCache.get(name) ?? null;
}

/** Apply a stylesheet globally to document.adoptedStyleSheets. */
export function globalStyle(sheet: CSSStyleSheet): void {
  const sheets = document.adoptedStyleSheets;
  if (!sheets.includes(sheet)) {
    document.adoptedStyleSheets = [...sheets, sheet];
  }
}
