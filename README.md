# YouTube Comment Search

> A Microsoft Edge extension that brings instant, in-page comment search to YouTube.

**Website:** [zozimustechnologies.github.io/youtube-comment-search](https://zozimustechnologies.github.io/youtube-comment-search/)

---

## Features

- **Real-time search** — filter comments by keyword or username as you type
- **Author highlighting** — matched usernames are highlighted alongside comment text
- **Creator filter** — isolate replies from the video creator with one click
- **Top Comments** — surfaces the most representative comments using TF-IDF analysis; click again to dismiss
- **Jump to comment** — click any result to scroll directly to it on the page
- **Keyboard shortcut** — toggle the panel with `Ctrl+Shift+F` (Windows/Linux) or `Cmd+Shift+F` (Mac)
- **Dark & light mode** — automatically follows YouTube's theme
- **SPA-aware** — re-indexes comments when you navigate to a new video without a full page reload

---

## Installation

Available on the **Microsoft Edge Add-on Store** — search for **YouTube Comment Search** or visit the store listing directly.

---

## Usage

1. Open any YouTube video.
2. Press `Ctrl+Shift+F` / `Cmd+Shift+F` **or** click the extension icon in the toolbar.
3. The search panel appears above the comments section.
4. Type a keyword or username — results filter instantly.
5. Click a result to scroll to that comment on the page.
6. Press `Esc` or click `✕` to close the panel.

---

## Keyboard Shortcuts

| Action | Windows / Linux | Mac |
|---|---|---|
| Toggle panel | `Ctrl+Shift+F` | `Cmd+Shift+F` |
| Close panel | `Esc` | `Esc` |

---

## Building from Source

```bash
# Install dependencies
npm install

# Build extension (outputs to dist/)
npm run build

# Watch mode for development
npm run dev
```

Load the extension in Edge: go to `edge://extensions`, enable **Developer mode**, click **Load unpacked**, and select the project root folder.

### Generate Store Assets

```bash
node generate-store-assets.js
```

Outputs 7 PNGs to `store-assets/` — logo, promotional tiles, and screenshots at all required sizes.

---

## Project Structure

```
src/
  background/   # Service worker (keyboard shortcut handler)
  components/   # React UI components
  content/      # Content script injected into YouTube
  styles/       # Panel CSS
  utils/        # Comment scraper, TF-IDF summariser, DOM observer
docs/           # GitHub Pages landing page
store-assets/   # Edge Add-on Store promotional images
```

---

## Privacy

All processing is 100% local. No data is sent to any external server. No analytics, no cookies, no accounts required.

**Permissions used:**
- `activeTab` — to detect which YouTube tab is active when the shortcut is pressed
- Host permission (`youtube.com`) — to inject the search panel into YouTube watch pages

---

## Reporting Issues

Found a bug or have a feature request? Open an issue on the [GitHub Issues page](https://github.com/zozimustechnologies/youtube-comment-search/issues/).

---

## Contact

For enquiries, reach out at [zozimustechnologies@outlook.com](mailto:zozimustechnologies@outlook.com).

---

&copy; [Zozimus Technologies](https://zozimustechnologies.github.io/). All rights reserved.
