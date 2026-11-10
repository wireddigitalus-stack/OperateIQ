/**
 * Serialize data for a <script type="application/ld+json"> tag.
 *
 * JSON.stringify does NOT escape "<", so a value such as
 * `</script><script>alert(1)</script>` would close the tag and execute.
 * Escaping <, >, & and the JS line separators makes the output safe to embed
 * while remaining valid JSON for search engines.
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
