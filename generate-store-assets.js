/**
 * generate-store-assets.js
 * Uses Puppeteer to render HTML templates and export PNGs for the Edge Add-on store.
 *
 * Usage: node generate-store-assets.js
 * Output: store-assets/
 */

import puppeteer from 'puppeteer';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'store-assets');

await mkdir(OUT, { recursive: true });

// ── Shared design tokens ───────────────────────────────────────────────
const RED   = '#e00000';
const DARK  = '#0d1117';
const CARD  = '#161b22';
const TEXT  = '#f0f6fc';
const MUTED = '#8b949e';
const BORDER = '#30363d';

// ── Inline SVG icon (same as public/icons/icon.svg) ───────────────────
const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <rect width="128" height="128" rx="22" ry="22" fill="#FF0000"/>
  <circle cx="54" cy="52" r="22" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round"/>
  <line x1="70" y1="68" x2="90" y2="88" stroke="#fff" stroke-width="9" stroke-linecap="round"/>
  <line x1="44" y1="47" x2="64" y2="47" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity="0.7"/>
  <line x1="44" y1="55" x2="60" y2="55" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity="0.7"/>
</svg>`;
const ICON_DATA = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(ICON_SVG)}`;

// ── Helpers ────────────────────────────────────────────────────────────
async function snap(page, width, height, filename, scaleFactor = 6, transparent = false) {
  await page.setViewport({ width, height, deviceScaleFactor: scaleFactor });
  const buf = await page.screenshot({ type: 'png', omitBackground: transparent, clip: { x: 0, y: 0, width, height } });
  const out = path.join(OUT, filename);
  await writeFile(out, buf);
  console.log(`✓ ${filename}`);
}

// ── HTML templates ─────────────────────────────────────────────────────
function logoHtml(size = 1024) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{width:${size}px;height:${size}px;background:transparent;display:flex;align-items:center;justify-content:center;}
    img{width:${Math.round(size*0.72)}px;height:${Math.round(size*0.72)}px;border-radius:${Math.round(size*0.16)}px;box-shadow:0 16px 64px rgba(224,0,0,0.45);}
  </style></head><body>
  <img src="${ICON_DATA}" alt="logo"/>
  </body></html>`;
}

function promoHtml(width, height) {
  const large = width >= 1000;
  const iconSize = large ? 100 : 70;
  const titleSize = large ? '3rem' : '2rem';
  const tagSize = large ? '1.2rem' : '0.95rem';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{
      width:${width}px;height:${height}px;
      background:${DARK};
      display:flex;align-items:center;justify-content:center;
      font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
      overflow:hidden;position:relative;
    }
    .glow{
      position:absolute;inset:0;
      background:radial-gradient(ellipse at 50% 50%,rgba(224,0,0,0.18) 0%,transparent 70%);
    }
    .content{
      position:relative;z-index:1;
      display:flex;align-items:center;gap:${large ? 48 : 28}px;
      padding:${large ? 60 : 36}px;
    }
    img{width:${iconSize}px;height:${iconSize}px;border-radius:${Math.round(iconSize*0.2)}px;flex-shrink:0;box-shadow:0 8px 32px rgba(224,0,0,0.4);}
    .text{}
    h1{font-size:${titleSize};font-weight:800;color:${TEXT};letter-spacing:-0.03em;line-height:1.1;margin-bottom:${large?14:8}px;}
    h1 span{color:#ff4444;}
    p{font-size:${tagSize};color:${MUTED};max-width:${large?600:300}px;line-height:1.5;}
    .badge{
      display:inline-flex;align-items:center;gap:6px;
      margin-top:${large?20:12}px;padding:8px 18px;
      background:${RED};color:#fff;border-radius:6px;
      font-size:${large?'0.9rem':'0.8rem'};font-weight:600;
    }
  </style></head><body>
  <div class="glow"></div>
  <div class="content">
    <img src="${ICON_DATA}" alt="icon"/>
    <div class="text">
      <h1><span>YouTube</span> Comment Search</h1>
      <p>Search comments by keyword or username, highlight matches, and jump straight to any comment — without endless scrolling.</p>
      <span class="badge">Microsoft Edge Extension</span>
    </div>
  </div>
  </body></html>`;
}

function screenshotHtml(width, height, scene) {
  const scale = width >= 1000 ? 1 : 0.72;
  // At small scale the panel is narrower — use a wider panel and smaller font to keep buttons on one line
  const panelW = width >= 1000 ? 440 : 520;

  if (scene === 1) {
    // Search results view
    const comments = [
      { author: 'Alex Johnson', text: 'This video is absolutely amazing, best explanation I have seen!', creator: false },
      { author: 'Maria Garcia', text: 'The tutorial really helped me understand the concepts clearly.', creator: false },
      { author: 'Channel Owner', text: 'Thanks for watching! Let me know if you have any questions.', creator: true },
      { author: 'TechFan99', text: 'I have been waiting for this video for months, great work!', creator: false },
      { author: 'CodeNewbie', text: 'Finally someone explained this in simple terms, thank you!', creator: false },
    ];
    const rows = comments.map(c => `
      <div style="padding:10px 14px;border-bottom:1px solid ${BORDER};cursor:pointer;${c.creator ? `background:rgba(124,58,237,0.08);border-left:3px solid #7c3aed;` : ''}">
        <div style="font-size:0.75rem;color:${c.creator ? '#9d6cf3' : '#8b949e'};font-weight:600;margin-bottom:3px;">
          ${c.creator ? '★ ' : ''}${c.author}
        </div>
        <div style="font-size:0.85rem;color:#c9d1d9;line-height:1.4;">${c.text.replace('video', `<mark style="background:#e00000;color:#fff;border-radius:2px;padding:0 2px;">video</mark>`)}</div>
      </div>`).join('');

    return `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{width:${width}px;height:${height}px;background:#1a1a1a;display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;}
      .panel{width:${Math.round(panelW*scale)}px;background:#1e1e1e;border-radius:12px;border:1px solid ${BORDER};box-shadow:0 24px 80px rgba(0,0,0,0.7);overflow:hidden;}
      .header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid ${BORDER};background:#161b22;}
      .brand{display:flex;align-items:center;gap:8px;font-weight:700;color:#f0f6fc;font-size:0.9rem;}
      .brand img{width:20px;height:20px;border-radius:4px;}
      .search-bar{display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid ${BORDER};background:#161b22;}
      .search-input{flex:1;background:#0d1117;border:1px solid ${BORDER};border-radius:6px;padding:7px 10px;color:#f0f6fc;font-size:0.85rem;}
      .match-badge{background:#e00000;color:#fff;border-radius:4px;padding:2px 8px;font-size:0.75rem;font-weight:600;white-space:nowrap;}
      .filter-bar{display:flex;align-items:center;justify-content:space-between;padding:8px 80px 8px 14px;border-bottom:1px solid ${BORDER};gap:8px;}
      .count{font-size:0.72rem;color:#8b949e;flex-shrink:0;}
      .filters{display:flex;gap:5px;flex-shrink:0;}
      .btn-f{padding:4px 10px;border-radius:6px;border:1px solid ${BORDER};background:transparent;color:#8b949e;font-size:0.72rem;cursor:pointer;white-space:nowrap;}
      .btn-active{background:#e00000;color:#fff;border-color:#e00000;}
      .btn-ai{background:linear-gradient(135deg,#7c3aed,#9d6cf3);color:#fff;border:none;}
      .results{max-height:${Math.round(280*scale)}px;overflow:hidden;}
    </style></head><body>
    <div class="panel">
      <div class="header">
        <div class="brand">
          <img src="${ICON_DATA}" alt="icon"/>
          Comment Search
        </div>
        <span style="color:#8b949e;font-size:0.8rem;cursor:pointer;">✕</span>
      </div>
      <div class="search-bar">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b949e" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <div class="search-input">video</div>
        <span class="match-badge">5 matches</span>
      </div>
      <div class="filter-bar">
        <span class="count">20 comments indexed</span>
        <div class="filters">
          <span class="btn-f btn-active">All</span>
          <span class="btn-f">★ Creator</span>
          <span class="btn-f btn-ai">✦ Top Comments</span>
        </div>
      </div>
      <div class="results">${rows}</div>
    </div>
    </body></html>`;
  }

  // Scene 2 — Top Comments panel
  const bullets = [
    'The tutorial really helped understand the concepts clearly and concisely.',
    'Finally someone explained this in simple, beginner-friendly terms.',
    'Best explanation I have seen on this topic — highly recommended.',
    'Thanks for making this content free and accessible to everyone.',
    'This has been the most helpful video in this entire series so far.',
    'The examples made it so easy to follow along and understand.',
    'I came back just to say this video changed how I think about this.',
  ];
  const items = bullets.map(b => `
    <div style="display:flex;gap:10px;padding:9px 14px;border-bottom:1px solid ${BORDER};font-size:0.82rem;color:#c9d1d9;line-height:1.4;">
      <span style="color:#9d6cf3;flex-shrink:0;font-weight:700;">✦</span>${b}
    </div>`).join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{width:${width}px;height:${height}px;background:#1a1a1a;display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;}
    .panel{width:${Math.round(780*scale)}px;background:#1e1e1e;border-radius:12px;border:1px solid ${BORDER};box-shadow:0 24px 80px rgba(0,0,0,0.7);overflow:hidden;}
    .header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid ${BORDER};background:#161b22;}
    .brand{display:flex;align-items:center;gap:8px;font-weight:700;color:#f0f6fc;font-size:0.9rem;}
    .brand img{width:20px;height:20px;border-radius:4px;}
    .ai-header{padding:10px 14px;background:linear-gradient(135deg,rgba(124,58,237,0.15),rgba(157,108,243,0.08));border-bottom:1px solid ${BORDER};display:flex;align-items:center;justify-content:space-between;}
    .ai-title{font-size:0.85rem;font-weight:700;color:#9d6cf3;}
    .ai-sub{font-size:0.75rem;color:#8b949e;margin-top:2px;}
    .results{max-height:${Math.round(340*scale)}px;overflow:hidden;}
  </style></head><body>
  <div class="panel">
    <div class="header">
      <div class="brand">
        <img src="${ICON_DATA}" alt="icon"/>
        Comment Search
      </div>
      <span style="color:#8b949e;font-size:0.8rem;cursor:pointer;">✕</span>
    </div>
    <div class="ai-header">
      <div>
        <div class="ai-title">✦ Top Comments</div>
        <div class="ai-sub">Most representative comments from this video</div>
      </div>
      <span style="color:#9d6cf3;font-size:0.8rem;cursor:pointer;">✕</span>
    </div>
    <div class="results">${items}</div>
  </div>
  </body></html>`;
}

// ── Main ───────────────────────────────────────────────────────────────
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();

// 1. Logo 1024×1024
await page.setContent(logoHtml(1024), { waitUntil: 'domcontentloaded' });
await snap(page, 1024, 1024, 'logo-1024x1024.png', 6, true);

// 2. Small promotional tile 440×280 (exact pixels required by store)
await page.setContent(promoHtml(440, 280), { waitUntil: 'domcontentloaded' });
await snap(page, 440, 280, 'promo-small-440x280.png', 1);

// 3. Large promotional tile 1400×560 (exact pixels required by store)
await page.setContent(promoHtml(1400, 560), { waitUntil: 'domcontentloaded' });
await snap(page, 1400, 560, 'promo-large-1400x560.png', 1);

// 4. Screenshot 1 — search results (1280×800)
await page.setContent(screenshotHtml(1280, 800, 1), { waitUntil: 'domcontentloaded' });
await snap(page, 1280, 800, 'screenshot-1-1280x800.png');

// 5. Screenshot 2 — Top Comments panel (1280×800)
await page.setContent(screenshotHtml(1280, 800, 2), { waitUntil: 'domcontentloaded' });
await snap(page, 1280, 800, 'screenshot-2-1280x800.png');

// 6. Screenshot 1 — small 640×400 (used in docs/)
await page.setContent(screenshotHtml(640, 400, 1), { waitUntil: 'domcontentloaded' });
await snap(page, 640, 400, 'screenshot-1.png');

// 7. Screenshot 2 — small 640×400 (used in docs/)
await page.setContent(screenshotHtml(640, 400, 2), { waitUntil: 'domcontentloaded' });
await snap(page, 640, 400, 'screenshot-2.png');

await browser.close();
console.log('\nAll assets saved to store-assets/');
