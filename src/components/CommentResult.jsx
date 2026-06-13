/**
 * components/CommentResult.jsx
 * Renders a single search result row with highlighted text.
 * Comments are loaded from the YouTube Data API v3 (no DOM element reference).
 */
import React from 'react';
import { splitWithHighlight } from '../utils/highlighter.js';

/**
 * CommentResult component
 * @param {object}   comment  — { id, text, author, likeCount, publishedAt, isCreator, isReply }
 * @param {string}   query    — the current search keyword
 * @param {Function} onClick  — called when user clicks this result
 */
export default function CommentResult({ comment, query, onClick }) {
  const parts = splitWithHighlight(comment.text, query);

  return (
    <div className={`ycs-result-item ${comment.isCreator ? 'ycs-creator' : ''} ${comment.isReply ? 'ycs-reply' : ''}`}>
      <button
        className="ycs-result-clickable"
        onClick={() => onClick(comment)}
        aria-label={`Comment by ${comment.author}: ${comment.text}`}
      >
        {/* Author row */}
        <div className="ycs-result-author">
          {comment.isCreator && (
            <span className="ycs-creator-badge" title="Creator reply">★</span>
          )}
          {comment.isReply && (
            <span className="ycs-reply-badge" title="Reply">↩</span>
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
          {comment.likeCount > 0 && (
            <span className="ycs-like-count" title="Likes">👍 {comment.likeCount.toLocaleString()}</span>
          )}
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
