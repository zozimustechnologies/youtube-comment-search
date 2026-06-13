/**
 * components/TranscriptPanel.jsx
 * Shows the YouTube transcript with live search filtering and click-to-seek.
 */
import React, { useState, useEffect, useRef } from 'react';
import { fetchTranscript, formatTime, seekTo, getTranscriptLanguage } from '../utils/transcriptFetcher.js';

export default function TranscriptPanel() {
  const [cues, setCues] = useState(null);        // null = loading, [] = unavailable, [...] = loaded
  const [query, setQuery] = useState('');
  const [lang, setLang] = useState(null);
  const [activeCue, setActiveCue] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setLang(getTranscriptLanguage());
    fetchTranscript().then((result) => {
      setCues(result ?? []);
    });
  }, []);

  // Auto-focus search input when panel loads
  useEffect(() => {
    if (cues?.length && inputRef.current) {
      inputRef.current.focus();
    }
  }, [cues]);

  function handleCueClick(cue) {
    setActiveCue(cue.start);
    seekTo(cue.start);
  }

  // Filter cues by query
  const q = query.toLowerCase().trim();
  const filtered = cues
    ? (q ? cues.filter((c) => c.text.toLowerCase().includes(q)) : cues)
    : [];

  // Highlight matching text
  function highlight(text) {
    if (!q) return text;
    const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === q
        ? <mark key={i} className="ycs-highlight">{part}</mark>
        : part
    );
  }

  // Loading state
  if (cues === null) {
    return (
      <div className="ycs-transcript-body">
        <div className="ycs-empty-state">
          <div className="ycs-spinner ycs-spinner-lg" />
          <p>Loading transcript…</p>
        </div>
      </div>
    );
  }

  // No transcript available
  if (cues.length === 0) {
    return (
      <div className="ycs-transcript-body">
        <div className="ycs-empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <p>No transcript available</p>
          <span className="ycs-hint">This video may not have captions enabled.</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Transcript search bar */}
      <div className="ycs-search-bar">
        <svg className="ycs-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={inputRef}
          className="ycs-input"
          type="text"
          placeholder="Search transcript…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <span className="ycs-match-count">
            {filtered.length} {filtered.length === 1 ? 'match' : 'matches'}
          </span>
        )}
        {query && (
          <button className="ycs-clear-btn" onClick={() => setQuery('')} aria-label="Clear">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Transcript cue list */}
      <div className="ycs-transcript-meta">
        {lang && <span className="ycs-transcript-lang">{lang}</span>}
        <span className="ycs-indexed-count">{cues.length} segments · click to seek</span>
      </div>
      <ul className="ycs-transcript-list" role="list">
        {filtered.length === 0 ? (
          <li>
            <div className="ycs-empty-state">
              <p>No matches for "{query}"</p>
            </div>
          </li>
        ) : (
          filtered.map((cue, i) => (
            <li
              key={i}
              className={`ycs-transcript-cue${activeCue === cue.start ? ' ycs-transcript-cue--active' : ''}`}
              onClick={() => handleCueClick(cue)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleCueClick(cue)}
            >
              <span className="ycs-transcript-time">{formatTime(cue.start)}</span>
              <span className="ycs-transcript-text">{highlight(cue.text)}</span>
            </li>
          ))
        )}
      </ul>
    </>
  );
}
