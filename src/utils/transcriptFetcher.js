/**
 * utils/transcriptFetcher.js
 * Fetches and parses the YouTube transcript for the current video.
 * Uses ytInitialPlayerResponse (already on the page) to get the caption track URL,
 * then fetches the timed-text XML and parses it into an array of cue objects.
 *
 * Returns: Array<{ start: number, dur: number, text: string }>
 */

/**
 * Get the video ID from the current URL.
 */
function getVideoId() {
  const url = new URL(window.location.href);
  return url.searchParams.get('v');
}

/**
 * Extract caption tracks from ytInitialPlayerResponse embedded in the page.
 */
function getCaptionTracks() {
  try {
    const ytData = window.ytInitialPlayerResponse;
    if (!ytData) return [];
    const tracks =
      ytData?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
    return tracks;
  } catch {
    return [];
  }
}

/**
 * Pick the best track: prefer English ('en'), then English auto-generated ('en.*'),
 * then the first available track.
 */
function pickBestTrack(tracks) {
  if (!tracks.length) return null;
  const en = tracks.find((t) => t.languageCode === 'en');
  if (en) return en;
  const enAuto = tracks.find((t) => t.languageCode?.startsWith('en'));
  if (enAuto) return enAuto;
  return tracks[0];
}

/**
 * Parse the timed-text XML response into cue objects.
 */
function parseXml(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');
  const textNodes = Array.from(doc.querySelectorAll('text'));
  return textNodes.map((node) => {
    const start = parseFloat(node.getAttribute('start') || '0');
    const dur = parseFloat(node.getAttribute('dur') || '0');
    // Decode HTML entities and strip tags
    const raw = node.textContent || '';
    const decoded = raw
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/<[^>]+>/g, '')
      .trim();
    return { start, dur, text: decoded };
  }).filter((c) => c.text.length > 0);
}

/**
 * Format seconds as MM:SS.
 */
export function formatTime(seconds) {
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

/**
 * Seek the YouTube player to a given time (seconds).
 */
export function seekTo(seconds) {
  try {
    const player = document.querySelector('#movie_player');
    if (player && typeof player.seekTo === 'function') {
      player.seekTo(seconds, true);
      player.playVideo?.();
    }
  } catch {
    // silently ignore
  }
}

/**
 * Main export: fetch and return transcript cues.
 * Returns null if no transcript is available.
 */
export async function fetchTranscript() {
  const tracks = getCaptionTracks();
  const track = pickBestTrack(tracks);
  if (!track) return null;

  // Build fetch URL — append &fmt=xml to ensure XML response
  let url = track.baseUrl;
  if (!url.includes('fmt=')) url += '&fmt=xml';

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const xml = await res.text();
    return parseXml(xml);
  } catch {
    return null;
  }
}

/**
 * Returns the language name of the selected track (or null).
 */
export function getTranscriptLanguage() {
  const tracks = getCaptionTracks();
  const track = pickBestTrack(tracks);
  return track?.name?.simpleText ?? track?.languageCode ?? null;
}

/**
 * Returns true if any caption track is available.
 */
export function hasTranscript() {
  return getCaptionTracks().length > 0;
}
