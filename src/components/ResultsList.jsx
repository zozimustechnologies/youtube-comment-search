/**
 * components/ResultsList.jsx
 * Scrollable list of CommentResult items.
 * Shows empty states and loading placeholders.
 */
import React from 'react';
import CommentResult from './CommentResult.jsx';

/**
 * ResultsList component
 * @param {Array}    results       — filtered comment objects
 * @param {string}   query         — current search query
 * @param {boolean}  isLoading     — comments still being indexed
 * @param {Function} onSelect      — called with comment when user clicks a result
 */
export default function ResultsList({ results, query, isLoading, onSelect }) {
  // Nothing typed yet
  if (!query) {
    return (
      <div className="ycs-empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <p>Type a keyword to search comments</p>
        <kbd>Ctrl+Shift+F</kbd> to toggle
      </div>
    );
  }

  // Still indexing and no results yet
  if (isLoading && results.length === 0) {
    return (
      <div className="ycs-empty-state">
        <span className="ycs-spinner ycs-spinner-lg" />
        <p>Indexing comments…</p>
      </div>
    );
  }

  // No matches found
  if (results.length === 0) {
    return (
      <div className="ycs-empty-state">
        <p>No comments match <strong>"{query}"</strong></p>
        <span className="ycs-hint">Try scrolling down to load more comments</span>
      </div>
    );
  }

  return (
    <ul className="ycs-results-list" role="list">
      {results.map((comment) => (
        <li key={comment.id} role="listitem">
          <CommentResult
            comment={comment}
            query={query}
            onClick={onSelect}
          />
        </li>
      ))}
    </ul>
  );
}
