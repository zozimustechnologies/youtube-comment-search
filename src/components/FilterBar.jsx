/**
 * components/FilterBar.jsx
 * Toolbar with filter toggles: "All", "Creator replies only"
 */
import React from 'react';

/**
 * FilterBar component
 * @param {boolean}  creatorOnly       — whether creator filter is active
 * @param {Function} onCreatorToggle   — toggles creator-only mode
 * @param {number}   totalComments     — total indexed comments count
 */
export default function FilterBar({ creatorOnly, onCreatorToggle, totalComments }) {
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
      </div>
    </div>
  );
}
