/**
 * components/SummaryPanel.jsx
 * Collapsible AI summary section shown below the filter bar.
 * Handles: idle → downloading → loading → result / error states.
 */
import React from 'react';

/**
 * Renders simple markdown key-points (lines starting with - or *) as a list.
 * Falls back to plain paragraphs for non-list content.
 * @param {string} markdown
 */
function MarkdownResult({ markdown }) {
  const lines = markdown.trim().split('\n').filter(Boolean);

  const items = lines.map((line) => line.replace(/^[-*•]\s*/, '').trim());

  // If every line looks like a list item, render as <ul>
  const isList = lines.every((l) => /^[-*•]/.test(l.trim()));

  if (isList) {
    return (
      <ul className="ycs-summary-list">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    );
  }

  // Otherwise render as paragraphs
  return (
    <div className="ycs-summary-text">
      {lines.map((line, i) => (
        <p key={i}>{line}</p>
      ))}
    </div>
  );
}

/**
 * SummaryPanel component
 *
 * Props:
 *  status       'idle' | 'downloading' | 'loading' | 'done' | 'error'
 *  summary      string — the AI result (when status === 'done')
 *  error        string — error message (when status === 'error')
 *  progress     number 0–1 — download progress (when status === 'downloading')
 *  commentCount number — how many comments were summarised
 *  onClose      () => void — hides the summary panel
 */
export default function SummaryPanel({ status, summary, error, progress, commentCount, onClose }) {
  if (status === 'idle') return null;

  return (
    <div className="ycs-summary-panel" role="region" aria-label="AI Summary">
      {/* Header row */}
      <div className="ycs-summary-header">
        <span className="ycs-summary-title">
          {/* Sparkle icon */}
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
          </svg>
          AI Summary
          {commentCount > 0 && status === 'done' && (
            <span className="ycs-summary-meta">· {commentCount} comments</span>
          )}
        </span>
        <button className="ycs-close-btn" onClick={onClose} aria-label="Close summary" title="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Downloading state — model needs to be fetched first */}
      {status === 'downloading' && (
        <div className="ycs-summary-body">
          <p className="ycs-summary-hint">
            Downloading Gemini Nano model — this is a one-time download (~2 GB).
          </p>
          <div className="ycs-progress-track" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="ycs-progress-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <span className="ycs-progress-label">{Math.round(progress * 100)}%</span>
        </div>
      )}

      {/* Loading state — model is ready, generating */}
      {status === 'loading' && (
        <div className="ycs-summary-body ycs-summary-loading">
          <span className="ycs-spinner" aria-label="Generating summary…" />
          <span>Generating summary…</span>
        </div>
      )}

      {/* Done state */}
      {status === 'done' && summary && (
        <div className="ycs-summary-body">
          <MarkdownResult markdown={summary} />
        </div>
      )}

      {/* Error state */}
      {status === 'error' && (
        <div className="ycs-summary-body ycs-summary-error">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error || 'Something went wrong. Try again.'}</span>
        </div>
      )}
    </div>
  );
}
