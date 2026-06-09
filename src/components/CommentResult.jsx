/**
 * components/CommentResult.jsx
 * Renders a single search result row with highlighted text.
 * Includes a per-comment AI TL;DR button (hover to reveal).
 */
import React, { useState } from 'react';
import { splitWithHighlight } from '../utils/highlighter.js';
import { summarizeOne } from '../utils/aiSummarizer.js';

/**
 * CommentResult component
 * @param {object}   comment        — { id, text, author, element, isCreator }
 * @param {string}   query          — the current search keyword
 * @param {Function} onClick        — called when user clicks this result (scroll to)
 * @param {boolean}  aiAvailable    — whether the AI summarizer is usable
 */
export default function CommentResult({ comment, query, onClick, aiAvailable }) {
  const [tldr, setTldr] = useState(null);        // null | string
  const [tldrLoading, setTldrLoading] = useState(false);
  const [tldrError, setTldrError] = useState(false);

  const parts = splitWithHighlight(comment.text, query);

  async function handleSummariseOne(e) {
    // Don't also trigger the scroll-to click
    e.stopPropagation();

    // If we already have a result, toggle it off
    if (tldr !== null) { setTldr(null); return; }

    setTldrError(false);
    setTldrLoading(true);
    try {
      const result = await summarizeOne(comment.text);
      setTldr(result);
    } catch {
      setTldrError(true);
    } finally {
      setTldrLoading(false);
    }
  }

  return (
    <div className={`ycs-result-item ${comment.isCreator ? 'ycs-creator' : ''}`}>
      {/* Main clickable area — scrolls to the comment */}
      <button
        className="ycs-result-clickable"
        onClick={() => onClick(comment)}
        title={`Jump to comment by ${comment.author}`}
        aria-label={`Comment by ${comment.author}: ${comment.text}`}
      >
        {/* Author row */}
        <div className="ycs-result-author">
          {comment.isCreator && (
            <span className="ycs-creator-badge" title="Creator reply">★</span>
          )}
          <span className="ycs-author-name">{comment.author}</span>
        </div>

        {/* Comment text with highlighted matches */}
        <p className="ycs-result-text">
          {parts.map((part, i) =>
            part.highlight ? (
              <mark key={i} className="ycs-highlight">{part.text}</mark>
            ) : (
              <span key={i}>{part.text}</span>
            )
          )}
        </p>
      </button>

      {/* Per-comment AI button — only shown when AI is available */}
      {aiAvailable && (
        <div className="ycs-result-ai-row">
          <button
            className={`ycs-tldr-btn ${tldr !== null ? 'ycs-tldr-btn--active' : ''}`}
            onClick={handleSummariseOne}
            disabled={tldrLoading}
            title={tldr !== null ? 'Hide TL;DR' : 'Summarise this comment with AI'}
            aria-label="AI TL;DR"
          >
            {tldrLoading ? (
              <span className="ycs-spinner ycs-spinner-inline" aria-label="Generating…" />
            ) : (
              '✦ TL;DR'
            )}
          </button>

          {tldrError && (
            <span className="ycs-tldr-error">Failed — try again</span>
          )}
        </div>
      )}

      {/* Inline TL;DR result */}
      {tldr !== null && (
        <div className="ycs-tldr-result" aria-live="polite">
          {tldr}
        </div>
      )}
    </div>
  );
}
