/**
 * content/index.js
 * Content script injected into YouTube watch pages.
 *
 * The search panel is NOT shown automatically — it is injected and revealed
 * only when the user presses the toolbar button or keyboard shortcut.
 * Subsequent toggles simply show/hide the already-injected panel via CSS.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import SearchPanel from '../components/SearchPanel.jsx';
import { observeNavigation } from '../utils/domObserver.js';
import '../styles/panel.css';

const CONTAINER_ID = 'ycs-root-container';

// Selectors tried in order to find where to insert the panel
const COMMENT_ANCHORS = [
  'ytd-comments#comments',
  '#comments',
  'ytd-item-section-renderer#sections',
];

let reactRoot = null;

// ── Helpers ────────────────────────────────────────────────────────────

function findAnchor() {
  for (const sel of COMMENT_ANCHORS) {
    const el = document.querySelector(sel);
    if (el && el.parentNode) return el;
  }
  return null;
}

function getContainer() {
  return document.getElementById(CONTAINER_ID);
}

/**
 * Injects the panel container into the YouTube DOM and mounts React.
 * Returns the container element, or null if the anchor isn't ready yet.
 */
function mountPanel() {
  // Already mounted
  if (getContainer()) return getContainer();

  const anchor = findAnchor();
  if (!anchor) return null;

  const container = document.createElement('div');
  container.id = CONTAINER_ID;
  // Start hidden — toggle will reveal it
  container.style.display = 'none';

  anchor.parentNode.insertBefore(container, anchor);

  reactRoot = createRoot(container);
  reactRoot.render(
    React.createElement(SearchPanel, {
      onClose: () => {
        container.style.display = 'none';
      },
    })
  );

  return container;
}

/**
 * Shows the panel. If not yet injected, tries to inject first.
 * If the anchor isn't ready, polls every 600ms for up to 20 seconds.
 */
function showPanel(attempt = 0) {
  const container = mountPanel();

  if (container) {
    container.style.display = '';   // Show
    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return;
  }

  // Anchor not ready yet — retry
  if (attempt < 33) {
    setTimeout(() => showPanel(attempt + 1), 600);
  }
}

function togglePanel() {
  const container = getContainer();
  if (!container) {
    // Panel hasn't been injected yet — inject and show it
    showPanel();
    return;
  }
  // Already injected — flip visibility
  if (container.style.display === 'none') {
    container.style.display = '';
    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } else {
    container.style.display = 'none';
  }
}

function removePanel() {
  const container = getContainer();
  if (container) {
    if (reactRoot) { reactRoot.unmount(); reactRoot = null; }
    container.remove();
  }
}

// ── SPA navigation: clean up on every new video ────────────────────────
observeNavigation(() => {
  removePanel();
});

// ── Message from popup button or keyboard shortcut (via background) ────
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'TOGGLE_SEARCH') {
    togglePanel();
  }
});

// ── Direct keyboard listener — bypasses service worker message relay ───
// Catches Ctrl+Shift+F (Windows/Linux) and Command+Shift+F (Mac)
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
    e.preventDefault();
    togglePanel();
  }
});


