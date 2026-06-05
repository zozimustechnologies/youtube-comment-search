/**
 * utils/domObserver.js
 * Watches the YouTube comments section for new comments being injected
 * (YouTube loads comments lazily as the user scrolls).
 * Calls the provided callback whenever new comment nodes appear.
 */

// The comments section container selector
const COMMENTS_CONTAINER = 'ytd-comments#comments';

/**
 * Starts observing the YouTube comments section for DOM mutations.
 * @param {Function} onNewComments — called whenever new comments are detected
 * @returns {Function} stopObserving — call this to disconnect the observer
 */
export function observeComments(onNewComments) {
  let observer = null;
  let debounceTimer = null;

  /**
   * Debounce the callback so rapid DOM mutations don't cause excessive re-renders.
   * Waits 400ms after the last mutation before calling onNewComments.
   */
  function handleMutations() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      onNewComments();
    }, 400);
  }

  /**
   * Tries to find the comments container and attach the MutationObserver.
   * YouTube renders comments asynchronously, so we poll until it appears.
   */
  function attachObserver() {
    const container = document.querySelector(COMMENTS_CONTAINER);
    if (container) {
      observer = new MutationObserver(handleMutations);
      observer.observe(container, {
        childList: true,   // Watch for new comment nodes being added
        subtree: true,     // Watch all descendants, not just direct children
      });
      return true;
    }
    return false;
  }

  // Poll every 500ms until the comments section appears in the DOM
  const pollInterval = setInterval(() => {
    if (attachObserver()) {
      clearInterval(pollInterval);
      // Fire once immediately so we capture already-loaded comments
      onNewComments();
    }
  }, 500);

  // Return a cleanup function
  return function stopObserving() {
    clearInterval(pollInterval);
    clearTimeout(debounceTimer);
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  };
}

/**
 * Watches for YouTube's SPA navigation (the URL changing without a full page reload).
 * Calls callback whenever the user navigates to a new video.
 * @param {Function} onNavigate
 * @returns {Function} cleanup
 */
export function observeNavigation(onNavigate) {
  let lastUrl = location.href;

  const navObserver = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      if (location.href.includes('youtube.com/watch')) {
        onNavigate();
      }
    }
  });

  // Observe the <title> element — YouTube updates it on every navigation
  const titleEl = document.querySelector('title');
  if (titleEl) {
    navObserver.observe(titleEl, { childList: true });
  }

  return () => navObserver.disconnect();
}
