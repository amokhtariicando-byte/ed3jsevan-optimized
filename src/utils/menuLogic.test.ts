import test from 'node:test';
import assert from 'node:assert/strict';
import { MENU_CATEGORIES, MENU_ITEMS } from '../data/menuData';
import {
  calculateItemPrice,
  computeShortestWheelAngle,
  filterMenuItems,
  formatToman,
  getBackdropHex,
  getDefaultBean,
  getWheelSlotPosition,
  groupMenuForSimpleView,
  toPersianDigits,
} from './menuLogic';
import {
  easeInOutCubic,
  easeOutCubic,
  easeOutQuart,
  projectTableSeat,
} from './tableProjection';

test('menu contains all 67 items across 8 active categories and 3 upcoming sections with both top-down and front images', () => {
  const activeCategories = MENU_CATEGORIES.filter((c) => !c.comingSoon);
  const comingSoonCategories = MENU_CATEGORIES.filter((c) => c.comingSoon);

  assert.equal(activeCategories.length, 8);
  assert.equal(comingSoonCategories.length, 3);
  assert.deepEqual(
    comingSoonCategories.map((c) => c.id),
    ['breakfast', 'appetizers', 'main-course'],
  );
  assert.equal(MENU_ITEMS.length, 67);

  for (const item of MENU_ITEMS) {
    assert.ok(
      item.image.startsWith('src/assets/images/topdown_') &&
        item.image.endsWith('.webp'),
      `Missing optimized WebP overhead photo for ${item.id}`,
    );
    assert.ok(
      item.frontImage.startsWith('src/assets/images/eyvan_') &&
        item.frontImage.endsWith('.webp'),
      `Missing optimized WebP front glass photo for ${item.id}`,
    );
    assert.ok(
      item.cutoutImage.startsWith('src/assets/images/cutouts/') &&
        item.cutoutImage.endsWith('.webp'),
      `Missing transparent WebP cutout for ${item.id}`,
    );
  }

  // Tall-glass categories (mocktails, milkshakes, cold-drinks, iced-coffee) must set prefersFrontView
  const mocktails = MENU_ITEMS.filter((i) => i.categoryId === 'mocktails');
  assert.equal(mocktails.length, 8);
  assert.ok(mocktails.every((i) => i.prefersFrontView === true));

  const shakes = MENU_ITEMS.filter((i) => i.categoryId === 'milkshakes');
  assert.equal(shakes.length, 7);
  assert.ok(shakes.every((i) => i.prefersFrontView === true));
});

test('printed menu prices match exact figures without trailing zeros', () => {
  const byId = new Map(MENU_ITEMS.map((item) => [item.id, item]));

  assert.equal(byId.get('espresso')?.priceBlend50, 175);
  assert.equal(byId.get('espresso')?.priceArabica100, 236);
  assert.equal(byId.get('latte')?.priceBlend50, 255);
  assert.equal(byId.get('latte')?.priceArabica100, 316);
  assert.equal(byId.get('hot-mocha')?.priceBlend50, 320);
  assert.equal(byId.get('hot-mocha')?.priceArabica100, 381);

  assert.equal(byId.get('eyvan-iced-latte')?.priceBlend50, undefined);
  assert.equal(byId.get('eyvan-iced-latte')?.priceArabica100, 359);
  assert.equal(byId.get('iced-date-latte')?.priceArabica100, 359);

  assert.equal(byId.get('tea')?.price, 138);
  assert.equal(byId.get('tea-baklava')?.price, 175);
  assert.equal(byId.get('strawberry-matcha')?.price, 315);
  assert.equal(byId.get('pina-colada-milkshake')?.price, 445);
  assert.equal(byId.get('green-rush')?.price, 287);
});

test('Persian digit formatting and Toman pricing omit trailing zeros', () => {
  assert.equal(toPersianDigits(175), '۱۷۵');
  assert.equal(formatToman(316), '۳۱۶ تومان');
  assert.equal(formatToman(138), '۱۳۸ تومان');
});

test('bean selection and syrup surcharge calculate accurately', () => {
  const latte = MENU_ITEMS.find((i) => i.id === 'latte')!;
  assert.equal(getDefaultBean(latte), 'blend50');
  assert.equal(calculateItemPrice(latte, 'blend50', null), 255);
  assert.equal(calculateItemPrice(latte, 'arabica100', null), 316);
  assert.equal(calculateItemPrice(latte, 'arabica100', 'caramel'), 351);

  const eyvanIced = MENU_ITEMS.find((i) => i.id === 'eyvan-iced-latte')!;
  assert.equal(getDefaultBean(eyvanIced), 'arabica100');
  assert.equal(calculateItemPrice(eyvanIced, 'arabica100', 'vanilla'), 394);

  const tea = MENU_ITEMS.find((i) => i.id === 'tea')!;
  assert.equal(calculateItemPrice(tea, undefined, 'caramel'), 138);
});

test('Persian search normalizes Arabic yeh/kaf and searches across all categories', () => {
  const karakMatches = filterMenuItems(MENU_ITEMS, 'hot-coffee', 'چاي كرك');
  assert.equal(karakMatches.length, 1);
  assert.equal(karakMatches[0].id, 'karak-tea');

  const nutellaMatches = filterMenuItems(MENU_ITEMS, 'tea-herbal', 'نوتلا');
  assert.equal(nutellaMatches.length, 2);
});

test('simple menu grouping includes all 11 sections when browsing all and filters cleanly on search', () => {
  const allSections = groupMenuForSimpleView(
    MENU_CATEGORIES,
    MENU_ITEMS,
    'all',
    '',
  );
  assert.equal(allSections.length, 11);
  assert.equal(allSections.filter((s) => s.category.comingSoon).length, 3);

  const mocktailOnly = groupMenuForSimpleView(
    MENU_CATEGORIES,
    MENU_ITEMS,
    'mocktails',
    '',
  );
  assert.equal(mocktailOnly.length, 1);
  assert.equal(mocktailOnly[0].items.length, 8);

  const searched = groupMenuForSimpleView(
    MENU_CATEGORIES,
    MENU_ITEMS,
    'all',
    'موهیتو',
  );
  assert.equal(searched.length, 1);
  assert.equal(searched[0].category.id, 'mocktails');
  assert.equal(searched[0].items.length, 2);
});

test('rotary circular table computes shortest continuous rotation and uniform radial slots', () => {
  const a0 = computeShortestWheelAngle(32, 0, 10, 32);
  assert.equal(a0, 32);

  const a1 = computeShortestWheelAngle(a0, 1, 10, 32);
  assert.equal(a1, -4);

  const aPrev = computeShortestWheelAngle(a0, 9, 10, 32);
  assert.equal(aPrev, 68);

  const aWrap = computeShortestWheelAngle(aPrev, 0, 10, 32);
  assert.equal(aWrap, 32);

  const topSlot = getWheelSlotPosition(0, 8, 36);
  assert.ok(Math.abs(topSlot.xPct - 50) < 0.001);
  assert.ok(Math.abs(topSlot.yPct - 14) < 0.001);

  const rightSlot = getWheelSlotPosition(2, 8, 36);
  assert.ok(Math.abs(rightSlot.xPct - 86) < 0.001);
  assert.ok(Math.abs(rightSlot.yPct - 50) < 0.001);

  assert.ok(getBackdropHex('navy').startsWith('#'));
});

test('3D table projection locks front seat to exact coaster center with monotonic depth sorting and optical bokeh', () => {
  const base = {
    perspectivePx: 1400,
    tableCenterX: 460,
    tableCenterY: 560,
    ringRadiusPx: 300,
    tableScale: 0.92,
    pitchDeg: 72,
    wheelAngleDeg: 180,
  };

  // Slot 0 with wheelAngle 180deg sits dead-front (180deg = 6 o'clock)
  const front = projectTableSeat({ ...base, slotAngleDeg: 0 });
  // Adjacent seats at +45deg (left) and -45deg (right)
  const sideLeft = projectTableSeat({ ...base, slotAngleDeg: 45 });
  const sideRight = projectTableSeat({ ...base, slotAngleDeg: -45 });
  // Opposite rear seat at 180deg (12 o'clock)
  const back = projectTableSeat({ ...base, slotAngleDeg: 180 });

  assert.ok(Math.abs(front.screenX - base.tableCenterX) < 0.01);
  assert.ok(front.screenY > base.tableCenterY);
  assert.ok(front.perspScale > 1);

  // Symmetric flanking seats on left & right of marble rim
  assert.ok(Math.abs(sideLeft.screenY - sideRight.screenY) < 0.01);
  assert.ok(
    Math.abs(
      (base.tableCenterX - sideLeft.screenX) -
        (sideRight.screenX - base.tableCenterX),
    ) < 0.01,
  );
  // Strict painter's-order depth sorting: front > sides > back
  assert.ok(front.zIndex > sideLeft.zIndex);
  assert.ok(sideLeft.zIndex > back.zIndex);

  assert.equal(easeOutCubic(0), 0);
  assert.equal(easeOutCubic(1), 1);
  assert.ok(easeOutCubic(0.5) > 0.8);
  assert.equal(easeInOutCubic(0), 0);
  assert.equal(easeInOutCubic(0.5), 0.5);
  assert.equal(easeInOutCubic(1), 1);
  assert.equal(easeOutQuart(1), 1);
});

