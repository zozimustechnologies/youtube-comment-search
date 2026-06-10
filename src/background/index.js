/**
 * background/index.js
 * Manifest V3 service worker — relays messages between the popup and content scripts.
 */

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_TAB_INFO') {
    // Reply with current tab info
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      sendResponse({ tab: tabs[0] });
    });
    return true; // Keep the message channel open for async response
  }
});
