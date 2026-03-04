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
