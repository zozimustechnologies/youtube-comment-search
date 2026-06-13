/**
 * utils/commentScraper.js
 * Fetches comments for the current YouTube video via the YouTube Data API v3.
 * API calls are routed through the background service worker which holds the auth token.
 *
 * Each comment object contains:
 *   - id          {string}  — YouTube comment/thread ID
 *   - text        {string}  — plain comment text
 *   - author      {string}  — commenter display name
 *   - likeCount   {number}  — number of likes
 *   - publishedAt {string}  — ISO 8601 publish date
 *   - isCreator   {boolean} — whether the commenter is the video creator
 *   - isReply     {boolean} — whether this is a reply to a top-level comment
 */

/**
 * Fetches all comments for the given videoId via the background service worker,
 * which calls the YouTube Data API v3 commentThreads.list endpoint.
 * @param {string} videoId
 * @returns {Promise<Array>}
 */
export function fetchComments(videoId) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'LOAD_COMMENTS', videoId }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (response?.error) {
        reject(new Error(response.error));
        return;
      }
      resolve(response?.data ?? []);
    });
  });
}

const COMMENT_SELECTOR = 'ytd-comment-view-model, ytd-comment-renderer';
const COMMENTS_SECTION = 'ytd-comments#comments, #comments';

/** Normalise text for loose comparison: lowercase + collapse whitespace */
function normalise(str) {
  return str.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Finds a rendered DOM comment node that matches the given API comment object.
 * Matches on author + the first 80 characters of the comment text.
 * @param {{ text: string, author: string }} comment
 * @returns {Element|null}
 */
function findCommentNode(comment) {
  const needle = normalise(comment.text).slice(0, 80);
  const authorNeedle = normalise(comment.author);
  const nodes = document.querySelectorAll(COMMENT_SELECTOR);
  for (const node of nodes) {
    const textEl = node.querySelector('#content-text');
    const authorEl = node.querySelector('#author-text');
    if (!textEl || !authorEl) continue;
    const nodeText = normalise(textEl.innerText).slice(0, 80);
    const nodeAuthor = normalise(authorEl.innerText);
    if (nodeAuthor === authorNeedle && nodeText === needle) return node;
  }
  return null;
}

function highlightNode(node) {
  node.style.transition = 'background-color 0.3s ease';
  node.style.backgroundColor = 'rgba(255, 255, 255, 0.12)';
  setTimeout(() => { node.style.backgroundColor = ''; }, 1800);
}

/**
 * Scrolls the YouTube page to the DOM node matching the given API comment.
 * If the comment isn't rendered yet, scrolls to the comments section to
 * trigger YouTube's lazy-loading, then polls until the node appears.
 * @param {{ text: string, author: string }} comment
 */
export function scrollToCommentInDOM(comment) {
  // 1. Already in DOM — scroll immediately
  const node = findCommentNode(comment);
  if (node) {
    node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    highlightNode(node);
    return;
  }

  // 2. Scroll to the comments section first to wake up YouTube's lazy loader
  const section = document.querySelector(COMMENTS_SECTION);
  if (section) {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  let interval = null;
  let prevScrollY = window.scrollY;
  let attempts = 0;

  function stop() {
    clearInterval(interval);
    interval = null;
  }

  // 3. Each tick: scroll to bottom of last rendered comment to nudge YouTube's
  //    virtual scroller, then check if the target node has appeared.
  //    Abort if the user scrolled UP (scrollY dropped by >50px since last tick).
  interval = setInterval(() => {
    const currentScrollY = window.scrollY;
    if (currentScrollY < prevScrollY - 50) {
      stop();
      return;
    }
    prevScrollY = currentScrollY;

    const allNodes = document.querySelectorAll(COMMENT_SELECTOR);
    if (allNodes.length > 0) {
      allNodes[allNodes.length - 1].scrollIntoView({ behavior: 'smooth', block: 'end' });
    }

    const found = findCommentNode(comment);
    if (found) {
      stop();
      setTimeout(() => {
        found.scrollIntoView({ behavior: 'smooth', block: 'center' });
        highlightNode(found);
      }, 600);
      return;
    }

    if (++attempts >= 25) stop();
  }, 800);
}

