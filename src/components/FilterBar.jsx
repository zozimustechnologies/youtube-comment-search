/**
 * components/FilterBar.jsx
 * Toolbar with filter toggles and the AI "Summarize All" button.
 */
import React from 'react';

/**
 * FilterBar component
 * @param {boolean}  creatorOnly       — whether creator filter is active
 * @param {Function} onCreatorToggle   — toggles creator-only mode
 * @param {number}   totalComments     — total indexed comments count
 * @param {string}   aiAvailability    — 'available'|'downloadable'|'unavailable'|'unsupported'
 * @param {string}   summaryStatus     — 'idle'|'downloading'|'loading'|'done'|'error'
 * @param {Function} onSummarizeAll    — triggered when user clicks Summarize All
 */
export default function FilterBar({
  creatorOnly,
  onCreatorToggle,
  totalComments,
  aiAvailability,
  summaryStatus,
  onSummarizeAll,
}) {
  // Don't show the AI button if the device can't run the model
  const showAiButton = aiAvailability === 'available' || aiAvailability === 'downloadable';
  const aibusy = summaryStatus === 'downloading' || summaryStatus === 'loading';

  const isOpen = summaryStatus === 'done' || summaryStatus === 'error';
  const aiTitle = isOpen ? 'Close top comments' : 'Show the most representative comments (ranked by relevance)';

  return (
    <div className="ycs-filter-bar">
      <span className="ycs-indexed-count">
        {totalComments} comment{totalComments !== 1 ? 's' : ''} indexed
      </span>

      <div className="ycs-filters">
        <button
          className={`ycs-filter-btn ${!creatorOnly ? 'ycs-filter-active' : ''}`}
          onClick={() => creatorOnly && onCreatorToggle()}
          aria-pressed={!creatorOnly}
        >
          All
        </button>
        <button
          className={`ycs-filter-btn ${creatorOnly ? 'ycs-filter-active' : ''}`}
          onClick={() => !creatorOnly && onCreatorToggle()}
          aria-pressed={creatorOnly}
          title="Show only replies from the video creator"
        >
          ★ Creator
        </button>

        {showAiButton && (
          <button
            className={`ycs-filter-btn ycs-ai-btn${isOpen ? ' ycs-ai-btn--open' : ''}`}
            onClick={onSummarizeAll}
            disabled={aibusy || totalComments === 0}
            title={aiTitle}
            aria-pressed={isOpen}
            aria-busy={aibusy}
          >
            {aibusy ? (
              <>
                <span className="ycs-spinner ycs-spinner-inline" />
                Analysing…
              </>
            ) : isOpen ? (
              <>✦ Top Comments ✕</>
            ) : (
              <>✦ Top Comments</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
