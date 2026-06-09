/**
 * utils/aiSummarizer.js
 * Wraps the Chrome/Edge built-in Summarizer API (stable since v138).
 * Runs Gemini Nano fully on-device — no API key, no network after model download.
 *
 * API global: `Summarizer` (available in content scripts, no manifest permissions needed)
 */

// Single cached summarizer instance — creating is expensive (~500ms), so we reuse it
let summarizerInstance = null;

/**
 * Checks whether the built-in Summarizer API is available on this device.
 * @returns {Promise<'available' | 'downloadable' | 'unavailable' | 'unsupported'>}
 *   - 'available'    → model is ready to use immediately
 *   - 'downloadable' → supported but model needs to download first (~2 GB, one-time)
 *   - 'unavailable'  → device doesn't meet hardware requirements
 *   - 'unsupported'  → browser doesn't support the API at all
 */
export async function checkAvailability() {
  if (typeof Summarizer === 'undefined') return 'unsupported';
  try {
    const result = await Summarizer.availability();
    return result; // 'available' | 'downloadable' | 'unavailable'
  } catch {
    return 'unsupported';
  }
}

/**
 * Lazily creates and caches the Summarizer instance.
 * @param {Function} [onProgress] - called with (loaded, total) during model download
 * @returns {Promise<Summarizer>}
 */
async function getSummarizer(onProgress) {
  if (summarizerInstance) return summarizerInstance;

  summarizerInstance = await Summarizer.create({
    // key-points gives a bulleted breakdown — good for "all comments" view
    type: 'key-points',
    format: 'markdown',
    length: 'medium',
    sharedContext: 'These are comments from a YouTube video.',
    expectedInputLanguages: ['en'],
    outputLanguage: 'en',
    monitor(m) {
      if (onProgress) {
        m.addEventListener('downloadprogress', (e) => {
          onProgress(e.loaded, e.total);
        });
      }
    },
  });

  return summarizerInstance;
}

/**
 * Summarizes all comments as a key-points list.
 * Caps at 200 comments to stay within the context window.
 *
 * @param {Array<{text: string, author: string}>} comments
 * @param {Function} [onProgress] - (loaded, total) during model download
 * @returns {Promise<string>} markdown summary
 */
export async function summarizeAll(comments, onProgress) {
  const MAX_COMMENTS = 200;
  const sample = comments.slice(0, MAX_COMMENTS);

  // Build a compact text block: "Author: comment text"
  const text = sample
    .map((c) => `${c.author}: ${c.text}`)
    .join('\n');

  const summarizer = await getSummarizer(onProgress);

  return summarizer.summarize(text, {
    context: `These are the top ${sample.length} comments on a YouTube video. Summarise the key themes, opinions, and sentiment expressed.`,
  });
}

/**
 * Generates a short TL;DR for a single comment.
 * Creates a temporary one-shot summarizer (not cached) since we want 'tldr' type.
 *
 * @param {string} text - the comment text
 * @returns {Promise<string>} plain-text tldr
 */
export async function summarizeOne(text) {
  // Single-use summarizer with tldr settings
  const s = await Summarizer.create({
    type: 'tldr',
    format: 'plain-text',
    length: 'short',
    sharedContext: 'A single YouTube comment.',
    expectedInputLanguages: ['en'],
    outputLanguage: 'en',
  });

  try {
    const result = await s.summarize(text, {
      context: 'Summarise this YouTube comment in one short sentence.',
    });
    return result;
  } finally {
    s.destroy(); // free resources immediately after single use
  }
}

/**
 * Destroys the cached summarizer instance.
 * Call this when the panel is removed (e.g. on SPA navigation).
 */
export function destroySummarizer() {
  if (summarizerInstance) {
    summarizerInstance.destroy();
    summarizerInstance = null;
  }
}
