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
    if (chrome.storage?.session) {
      const stored = await chrome.storage.local.get('ytAuthToken').catch(() => ({}));
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

async function getToken() {
  const cached = await getCachedToken();
  if (cached) return cached;
  if (_pendingAuth) return _pendingAuth;

  _pendingAuth = fetchNewToken().then((token) => {
    _cachedToken = token;
    _tokenExpiry = Date.now() + TOKEN_TTL_MS;
    _pendingAuth = null;
    if (chrome.storage?.session) {
      chrome.storage.local.set({ ytAuthToken: { token, expiry: _tokenExpiry } }).catch(() => {});
    }
    return token;
  }).catch((err) => {
    _pendingAuth = null;
    throw err;
  });

  return _pendingAuth;
}

function pickBestTrack(items) {
  if (!items.length) return null;
  return (
    items.find((t) => t.snippet.language === 'en' && t.snippet.trackKind === 'standard') ||
    items.find((t) => t.snippet.language === 'en') ||
    items.find((t) => t.snippet.language?.startsWith('en')) ||
    items[0]
  );
}

function parseSrtTime(t) {
  const [hms, ms] = t.split(',');
  const [h, m, s] = hms.split(':').map(Number);
  return h * 3600 + m * 60 + s + (Number(ms) || 0) / 1000;
}

function parseSrt(srt) {
  const cues = [];
  const blocks = srt.trim().split(/\n\s*\n/);
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 2) continue;
    const tcLine = lines.find((l) => l.includes('-->'));
    if (!tcLine) continue;
    const [startStr] = tcLine.split('-->');
    const start = parseSrtTime(startStr.trim());
    const text = lines
      .slice(lines.indexOf(tcLine) + 1)
      .join(' ')
      .replace(/<[^>]+>/g, '')
      .trim();
    if (text) cues.push({ start, text });
  }
  return cues;
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

async function loadTranscriptInBackground(videoId) {
  const token = await getToken();

  const listRes = await fetch(
    `${YT_API}/captions?part=snippet&videoId=${encodeURIComponent(videoId)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!listRes.ok) {
    const err = await listRes.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `captions.list failed (${listRes.status})`);
  }
  const listData = await listRes.json();
  const track = pickBestTrack(listData.items ?? []);
  if (!track) return { language: null, cues: [] };

  const language = track.snippet?.language ?? null;

  const dlRes = await fetch(
    `${YT_API}/captions/${encodeURIComponent(track.id)}?tfmt=srt`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!dlRes.ok) throw new Error(`captions.download failed (${dlRes.status})`);
  const srt = await dlRes.text();
  return { language, cues: parseSrt(srt) };
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

  if (message.type === 'LOAD_TRANSCRIPT') {
    loadTranscriptInBackground(message.videoId)
      .then((data) => sendResponse({ data }))
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }

  if (message.type === 'CLEAR_AUTH_TOKEN') {
    _cachedToken = null;
    _tokenExpiry = 0;
    _pendingAuth = null;
    if (chrome.storage?.session) {
      chrome.storage.local.remove('ytAuthToken').catch(() => {});
    }
    sendResponse({ ok: true });
    return true;
  }
});


