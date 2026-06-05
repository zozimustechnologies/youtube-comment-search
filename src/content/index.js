/**
 * content/index.js
 * Entry point for the content script injected into YouTube watch pages.
 *
 * Responsibilities:
 *  1. Wait for the YouTube comments section to appear in the DOM
 *  2. Create a React root and inject our SearchPanel above the comments
 *  3. Handle YouTube's SPA navigation (re-inject on new video loads)
 *  4. Listen for keyboard shortcut toggle messages from the background worker
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import SearchPanel from '../components/SearchPanel.jsx';
import { observeNavigation } from '../utils/domObserver.js';

// Import the panel CSS
import '../styles/panel.css';

// The ID for our injected container so we never inject twice
const CONTAINER_ID = 'ycs-root-container';

// Selector for the element we inject our panel before
const COMMENTS_ANCHOR = 'ytd-comments#comments';

// Holds the React root so we can unmount it cleanly
let reactRoot = null;
let isVisible = true;

/**
 * Injects the React search panel into the YouTube page.
 * If already injected, does nothing.
 */
function injectPanel() {
  // Don't inject on non-watch pages
  if (!location.href.includes('youtube.com/watch')) return;

  // Remove any stale container from a previous navigation
  const existing = document.getElementById(CONTAINER_ID);
  if (existing) return; // Already injected for this page

  // Find the comments section
  const commentsSection = document.querySelector(COMMENTS_ANCHOR);
  if (!commentsSection) {
    // Comments section not rendered yet — retry shortly
    setTimeout(injectPanel, 800);
    return;
  }

  // Create our mount point div
  const container = document.createElement('div');
  container.id = CONTAINER_ID;

  // Insert our container right before the comments section
  commentsSection.parentNode.insertBefore(container, commentsSection);

  // Mount the React app
  isVisible = true;
  reactRoot = createRoot(container);
  renderPanel();
}

/**
 * (Re-)renders the SearchPanel into the existing React root.
 * Called on mount and when toggling visibility.
 */
function renderPanel() {
  if (!reactRoot) return;

  if (isVisible) {
    reactRoot.render(
      React.createElement(SearchPanel, {
        onClose: () => {
          isVisible = false;
          renderPanel(); // Re-render as null to hide
        },
      })
    );
  } else {
    // Render nothing (hides the panel without removing the container)
    reactRoot.render(null);
  }
}

/**
 * Removes the injected panel and unmounts React.
 * Called when navigating away from a watch page.
 */
function removePanel() {
  const container = document.getElementById(CONTAINER_ID);
  if (container) {
    if (reactRoot) {
      reactRoot.unmount();
      reactRoot = null;
    }
    container.remove();
  }
}

// ── Initial injection ──────────────────────────────────────────────────
// YouTube is a SPA — the page doesn't fully reload between videos.
// We poll briefly on first load, then rely on navigation observation.
if (location.href.includes('youtube.com/watch')) {
  injectPanel();
}

// ── SPA navigation support ─────────────────────────────────────────────
observeNavigation(() => {
  // A new video page has loaded — remove old panel and inject fresh
  removePanel();
  setTimeout(injectPanel, 1000); // Wait for YouTube to render new page content
});

// ── Message listener for keyboard shortcut toggle ──────────────────────
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'TOGGLE_SEARCH') {
    const container = document.getElementById(CONTAINER_ID);
    if (!container) {
      // Panel was removed — re-inject it
      injectPanel();
    } else {
      // Toggle visibility
      isVisible = !isVisible;
      renderPanel();
    }
  }
});
