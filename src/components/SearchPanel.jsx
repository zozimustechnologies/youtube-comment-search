/**
 * components/SearchPanel.jsx
 * The main panel component that orchestrates:
 *   - Comment scraping via MutationObserver
 *   - Search filtering
 *   - Creator filter
 *   - Keyboard shortcuts (Esc to close, Ctrl+F to focus)
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import SearchBar from './SearchBar.jsx';
import FilterBar from './FilterBar.jsx';
import ResultsList from './ResultsList.jsx';
import { scrapeComments, scrollToComment } from '../utils/commentScraper.js';
import { observeComments } from '../utils/domObserver.js';

/**
 * SearchPanel component
 * @param {Function} onClose — called when the user closes the panel
 */
export default function SearchPanel({ onClose }) {
  const [query, setQuery] = useState('');
  const [comments, setComments] = useState([]);   // All indexed comments
  const [creatorOnly, setCreatorOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // True while waiting for first scrape

  // Ref to hold the stop function returned by observeComments
  const stopObservingRef = useRef(null);

  /**
   * Re-scrape comments from the DOM and update state.
   * Called by the MutationObserver whenever new comments appear.
   */
  const refreshComments = useCallback(() => {
    const scraped = scrapeComments();
    setComments(scraped);
    setIsLoading(false);
  }, []);

  // Start observing the comments section on mount, stop on unmount
  useEffect(() => {
    setIsLoading(true);
    stopObservingRef.current = observeComments(refreshComments);

    return () => {
      if (stopObservingRef.current) stopObservingRef.current();
    };
  }, [refreshComments]);

  // Keyboard shortcuts: Esc closes the panel, Ctrl+F focuses the input
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Derive filtered results from all comments
  const filtered = comments.filter((c) => {
    const matchesQuery = !query || c.text.toLowerCase().includes(query.toLowerCase());
    const matchesCreator = !creatorOnly || c.isCreator;
    return matchesQuery && matchesCreator;
  });

  function handleSelect(comment) {
    scrollToComment(comment.element);
  }

  return (
    <div className="ycs-panel" role="dialog" aria-label="YouTube Comment Search">
      {/* Panel header */}
      <div className="ycs-header">
        <span className="ycs-logo">
          {/* Simple YouTube-style play icon */}
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M10 15l5.19-3L10 9v6zm11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z" />
          </svg>
          Comment Search
        </span>
        <button className="ycs-close-btn" onClick={onClose} aria-label="Close search panel" title="Close (Esc)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Search input */}
      <SearchBar
        query={query}
        onQueryChange={setQuery}
        isLoading={isLoading}
        matchCount={filtered.length}
        autoFocus
      />

      {/* Filter toggles */}
      <FilterBar
        creatorOnly={creatorOnly}
        onCreatorToggle={() => setCreatorOnly((v) => !v)}
        totalComments={comments.length}
      />

      {/* Results */}
      <ResultsList
        results={filtered}
        query={query}
        isLoading={isLoading}
        onSelect={handleSelect}
      />
    </div>
  );
}
