# Branch Overview

## `main` — Stable Release
- Comments loaded via **DOM scraping** (`MutationObserver` + `querySelectorAll`)
- No YouTube Data API, no OAuth required
- No transcript tab
- Scroll-to-comment uses `window.scrollTo({ top: document.body.scrollHeight })` to trigger YouTube's virtual scroller

## `feature/commentindexall` — YouTube Data API
- Comments fetched via **YouTube Data API v3** (`commentThreads.list`) in the background service worker
- Full pagination — loads **all** comments, not just what's scrolled into view
- Each comment includes `likeCount`, `publishedAt`, `isReply` fields (not available via DOM)
- OAuth2 authentication via `launchWebAuthFlow`
- Auth token persisted in `chrome.storage.local` (55-min TTL) — survives extension reloads (fixes #17)
- Creator comments flagged via `videos.list` channel ID lookup

## `feature/transcript` — Transcript Tab
- Everything from `main` (DOM scraping, no API)
- Adds a **Transcript tab** alongside the Comments tab
- Fetches captions from `ytInitialPlayerResponse` (no extra permissions needed)
- Full transcript display with timestamp badges
- Live search filtering within transcript
- Click any cue to seek the video to that timestamp
- Graceful fallback when no captions are available

# Image of latest stable release (main):
<img width="967" height="601" alt="image" src="https://github.com/user-attachments/assets/addcab35-d49f-4b0e-ad45-5d893fb75f31" />
