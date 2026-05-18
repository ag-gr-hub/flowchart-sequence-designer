/**
 * Centralized input sanitization for all user-provided text that flows
 * into SVG output, labels, or any rendering context.
 *
 * Defence-in-depth: even though `escapeXML()` prevents most injection,
 * stripping dangerous patterns at the source stops payloads from reaching
 * any downstream consumer (clipboard, third-party renderers, etc.).
 */

/** Maximum characters allowed in a single label/text field. */
export const MAX_LABEL_LENGTH = 2000;

/** Maximum number of nodes allowed in a single diagram. */
export const MAX_NODES = 500;

/** Maximum number of edges allowed in a single diagram. */
export const MAX_EDGES = 2000;

/** Maximum number of actors in a sequence diagram. */
export const MAX_ACTORS = 100;

/** Maximum number of messages in a sequence diagram. */
export const MAX_MESSAGES = 2000;

/** Maximum raw input length for importers (bytes). ~2 MB */
export const MAX_IMPORT_LENGTH = 2 * 1024 * 1024;

/**
 * Strip dangerous content from user-supplied text. Removes:
 * - HTML tags (`<script>`, `<img>`, `<foreignObject>`, etc.)
 * - `javascript:`, `data:`, `vbscript:` URI schemes
 * - `on*` event handler attributes (onerror, onclick, etc.)
 * - Null bytes and other control characters
 */
export function sanitizeLabel(raw: string): string {
  let s = raw;
  // Remove null bytes and ASCII control chars (except \n, \r, \t)
  // eslint-disable-next-line no-control-regex
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  // Strip HTML/XML tags (loop to handle nested constructions)
  while (/<\/?[a-zA-Z][^>]*>/g.test(s)) {
    s = s.replace(/<\/?[a-zA-Z][^>]*>/g, '');
  }
  // Strip javascript:/data:/vbscript: URIs (loop for incomplete multi-char sanitization)
  while (/\b(?:javascript|data|vbscript)\s*:/gi.test(s)) {
    s = s.replace(/\b(?:javascript|data|vbscript)\s*:/gi, '');
  }
  // Strip on* event handlers (loop for incomplete multi-char sanitization)
  while (/\bon[a-z]+\s*=/gi.test(s)) {
    s = s.replace(/\bon[a-z]+\s*=/gi, '');
  }
  // Enforce length limit
  if (s.length > MAX_LABEL_LENGTH) {
    s = s.slice(0, MAX_LABEL_LENGTH);
  }
  return s;
}

/**
 * Validate a URL is safe for use in href attributes.
 * Only allows http:, https:, and mailto: protocols.
 * Returns the URL if safe, or `undefined` if dangerous.
 */
export function sanitizeURL(url: string): string | undefined {
  const trimmed = url.trim();
  // Allow relative URLs (start with / or #)
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) return trimmed;
  // Allow http(s) and mailto
  if (/^https?:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed)) return trimmed;
  // Block everything else (javascript:, data:, vbscript:, etc.)
  return undefined;
}
