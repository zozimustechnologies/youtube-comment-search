/**
 * utils/highlighter.js
 * Utility for highlighting keyword matches inside text strings.
 * Returns an array of React-renderable parts: plain strings and <mark> spans.
 */

/**
 * Splits `text` into segments, wrapping matched portions with a highlight marker.
 * Returns an array of objects: { text, highlight: boolean }
 *
 * Example:
 *   splitWithHighlight("Hello World", "world")
 *   → [{ text: "Hello ", highlight: false }, { text: "World", highlight: true }]
 *
 * @param {string} text    — full comment text
 * @param {string} query   — search keyword (case-insensitive)
 * @returns {Array<{text: string, highlight: boolean}>}
 */
export function splitWithHighlight(text, query) {
  if (!query || query.trim() === '') {
    return [{ text, highlight: false }];
  }

  // Escape special regex characters in user input to avoid regex errors
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part) => ({
    text: part,
    highlight: regex.test(part),
  }));
}
