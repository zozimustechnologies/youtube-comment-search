/**
 * components/SearchBar.jsx
 * The main search input field with a clear button and keyboard shortcut hint.
 */
import React, { useRef, useEffect } from 'react';

/**
 * SearchBar component
 * @param {string}   query          — current search text
 * @param {Function} onQueryChange  — called with new query string on input
 * @param {boolean}  isLoading      — shows a spinner when comments are indexing
 * @param {number}   matchCount     — number of matched comments
 * @param {boolean}  autoFocus      — whether to auto-focus on mount
 */
export default function SearchBar({ query, onQueryChange, isLoading, matchCount, autoFocus }) {
  const inputRef = useRef(null);

  // Auto-focus the input when the panel opens
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  function handleClear() {
    onQueryChange('');
    inputRef.current?.focus();
  }

  return (
    <div className="ycs-search-bar">
      {/* Search icon */}
      <svg className="ycs-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>

      <input
        ref={inputRef}
        type="text"
        className="ycs-input"
        placeholder="Search comments or usernames…"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        aria-label="Search comments"
        spellCheck={false}
        autoComplete="off"
      />

      {/* Match count badge */}
      {query && !isLoading && (
        <span className="ycs-match-count" aria-live="polite">
          {matchCount} {matchCount === 1 ? 'match' : 'matches'}
        </span>
      )}

      {/* Loading spinner */}
      {isLoading && (
        <span className="ycs-spinner" aria-label="Indexing comments…" />
      )}

      {/* Clear button */}
      {query && (
        <button
          className="ycs-clear-btn"
          onClick={handleClear}
          aria-label="Clear search"
          title="Clear (Esc)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}
