/**
 * utils/aiSummarizer.js
 * Extractive summarisation — works on every device, no API key, no download.
 *
 * Strategy:
 *  - summarizeAll: TF-IDF-style word frequency to score each comment,
 *    pick the top N most representative ones as "key points".
 *  - summarizeOne: Extract the single most informative sentence from a comment.
 *
 * The exported API intentionally mirrors the original Gemini Nano API so
 * SearchPanel.jsx needs no changes.
 */

// Common English stop-words to ignore when scoring
const STOP_WORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with',
  'is','are','was','were','be','been','being','have','has','had','do','does',
  'did','will','would','could','should','may','might','i','you','he','she',
  'it','we','they','this','that','these','those','my','your','his','her',
  'its','our','their','what','which','who','how','when','where','why',
  'not','no','so','as','if','by','up','out','about','just','also','get',
  'got','can','all','more','very','really','like','know','think','make',
  'made','even','still','some','one','two','time','way','from','than','then',
]);

/**
 * Splits text into lowercase word tokens, stripping punctuation.
 * @param {string} text
 * @returns {string[]}
 */
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Builds a term-frequency map for a corpus of strings.
 * Returns a Map<word, docFrequency> (how many docs contain the word).
 * @param {string[]} docs
 * @returns {Map<string, number>}
 */
function buildDocFrequency(docs) {
  const df = new Map();
  for (const doc of docs) {
    const words = new Set(tokenize(doc));
    for (const w of words) {
      df.set(w, (df.get(w) || 0) + 1);
    }
  }
  return df;
}

/**
 * Scores a single comment against the corpus using TF-IDF.
 * Higher score = more representative of the overall discussion.
 * @param {string} text
 * @param {Map<string, number>} df
 * @param {number} totalDocs
 * @returns {number}
 */
function scoreComment(text, df, totalDocs) {
  const words = tokenize(text);
  if (words.length === 0) return 0;

  // Count term frequencies in this comment
  const tf = new Map();
  for (const w of words) tf.set(w, (tf.get(w) || 0) + 1);

  let score = 0;
  for (const [word, freq] of tf) {
    const docFreq = df.get(word) || 1;
    // TF × IDF: reward words common in this comment but not in every comment
    const idf = Math.log(totalDocs / docFreq);
    score += (freq / words.length) * idf;
  }
  return score;
}

// ── Public API ─────────────────────────────────────────────────────────

/**
 * Always returns 'available' — extractive summary works on every device.
 * @returns {Promise<'available'>}
 */
export async function checkAvailability() {
  return 'available';
}

/**
 * Summarises all comments by extracting the top representative ones.
 * Returns a markdown bullet list of the top comments (as "key points").
 *
 * @param {Array<{text: string, author: string}>} comments
 * @param {Function} [_onProgress] - ignored (no download needed)
 * @returns {Promise<string>} markdown bullet list
 */
export async function summarizeAll(comments, _onProgress) {
  const MAX_COMMENTS = 300;
  const TOP_N = 7; // Number of key-point comments to surface

  const sample = comments.slice(0, MAX_COMMENTS);
  if (sample.length === 0) return '- No comments to summarise.';

  const texts = sample.map((c) => c.text);
  const df = buildDocFrequency(texts);
  const total = texts.length;

  // Score every comment and sort descending
  const scored = sample
    .map((c) => ({ comment: c, score: scoreComment(c.text, df, total) }))
    .sort((a, b) => b.score - a.score);

  // Take top N, deduplicate very similar ones (same first 40 chars)
  const seen = new Set();
  const top = [];
  for (const { comment } of scored) {
    const key = comment.text.slice(0, 40).toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      top.push(comment);
    }
    if (top.length >= TOP_N) break;
  }

  // Format as markdown bullet list with author attribution
  const lines = top.map((c) => {
    // Truncate very long comments
    const text = c.text.length > 160 ? c.text.slice(0, 157) + '…' : c.text;
    return `- **${c.author}**: ${text}`;
  });

  return lines.join('\n');
}

/**
 * Extracts the most informative sentence from a single comment.
 * Splits on sentence boundaries and returns the highest-scored sentence.
 *
 * @param {string} text
 * @returns {Promise<string>}
 */
export async function summarizeOne(text) {
  // Split into sentences
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15);

  if (sentences.length <= 1) return text.slice(0, 160);

  // Score each sentence against the full comment
  const df = buildDocFrequency([text]);
  const best = sentences
    .map((s) => ({ s, score: scoreComment(s, df, 1) }))
    .sort((a, b) => b.score - a.score)[0];

  return best.s.length > 160 ? best.s.slice(0, 157) + '…' : best.s;
}

/**
 * No-op — no resources to destroy for extractive summarisation.
 */
export function destroySummarizer() {}

