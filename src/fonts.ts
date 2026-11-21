// Vazirmatn, self-hosted — woff2-only, arabic + latin subsets, weights 400/500/600.
//
// Why this module exists (perf audit P0-6): the stock fontsource CSS imports
// (`@fontsource/vazirmatn/400.css` etc.) emit 18 files — 3 weights × 3 subsets
// × (woff2 + woff) = 332,396 B — of which 218,972 B (all .woff + latin-ext)
// are never downloaded by any modern browser. Even the per-subset CSS files
// (e.g. `arabic-400.css`) still reference BOTH woff2 and woff in their `src`,
// so they cannot drop the legacy format. Importing the woff2 files directly
// with `?url` emits exactly the 6 files below (113,424 B total) and nothing
// else. The package's `exports` map explicitly allows `./files/*.woff2`.
//
// Vite emits the font files with content hashes, so a static
// `<link rel="preload">` in index.html cannot reference them — the preload
// links and the @font-face rules are injected here, from the build-resolved
// URLs, at entry time. Import this module at the top of main.tsx (with
// preload.ts) so the preloads fire before React renders.
//
// font-family stays "Vazirmatn" and the unicode-ranges are copied verbatim
// from the fontsource CSS (identical across weights), so all existing CSS
// keeps working unchanged. font-display: swap everywhere (no FOIT), same as
// before. Weights 700/900 are still NOT shipped (splash wordmark faux-bold
// is a known P2-7, out of scope here).

import arabic400Url from '@fontsource/vazirmatn/files/vazirmatn-arabic-400-normal.woff2?url';
import arabic500Url from '@fontsource/vazirmatn/files/vazirmatn-arabic-500-normal.woff2?url';
import arabic600Url from '@fontsource/vazirmatn/files/vazirmatn-arabic-600-normal.woff2?url';
import latin400Url from '@fontsource/vazirmatn/files/vazirmatn-latin-400-normal.woff2?url';
import latin500Url from '@fontsource/vazirmatn/files/vazirmatn-latin-500-normal.woff2?url';
import latin600Url from '@fontsource/vazirmatn/files/vazirmatn-latin-600-normal.woff2?url';

// unicode-ranges copied verbatim from @fontsource/vazirmatn/{400,500,600}.css.
const ARABIC_RANGE =
  'U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0897-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC,U+102E0-102FB,U+10E60-10E7E,U+10EC2-10EC4,U+10EFC-10EFF,U+1EE00-1EE03,U+1EE05-1EE1F,U+1EE21-1EE22,U+1EE24,U+1EE27,U+1EE29-1EE32,U+1EE34-1EE37,U+1EE39,U+1EE3B,U+1EE42,U+1EE47,U+1EE49,U+1EE4B,U+1EE4D-1EE4F,U+1EE51-1EE52,U+1EE54,U+1EE57,U+1EE59,U+1EE5B,U+1EE5D,U+1EE5F,U+1EE61-1EE62,U+1EE64,U+1EE67-1EE6A,U+1EE6C-1EE72,U+1EE74-1EE77,U+1EE79-1EE7C,U+1EE7E,U+1EE80-1EE89,U+1EE8B-1EE9B,U+1EEA1-1EEA3,U+1EEA5-1EEA9,U+1EEAB-1EEBB,U+1EEF0-1EEF1';
const LATIN_RANGE =
  'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';

const FACES: Array<{weight: 400 | 500 | 600; range: string; url: string}> = [
  {weight: 400, range: ARABIC_RANGE, url: arabic400Url},
  {weight: 500, range: ARABIC_RANGE, url: arabic500Url},
  {weight: 600, range: ARABIC_RANGE, url: arabic600Url},
  {weight: 400, range: LATIN_RANGE, url: latin400Url},
  {weight: 500, range: LATIN_RANGE, url: latin500Url},
  {weight: 600, range: LATIN_RANGE, url: latin600Url},
];

// Preload the two weights the splash wordmark + headings need first
// (arabic-400 + arabic-600 ≈ 43 KB). `crossorigin` is required: font fetches
// use anonymous CORS, and a preload without it would not match the @font-face
// fetch (the browser would download the font twice).
for (const url of [arabic400Url, arabic600Url]) {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'font';
  link.type = 'font/woff2';
  link.crossOrigin = 'anonymous';
  link.href = url;
  document.head.appendChild(link);
}

// Fallback face (font-swap reflow): while Vazirmatn downloads, Persian text
// renders in the device's system Arabic font. Two measured mismatches made
// the swap jump:
//  - Width: Noto Naskh Arabic (Android's default Arabic font) renders this
//    app's Persian text ~10% narrower than Vazirmatn — frequency-weighted
//    advance ratio 1.10 at weight 400, measured with fontTools over the
//    app's actual Persian strings (1.12 at 500; 1.08 against the Bold local
//    face / 1.13 against Regular at 600). size-adjust: 110% scales the
//    fallback up to match; it also halves the Persian-digit gap (Naskh
//    digits are 24% narrower than Vazirmatn's — 110% leaves ~11%). Noto
//    Sans Arabic needs almost no adjust (ratio ~0.99), but Naskh is the
//    default on Android, so the tuning targets Naskh. The other listed
//    fonts (Geeza Pro, Tahoma, Segoe UI) are unmeasured — 110% is an
//    approximation for them, but the vertical fix below still applies to
//    any of them (the overrides replace the font's own metrics entirely).
//  - Line box: Vazirmatn's line box is 156.25% of em (ascent 2100 +
//    descent 1100 over UPM 2048; hhea == typo metrics); Naskh's is 170.3%.
//    The overrides make the fallback's line box match Vazirmatn's exactly.
//  The overrides are DIVIDED by size-adjust: verified in headless Chromium
//  that size-adjust scales the metric overrides too — a 110% size-adjust
//  with raw 102.54%/53.71% overrides produced a 172px line box at 100px
//  font-size, while divided 93.22%/48.83% produced exactly 156px. Raw
//  overrides would leave the line box 10% too tall.
//  The html stack override below is un-layered, so it beats index.css's
//  `@layer base` html rule. Older browsers ignore the unknown descriptors
//  and degrade to today's plain-system-ui fallback.
const FALLBACK_SIZE_ADJUST = 110; // %
const FALLBACK_ASCENT_OVERRIDE = 93.22; // (2100 / 2048) / 1.10
const FALLBACK_DESCENT_OVERRIDE = 48.83; // (1100 / 2048) / 1.10
const FALLBACK_FACES = [400, 500, 600].map(
  (weight) =>
    `@font-face{font-family:'Vazirmatn Fallback';font-style:normal;font-weight:${weight};src:local('Noto Naskh Arabic'),local('Noto Sans Arabic'),local('Geeza Pro'),local('Tahoma'),local('Segoe UI');size-adjust:${FALLBACK_SIZE_ADJUST}%;ascent-override:${FALLBACK_ASCENT_OVERRIDE}%;descent-override:${FALLBACK_DESCENT_OVERRIDE}%;line-gap-override:0%;}`,
);

const style = document.createElement('style');
style.setAttribute('data-eyvan-fonts', '');
style.textContent = [
  ...FACES.map(
    ({weight, range, url}) =>
      `@font-face{font-family:'Vazirmatn';font-style:normal;font-display:swap;font-weight:${weight};src:url(${url}) format('woff2');unicode-range:${range};}`,
  ),
  ...FALLBACK_FACES,
  `html{font-family:'Vazirmatn','Vazirmatn Fallback',system-ui,-apple-system,sans-serif;}`,
].join('\n');
document.head.appendChild(style);
