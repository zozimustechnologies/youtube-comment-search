/**
 * background/index.js
 * Manifest V3 service worker — relays messages between the popup and content scripts.
 */

const SCOPE = 'https://www.googleapis.com/auth/youtube.force-ssl';
const YT_API = 'https://www.googleapis.com/youtube/v3';

/**
 * Returns a valid OAuth2 access token using chrome.identity.getAuthToken.
 * Chrome manages the token cache and refresh across service worker restarts —
 * the user is only prompted on first use or after explicit sign-out.
 *
 * @param {boolean} interactive — whether to show the consent screen if needed
 */
async function getToken(interactive = true) {
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

/**
 * Removes the cached token from Chrome's identity store (e.g. on sign-out).
 */
async function clearToken() {
  return new Promise((resolve) => {
    // First get the current token so we can remove it from Chrome's cache
    chrome.identity.getAuthToken({ interactive: false, scopes: [SCOPE] }, (token) => {
      if (token) {
        chrome.identity.removeCachedAuthToken({ token }, resolve);
      } else {
        resolve();
      }
    });
  });
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


