// Early preload for the default category's table images (perf audit P1-8 /
// workstream B): the hot-coffee plate topdowns are discovered only after JS
// parses menuData, so on a slow connection the table paints with late /
// popping plates. This module runs at entry time (imported FIRST in
// main.tsx, before React renders) and injects <link rel="preload"
// as="image"> for the default category's unique topdowns, so the browser
// starts fetching them while the entry chunk is still parsing.
//
// The URLs are the SAME relative strings menuData.ts uses
// ('src/assets/images/...', no leading slash). They resolve against the
// document URL exactly like the <img src> in RotaryTableStage does, so each
// preload matches its image fetch byte-for-byte and the browser reuses it
// instead of downloading twice. Never hardcode a subpath here: the preview
// serves under /ed3jsevan-optimized/ and production at the domain root —
// relative paths are correct in both, and stay correct if the deploy path
// ever differs from the build-time base.
//
// The list is derived from MENU_ITEMS (not hardcoded filenames) so the
// preload stays in sync when the default category's items change. The
// category id is a string literal on purpose: importing it from App would
// pull the whole App graph into this module and defeat the "early" part
// (ES modules evaluate imports depth-first). It MUST match App's initial
// activeCategoryId.
import {MENU_ITEMS} from './data/menuData';

const DEFAULT_CATEGORY_ID = 'hot-coffee';

const topdowns = Array.from(
  new Set(
    MENU_ITEMS.filter((item) => item.categoryId === DEFAULT_CATEGORY_ID).map(
      (item) => item.image,
    ),
  ),
);

for (const href of topdowns) {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = href;
  document.head.appendChild(link);
}
