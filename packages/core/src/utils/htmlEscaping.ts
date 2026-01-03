/**
 * Escapes HTML special characters to prevent XSS attacks when inserting
 * untrusted content into HTML.
 *
 * Converts the following characters to their HTML entity equivalents:
 * - `&` → `&amp;`
 * - `<` → `&lt;`
 * - `>` → `&gt;`
 * - `"` → `&quot;`
 * - `'` → `&#39;`
 *
 * @param str - The string containing potentially unsafe HTML characters
 * @returns The escaped string safe for insertion into HTML content or attributes
 *
 * @example
 * ```typescript
 * escapeHtml('<script>alert("XSS")</script>');
 * // Returns: '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
 *
 * escapeHtml('Tom & Jerry');
 * // Returns: 'Tom &amp; Jerry'
 *
 * escapeHtml('<div class="foo">');
 * // Returns: '&lt;div class=&quot;foo&quot;&gt;'
 * ```
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
