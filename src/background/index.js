/**
 * background/index.js
 * Manifest V3 service worker — relays messages between the popup and content scripts.
 */

const CLIENT_ID = '432892486848-bemngrqcm4ksjjop6lr8vorbgcfhjurf.apps.googleusercontent.com';
const SCOPE = 'https://www.googleapis.com/auth/youtube.force-ssl';
const YT_API = 'https://www.googleapis.com/youtube/v3';
const TOKEN_TTL_MS = 55 * 60 * 1000;

let _cachedToken = null;
let _tokenExpiry = 0;
let _pendingAuth = null;

async function getCachedToken() {
  if (_cachedToken && Date.now() < _tokenExpiry) return _cachedToken;
  try {
    const stored = await chrome.storage.local.get('ytAuthToken').catch(() => ({}));
    if (stored?.ytAuthToken?.token && Date.now() < stored.ytAuthToken.expiry) {
      _cachedToken = stored.ytAuthToken.token;
      _tokenExpiry = stored.ytAuthToken.expiry;
      return _cachedToken;
    }
  } catch {}
  return null;
}

async function fetchNewToken() {
  const redirectUrl = `https://${chrome.runtime.id}.chromiumapp.org/`;
  const authUrl =
    `https://accounts.google.com/o/oauth2/auth` +
    `?client_id=${encodeURIComponent(CLIENT_ID)}` +
    `&response_type=token` +
    `&redirect_uri=${encodeURIComponent(redirectUrl)}` +
    `&scope=${encodeURIComponent(SCOPE)}`;

  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, (redirected) => {
      if (chrome.runtime.lastError || !redirected) {
        reject(new Error(chrome.runtime.lastError?.message ?? 'Auth cancelled'));
        return;
      }
      const hash = redirected.split('#')[1] ?? '';
      const params = Object.fromEntries(new URLSearchParams(hash));
      if (params.access_token) {
        resolve(params.access_token);
      } else {
        reject(new Error('No access_token in redirect'));
      }
    });
  });
}

async function getToken() {
  const cached = await getCachedToken();
  if (cached) return cached;
  if (_pendingAuth) return _pendingAuth;

  _pendingAuth = fetchNewToken().then((token) => {
    _cachedToken = token;
    _tokenExpiry = Date.now() + TOKEN_TTL_MS;
    _pendingAuth = null;
    chrome.storage.local.set({ ytAuthToken: { token, expiry: _tokenExpiry } }).catch(() => {});
    return token;
  }).catch((err) => {
    _pendingAuth = null;
    throw err;
  });

  return _pendingAuth;
}

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_TAB_INFO') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      sendResponse({ tab: tabs[0] });
    });
    return true;
  }

  if (message.type === 'CLEAR_AUTH_TOKEN') {
    _cachedToken = null;
    _tokenExpiry = 0;
    _pendingAuth = null;
    chrome.storage.local.remove('ytAuthToken').catch(() => {});
    sendResponse({ ok: true });
    return true;
  }
});
