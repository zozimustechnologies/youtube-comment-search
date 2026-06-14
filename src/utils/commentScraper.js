/**
 * utils/commentScraper.js
 * Scrapes comment text from the YouTube DOM.
 * YouTube dynamically loads comments as you scroll,
 * so we re-scrape whenever the DOM changes.
 */

const COMMENT_SELECTOR = 'ytd-comment-view-model, ytd-comment-renderer';

/**
 * Extracts an array of comment objects from the current page DOM.
 * Each object contains:
 *   - id        {string}  — unique key (index-based fallback)
 *   - text      {string}  — plain comment text
 *   - author    {string}  — commenter display name
 *   - element   {Element} — reference to the DOM node for scrolling
 *   - isCreator {boolean} — whether the commenter is the video creator
 */
export function scrapeComments() {
  const nodes = document.querySelectorAll(COMMENT_SELECTOR);
  const comments = [];

  nodes.forEach((node, index) => {
    const textEl = node.querySelector('#content-text');
    const authorEl = node.querySelector('#author-text');
    const creatorBadge = node.querySelector('ytd-author-comment-badge-renderer, #creator-heart-button');

    const text = textEl ? textEl.innerText.trim() : '';
    const author = authorEl ? authorEl.innerText.trim() : 'Unknown';

    if (text) {
      comments.push({
        id: `comment-${index}`,
        text,
        author,
        element: node,
        isCreator: !!creatorBadge,
      });
    }
  });

  return comments;
}

/**
 * Smoothly scrolls the page to bring the given comment element into view.
 * Adds a brief visual highlight pulse after scrolling.
 * @param {Element} element — the comment DOM node to scroll to
 */
export function scrollToComment(element) {
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });

  element.style.transition = 'background-color 0.3s ease';
  element.style.backgroundColor = 'rgba(255, 0, 0, 0.15)';
  setTimeout(() => {
    element.style.backgroundColor = '';
  }, 1500);
}
