/**
 * background/index.js
 * Manifest V3 service worker — handles keyboard shortcut commands
 * and relays messages between the popup and content scripts.
 */

// Listen for the keyboard shortcut command defined in manifest.json
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-search') {
    // Send a message to the active YouTube tab to toggle the search panel
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab && tab.url && tab.url.includes('youtube.com/watch')) {
        chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_SEARCH' });
      }
    });
  }
});

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
