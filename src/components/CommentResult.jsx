/**
 * components/CommentResult.jsx
 * Renders a single search result row with highlighted text.
 * Clicking it scrolls the page to the original comment.
 */
import React from 'react';
import { splitWithHighlight } from '../utils/highlighter.js';

/**
 * CommentResult component
 * @param {object}   comment  — { id, text, author, element, isCreator }
 * @param {string}   query    — the current search keyword
 * @param {Function} onClick  — called when user clicks this result
 */
export default function CommentResult({ comment, query, onClick }) {
  // Split the comment text into highlighted / non-highlighted segments
  const parts = splitWithHighlight(comment.text, query);

  return (
    <button
      className={`ycs-result-item ${comment.isCreator ? 'ycs-creator' : ''}`}
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
  );
}
