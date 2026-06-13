/**
 * components/SearchPanel.jsx
 * Main panel orchestrating search, filters, and AI summaries.
 */
import React, { useState, useEffect, useRef } from 'react';
import SearchBar from './SearchBar.jsx';
import FilterBar from './FilterBar.jsx';
import ResultsList from './ResultsList.jsx';
import SummaryPanel from './SummaryPanel.jsx';
import { fetchComments, scrollToCommentInDOM } from '../utils/commentScraper.js';
import { checkAvailability, summarizeAll, destroySummarizer } from '../utils/aiSummarizer.js';

export default function SearchPanel({ onClose }) {
  const [query, setQuery] = useState('');
  const [comments, setComments] = useState([]);
  const [creatorOnly, setCreatorOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // AI state
  const [aiAvailability, setAiAvailability] = useState('unsupported'); // 'available'|'downloadable'|'unavailable'|'unsupported'
  const [summaryStatus, setSummaryStatus] = useState('idle');          // 'idle'|'downloading'|'loading'|'done'|'error'
  const [summaryText, setSummaryText] = useState('');
  const [summaryError, setSummaryError] = useState('');
  const [summaryProgress, setSummaryProgress] = useState(0);
  const [summarisedCount, setSummarisedCount] = useState(0);

  const stopObservingRef = useRef(null);

  // Load comments from the YouTube API when the panel opens
  useEffect(() => {
    const videoId = new URLSearchParams(window.location.search).get('v');
    if (!videoId) {
      setIsLoading(false);
      setLoadError('Could not determine the video ID from the URL.');
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setLoadError('');

    fetchComments(videoId)
      .then((data) => {
        if (!cancelled) {
          setComments(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err.message || 'Failed to load comments.');
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
      if (stopObservingRef.current) stopObservingRef.current();
      destroySummarizer();
    };
  }, []);

  // Check AI availability once on mount
  useEffect(() => {
    checkAvailability().then(setAiAvailability);
  }, []);

  // Esc key closes the panel
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Filtered results — top-level comments first, replies hidden unless searching
  const filtered = comments
    .filter((c) => {
      const q = query.toLowerCase();
      const matchesQuery = !query ||
        c.text.toLowerCase().includes(q) ||
        c.author.toLowerCase().includes(q);
      const matchesCreator = !creatorOnly || c.isCreator;
      const visibleWithoutQuery = query ? true : !c.isReply;
      return matchesQuery && matchesCreator && visibleWithoutQuery;
    })
    .sort((a, b) => {
      if (a.isReply !== b.isReply) return a.isReply ? 1 : -1;
      return 0;
    });

  function handleSelect(comment) {
    scrollToCommentInDOM(comment);
  }

  // ── Summarise All ────────────────────────────────────────────────────
  async function handleSummariseAll() {
    // Toggle: if already showing, close it
    if (summaryStatus === 'done' || summaryStatus === 'error') {
      setSummaryStatus('idle');
      return;
    }

    if (comments.length === 0) return;

    setSummaryText('');
    setSummaryError('');
    setSummaryProgress(0);
    setSummarisedCount(0);
    setSummaryStatus('loading');

    // Yield to React so the loading spinner renders before synchronous scoring runs
    await new Promise((resolve) => setTimeout(resolve, 0));

    try {
      const result = await summarizeAll(comments);
      setSummarisedCount(Math.min(comments.length, 300));
      setSummaryText(result);
      setSummaryStatus('done');
    } catch (err) {
      setSummaryError('Could not generate summary. Try again.');
      setSummaryStatus('error');
    }
  }

  const aiAvailable = aiAvailability === 'available' || aiAvailability === 'downloadable';

  return (
    <div className="ycs-panel" role="dialog" aria-label="YouTube Comment Search">
      {/* Header */}
      <div className="ycs-header">
        <span className="ycs-logo">
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

      <SearchBar
        query={query}
        onQueryChange={setQuery}
        isLoading={isLoading}
        matchCount={filtered.length}
        autoFocus
      />

      <FilterBar
        creatorOnly={creatorOnly}
        onCreatorToggle={() => setCreatorOnly((v) => !v)}
        totalComments={comments.length}
        aiAvailability={aiAvailability}
        summaryStatus={summaryStatus}
        onSummarizeAll={handleSummariseAll}
      />

      {/* AI Summary section — shown when active */}
      <SummaryPanel
        status={summaryStatus}
        summary={summaryText}
        error={summaryError}
        progress={summaryProgress}
        commentCount={summarisedCount}
        onClose={() => setSummaryStatus('idle')}
      />

      {loadError ? (
        <div className="ycs-empty-state">
          <p className="ycs-error">{loadError}</p>
        </div>
      ) : (
        <ResultsList
          results={filtered}
          query={query}
          isLoading={isLoading}
          onSelect={handleSelect}
        />
      )}
    </div>
  );
}
