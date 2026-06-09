/**
 * components/CommentResult.jsx
 * Renders a single search result row with highlighted text.
 * Includes a per-comment AI TL;DR button (hover to reveal).
 */
import React from 'react';
import { splitWithHighlight } from '../utils/highlighter.js';

/**
 * CommentResult component
 * @param {object}   comment  — { id, text, author, element, isCreator }
 * @param {string}   query    — the current search keyword
 * @param {Function} onClick  — called when user clicks this result (scroll to)
 */
export default function CommentResult({ comment, query, onClick }) {
  const parts = splitWithHighlight(comment.text, query);

  return (
    <div className={`ycs-result-item ${comment.isCreator ? 'ycs-creator' : ''}`}>
      {/* Main clickable area — scrolls to the comment */}
      <button
        className="ycs-result-clickable"
        onClick={() => onClick(comment)}
        title={`Jump to comment by ${comment.author}`}
        aria-label={`Comment by ${comment.author}: ${comment.text}`}
      >
        {/* Author row — highlight author name if it matches the query */}
        <div className="ycs-result-author">
          {comment.isCreator && (
            <span className="ycs-creator-badge" title="Creator reply">★</span>
          )}
          <span className="ycs-author-name">
            {splitWithHighlight(comment.author, query).map((part, i) =>
              part.highlight ? (
                <mark key={i} className="ycs-highlight">{part.text}</mark>
              ) : (
                <span key={i}>{part.text}</span>
              )
            )}
          </span>
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


    </div>
  );
}
