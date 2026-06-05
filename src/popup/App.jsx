/**
 * popup/App.jsx
 * The popup UI shown when clicking the extension icon in the browser toolbar.
 * Provides:
 *  - Status info about the current tab
 *  - A button to open/focus the search panel on the active YouTube tab
 *  - Keyboard shortcut reminder
 */
import React, { useState, useEffect } from 'react';

export default function PopupApp() {
  const [tabStatus, setTabStatus] = useState('checking'); // 'checking' | 'youtube' | 'other'

  // Check if the current tab is a YouTube watch page
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab?.url?.includes('youtube.com/watch')) {
        setTabStatus('youtube');
      } else {
        setTabStatus('other');
      }
    });
  }, []);

  // Send a toggle message to the content script in the active tab
  function handleToggle() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_SEARCH' });
        window.close(); // Close the popup after sending
      }
    });
  }

  return (
    <div className="popup">
      {/* Header */}
      <div className="popup-header">
        <svg className="popup-yt-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M10 15l5.19-3L10 9v6zm11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z" />
        </svg>
        <h1 className="popup-title">Comment Search</h1>
      </div>

      {/* Content */}
      <div className="popup-body">
        {tabStatus === 'checking' && (
          <p className="popup-status">Checking current page…</p>
        )}

        {tabStatus === 'youtube' && (
          <>
            <p className="popup-status popup-status--active">
              ✓ Active on this video
            </p>
            <button className="popup-btn" onClick={handleToggle}>
              Toggle Search Panel
            </button>
          </>
        )}

        {tabStatus === 'other' && (
          <p className="popup-status popup-status--inactive">
            Navigate to a YouTube video to use Comment Search.
          </p>
        )}
      </div>

      {/* Footer shortcut hint */}
      <div className="popup-footer">
        <span>Keyboard shortcut:</span>
        <kbd>Ctrl+Shift+F</kbd>
        <span className="popup-mac-hint">(⌘⇧F on Mac)</span>
      </div>
    </div>
  );
}
