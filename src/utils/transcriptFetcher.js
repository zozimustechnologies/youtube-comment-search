/**
 * utils/transcriptFetcher.js
 * Delegates transcript fetching to the background service worker
 * (content scripts cannot make cross-origin requests to googleapis.com).
 */

export function formatTime(seconds) {
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function seekTo(seconds) {
  try {
    const player = document.querySelector('#movie_player');
    if (player && typeof player.seekTo === 'function') {
      player.seekTo(seconds, true);
      player.playVideo?.();
    }
  } catch {}
}

/**
 * Ask the background to fetch + parse the transcript.
 * Returns { language: string|null, cues: Array<{start, text}> }
 */
export async function loadTranscript() {
  const videoId = new URL(window.location.href).searchParams.get('v');
  if (!videoId) return { language: null, cues: [] };

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'LOAD_TRANSCRIPT', videoId }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (response?.error) {
        reject(new Error(response.error));
      } else {
        resolve(response.data);
      }
    });
  });
}
