# Copilot instructions for youtube-comment-search

Purpose: Help future Copilot sessions understand how to build, run, and reason about this repository (Microsoft Edge / Chrome extension that adds an in-page comment search UI for YouTube).

---

## Build / run / preview
- Start development watchers (rebuilds both extension UI and content bundles):
  npm run dev
  - This runs two Vite build watchers (default build and the content build via vite.content.config.js). Keep this running while testing in the browser.

- Build production artifacts (outputs to dist/):
  npm run build

- Preview the built bundle locally:
  npm run preview
  - Serves the built files; manifest.json at repo root references files under dist/.

- Build a single target:
  - UI / background (default Vite config):
    npx vite build
  - Content bundle (content-specific Vite config):
    npx vite build --config vite.content.config.js

- Loading the extension for testing:
  1. Run `npm run dev` (or `npm run build`).
  2. In Chrome/Edge, open Extensions -> Developer mode -> Load unpacked and point to the repository root (manifest.json at repo root references dist/* assets).

- Tests / linting:
  - There are no test or lint scripts present in package.json. No single-test command available.

---

## High-level architecture
- Manifest V3 extension (manifest.json at repo root). Key pieces:
  - Background service worker: src/background/index.js — handles command shortcuts and message relays between popup and content scripts.
  - Popup UI: src/popup/* — small React app shown when the user clicks the extension icon.
  - Injected content UI (search panel): built by the content Vite config and injected as a content script (manifest references dist/content/index.js and dist/content/panel.css).
  - React components: src/components/* contain the panel, search bar, filters, and results list used by the injected UI.
  - Utilities: src/utils/* contains the comment scraping, DOM observation, highlighting and scroll helpers.

- Runtime behavior overview:
  - When the search panel is toggled (keyboard command or popup), the content script mounts a React panel into the YouTube page.
  - Comments are scraped from YouTube's DOM (utils/commentScraper.js) and kept in-memory for fast filtering.
  - A MutationObserver (utils/domObserver.js) watches for new comments and SPA navigations; scraping is debounced to avoid excessive updates.
  - Selecting a result scrolls the page to the original comment element (scroll + brief highlight).

---

## Key conventions & patterns (project-specific)
- Build outputs and manifest paths:
  - The manifest expects compiled assets under dist/. Do not change the manifest paths without updating the build output or vite configs.
  - There are two Vite configs in use: the default Vite build and a content-specific Vite config (vite.content.config.js). Use the appropriate config when building one part only.

- Comment scraping selectors & creator detection:
  - Primary selector: `ytd-comment-view-model, ytd-comment-renderer` (see src/utils/commentScraper.js).
  - Comment text selector: `#content-text`; author: `#author-text`.
  - Creator detection uses `ytd-author-comment-badge-renderer` or `#creator-heart-button`. If YouTube changes its DOM, update these selectors here — this is the single source of truth for scraping.

- Observation & debouncing:
  - observeComments polls for `ytd-comments#comments` and attaches a MutationObserver; callback calls are debounced (400ms) to avoid re-render storms. Keep that debounce when changing observation logic.

- SPA navigation handling:
  - observeNavigation watches title updates to detect client-side navigation to new videos and triggers a re-scrape when the user navigates within YouTube.

- Keyboard/commands:
  - Manifest command `toggle-search` (Ctrl+Shift+F / Cmd+Shift+F) is implemented in src/background/index.js and relays TOGGLE_SEARCH messages to the active YouTube tab.

- Minimal runtime assumptions:
  - Code assumes YouTube uses the DOM structure referenced above and that comments are lazily loaded. Be conservative when changing scraping or scrolling logic.

---

## Where to look first when making changes
- UI changes: src/components/* and src/popup/*
- Comment extraction / resilience to DOM changes: src/utils/commentScraper.js and src/utils/domObserver.js
- Background messaging & commands: src/background/index.js
- Build behavior: vite.config.js and vite.content.config.js

---

## README integration
- The repository README contains a short one-line description of the project. This file augments it with build and architecture notes Copilot will need to make accurate edits or generate code.

---

If you want this file adjusted (more detail, add examples, or cover other files), say which areas to expand.

## User instructions:
** THERE SHOULD NOT BE ANY TRACE OF GOOGLE OR GOOGLE CHROME.
** there should not be any trace of installing the extension manually, as we will be uploading this to the Edge Add-on Store
** DO NOT ASSUME EMAILS, WEBSITES, OR ANY CONTACT INFORMATION

Brand Colors :  linear-gradient(135deg, #3d7ea6 0%, #1a4a6e 100%);
Donate button = Red and links to wise link - https://wise.com/pay/business/sandeepchadda?utm_source=open_link
Zozimus Technologies Copyright : https://zozimustechnologies.github.io/ The text that should show is: `&copy Zozimus Technologies. All rights reserved.`
Issue Page: https://github.com/[repo-name]/issues/
Buttons: Rounded, blue theme (Brand Color)
Brand Email: zozimustechnologies@outlook.com (DO NOT ASSUME EMAILS, OR ANY CONTACT INFORMATION)


