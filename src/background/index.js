/**
 * background/index.js
 * Manifest V3 service worker — relays messages between the popup and content scripts.
 */

const CLIENT_ID = '432892486848-bemngrqcm4ksjjop6lr8vorbgcfhjurf.apps.googleusercontent.com';
const SCOPE = 'https://www.googleapis.com/auth/youtube.force-ssl';
const YT_API = 'https://www.googleapis.com/youtube/v3';
const TOKEN_TTL_MS = 55 * 60 * 1000;

// True on Chrome; false on Edge and other Chromium browsers that don't support getAuthToken.
const supportsGetAuthToken = typeof chrome.identity?.getAuthToken === 'function';

// ── Chrome path: chrome.identity.getAuthToken ────────────────────────────
// Chrome natively persists the token across service worker restarts (fixes Issue #17).

async function getTokenChrome(interactive = true) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive, scopes: [SCOPE] }, (token) => {
      if (chrome.runtime.lastError || !token) {
        reject(new Error(chrome.runtime.lastError?.message ?? 'Auth failed'));
        return;
      }
      resolve(token);
    });
  });
}

async function clearTokenChrome() {
  return new Promise((resolve) => {
    chrome.identity.getAuthToken({ interactive: false, scopes: [SCOPE] }, (token) => {
      if (token) {
        chrome.identity.removeCachedAuthToken({ token }, resolve);
      } else {
        resolve();
      }
    });
  });
}

// ── Fallback path: launchWebAuthFlow (Edge + other Chromium browsers) ─────
// Tokens are cached in chrome.storage.session (survives service worker idle restarts).

let _cachedToken = null;
let _tokenExpiry = 0;
let _pendingAuth = null;

async function getCachedToken() {
  if (_cachedToken && Date.now() < _tokenExpiry) return _cachedToken;
  try {
    if (chrome.storage?.session) {
      const stored = await chrome.storage.session.get('ytAuthToken').catch(() => ({}));
      if (stored?.ytAuthToken?.token && Date.now() < stored.ytAuthToken.expiry) {
        _cachedToken = stored.ytAuthToken.token;
        _tokenExpiry = stored.ytAuthToken.expiry;
        return _cachedToken;
      }
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

async function getTokenFallback() {
  const cached = await getCachedToken();
  if (cached) return cached;
  if (_pendingAuth) return _pendingAuth;

  _pendingAuth = fetchNewToken().then((token) => {
    _cachedToken = token;
    _tokenExpiry = Date.now() + TOKEN_TTL_MS;
    _pendingAuth = null;
    if (chrome.storage?.session) {
      chrome.storage.session.set({ ytAuthToken: { token, expiry: _tokenExpiry } }).catch(() => {});
    }
    return token;
  }).catch((err) => {
    _pendingAuth = null;
    throw err;
  });

  return _pendingAuth;
}

function clearTokenFallback() {
  _cachedToken = null;
  _tokenExpiry = 0;
  _pendingAuth = null;
  if (chrome.storage?.session) {
    chrome.storage.session.remove('ytAuthToken').catch(() => {});
  }
}

// ── Unified entry points ──────────────────────────────────────────────────

async function getToken(interactive = true) {
  return supportsGetAuthToken ? getTokenChrome(interactive) : getTokenFallback();
}

async function clearToken() {
  if (supportsGetAuthToken) return clearTokenChrome();
  clearTokenFallback();
}

async function loadCommentsInBackground(videoId) {
  const token = await getToken();

  // Fetch the video's channel ID so we can flag creator comments
  let channelId = null;
  const videoRes = await fetch(
    `${YT_API}/videos?part=snippet&id=${encodeURIComponent(videoId)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (videoRes.ok) {
    const videoData = await videoRes.json();
    channelId = videoData.items?.[0]?.snippet?.channelId ?? null;
  }

  const comments = [];
  let pageToken = undefined;

  do {
    const url = new URL(`${YT_API}/commentThreads`);
    url.searchParams.set('part', 'snippet,replies');
    url.searchParams.set('videoId', videoId);
    url.searchParams.set('maxResults', '100');
    url.searchParams.set('order', 'relevance');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message ?? `commentThreads.list failed (${res.status})`);
    }
    const data = await res.json();

    for (const item of data.items ?? []) {
      const s = item.snippet.topLevelComment.snippet;
      comments.push({
        id: item.id,
        text: s.textOriginal || s.textDisplay || '',
        author: s.authorDisplayName || 'Unknown',
        likeCount: s.likeCount || 0,
        publishedAt: s.publishedAt || null,
        isCreator: channelId ? s.authorChannelId?.value === channelId : false,
        isReply: false,
      });

      // Include up to 5 replies bundled in the thread response
      for (const reply of item.replies?.comments ?? []) {
        const rs = reply.snippet;
        comments.push({
          id: reply.id,
          text: rs.textOriginal || rs.textDisplay || '',
          author: rs.authorDisplayName || 'Unknown',
          likeCount: rs.likeCount || 0,
          publishedAt: rs.publishedAt || null,
          isCreator: channelId ? rs.authorChannelId?.value === channelId : false,
          isReply: true,
        });
      }
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  return comments;
}

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_TAB_INFO') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      sendResponse({ tab: tabs[0] });
    });
    return true;
  }

  if (message.type === 'LOAD_COMMENTS') {
    loadCommentsInBackground(message.videoId)
      .then((data) => sendResponse({ data }))
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }

  if (message.type === 'CLEAR_AUTH_TOKEN') {
    clearToken().then(() => sendResponse({ ok: true }));
    return true;
  }
});


