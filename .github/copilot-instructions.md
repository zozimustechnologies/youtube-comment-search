# Copilot instructions for youtube-comment-search

Manifest V3 browser extension (Chrome/Edge) that adds in-page comment search, filtering, and AI summarization to YouTube.

## Build & run

```bash
npm run dev          # Watches both builds (popup/background + content IIFE)
npm run build        # Production build → dist/
```

Build a single target:

```bash
npx vite build                                    # popup + background
npx vite build --config vite.content.config.js    # content script (IIFE)
```

**Load for testing:** after building, use Chrome/Edge → Extensions → Developer mode → Load unpacked → point to the **repo root** (manifest.json references `dist/*`).

No test or lint scripts exist.

## Architecture

| Layer | Entry point | Notes |
|-------|------------|-------|
| Background service worker | `src/background/index.js` | Handles keyboard commands, relays messages between popup ↔ content |
| Popup UI | `src/popup/*` | Small React app shown from toolbar icon |
| Content script (injected panel) | `src/content/index.js` | Built as **IIFE** via `vite.content.config.js` — cannot use ES module imports at runtime |
| React components | `src/components/*` | SearchPanel, SearchBar, FilterBar, ResultsList, SummaryPanel |
| Utilities | `src/utils/*` | Comment scraping, DOM observation, highlighting, AI summarization |

**Runtime flow:**
1. User presses Ctrl+Shift+F (or toolbar button) → background sends `TOGGLE_SEARCH` to active YouTube tab.
2. Content script mounts a React panel above the comments section.
3. `commentScraper.js` scrapes comments from the DOM; `domObserver.js` watches for lazily-loaded comments via MutationObserver (debounced 400 ms).
4. On SPA navigation (detected via `<title>` mutations), the panel is torn down and re-created for the new video.
5. `aiSummarizer.js` optionally uses the browser's built-in Summarizer API (Gemini Nano, on-device) for comment summaries — no API keys needed.

## Key conventions

- **Two Vite configs:** `vite.config.js` (popup + background, ES modules) and `vite.content.config.js` (content script, IIFE). The content build sets `emptyOutDir: false` so it doesn't wipe the popup build.
- **Path alias:** `@` → `src/` (configured in vite.config.js resolve.alias).
- **Manifest paths are fixed:** all compiled assets live under `dist/`. Don't rename output paths without updating both Vite configs and `manifest.json`.
- **YouTube DOM selectors** (single source of truth in `src/utils/commentScraper.js`):
  - Comments: `ytd-comment-view-model, ytd-comment-renderer`
  - Text: `#content-text` | Author: `#author-text`
  - Creator badge: `ytd-author-comment-badge-renderer` or `#creator-heart-button`
- **Debounce (400 ms)** on MutationObserver callbacks — preserve this when modifying observation logic.
- **Content script constraints:** because it runs as IIFE in the page context, it cannot dynamically import chunks. All dependencies (including React) are bundled into the single `dist/content/index.js`.
- **Messaging protocol:** communication uses `chrome.runtime.sendMessage` / `onMessage` with a `{ type: string }` message shape (e.g., `TOGGLE_SEARCH`, `GET_TAB_INFO`).
- **AI Summarizer:** the cached `Summarizer` instance in `aiSummarizer.js` must be destroyed on navigation cleanup. Caps input at 200 comments to stay within context window limits.
