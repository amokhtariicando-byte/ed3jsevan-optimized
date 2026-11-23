export type CategoryId =
  | 'hot-coffee'
  | 'hot-drinks'
  | 'iced-coffee'
  | 'tea-herbal'
  | 'cold-drinks'
  | 'matcha-bar'
  | 'milkshakes'
  | 'mocktails'
  | 'breakfast'
  | 'appetizers'
  | 'main-course';

export type BeanType = 'blend50' | 'arabica100';

export type BackdropTone =
  | 'navy'
  | 'midnight'
  | 'olive'
  | 'bronze'
  | 'plum';

export interface MenuCategory {
  id: CategoryId;
  name: string;
  shortName: string;
  subtitle: string;
  comingSoon?: boolean;
  comingSoonDescription?: string;
  defaultTone: BackdropTone;
  isHotCategory?: boolean;
}

export interface MenuItem {
  id: string;
  categoryId: CategoryId;
  name: string;
  description: string;
  /** Price in Toman without trailing zeros (e.g. 175 => ۱۷۵ تومان) */
  priceBlend50?: number;
  /** 100% Arabica price in Toman without trailing zeros */
  priceArabica100?: number;
  /** Single fixed price for non-bean items in Toman without trailing zeros */
  price?: number;
  /** Allow syrup customization (Hot Bar + Coffee items) */
  supportsSyrup?: boolean;
  /** Allow milk temperature preference note */
  supportsMilkTemp?: boolean;
  /** Highlight label (rendered as quiet text, never a pill) */
  highlight?: string;
  /** Subtle hot steam visual accent on the rotating table */
  isHot?: boolean;
  /** Local strictly 90-degree overhead studio photo for rotary tabletop */
  image: string;
  /** Local eye-level / front glass studio photo for Simple Menu & Detail Drawer */
  frontImage: string;
  /** Local transparent background-free PNG cutout for 3D eye-level turntable standing view */
  cutoutImage: string;
  /** Vessel proportion on the 3D marble table: tall glass vs ceramic/tea cup */
  vesselType: 'tall' | 'cup';
  /** Tall-glass drinks (mocktails, milkshakes, cold drinks, iced coffees, iced matcha) highlight the forward camera tilt */
  prefersFrontView?: boolean;
  /** Subtle orientation angle (deg) so every plate around the table feels organically placed */
  plateAngle?: number;
  /** Subtle atmospheric dark room tint derived strictly from Eyvan's logo palette */
  backdropTone: BackdropTone;
}

export interface SyrupOption {
  id: string;
  name: string;
  /** Additional price in Toman without trailing zeros */
  price: number;
}

export const SYRUP_OPTIONS: SyrupOption[] = [
  { id: 'caramel', name: 'کارامل', price: 35 },
  { id: 'vanilla', name: 'وانیل', price: 35 },
  { id: 'hazelnut', name: 'فندق', price: 35 },
  { id: 'irish', name: 'آیریش', price: 35 },
  { id: 'cinnamon', name: 'دارچین', price: 35 },
  { id: 'coconut', name: 'نارگیل', price: 35 },
  { id: 'chocolate', name: 'شکلات', price: 35 },
  { id: 'salted-caramel', name: 'کارامل نمکی', price: 35 },
];

export const CAFE_INFO = {
  brandName: 'ایوان',
  brandSubtitle: 'کافه و رستوران',
  tagline: 'فضای آرام، قهوه تخصصی با دو انتخاب دانه ۵۰/۵۰ و ۱۰۰٪ عربیکا، دمنوش‌های ایرانی و به‌زودی آشپزخانه کامل ایوان',
  instagramHandle: '@cafeeyvan_',
  instagramUrl:
    'https://www.instagram.com/cafeeyvan_?hvrq=MWRhczU0c3d6aWhiZw==',
  hours: 'همه‌روزه از ۹:۰۰ تا ۲۳:۳۰',
  milkTempNote:
    'دمای استاندارد شیر بین ۶۰ تا ۷۰ درجه می‌باشد، در صورت تمایل به دمای بالاتر به ویتر اطلاع دهید',
  paymentNote: 'پرداخت به‌صورت حضوری در صندوق انجام می‌شود',
  addressStatus:
    'نشانی دقیق و موقعیت نقشه پس از تایید شما در این بخش درج می‌شود',
  coordinatesLabel: 'موقعیت مکانی آماده اتصال به نقشه',
};

const IMG = {
  espresso: 'src/assets/images/topdown_espresso_1795167624349.webp',
  latteArt: 'src/assets/images/topdown_latte_art_1795167620493.webp',
  caramelMocha: 'src/assets/images/topdown_caramel_mocha_1795167620713.webp',
  pumpkinCarrot: 'src/assets/images/topdown_pumpkin_carrot_1795167621419.webp',
  hotChocolate: 'src/assets/images/topdown_hot_chocolate_1795167629999.webp',
  persianTea: 'src/assets/images/topdown_persian_tea_1795167621884.webp',
  icedEspresso: 'src/assets/images/topdown_iced_espresso_1795167621882.webp',
  icedLatte: 'src/assets/images/topdown_iced_latte_1795167620750.webp',
  affogato: 'src/assets/images/topdown_affogato_1795167621937.webp',
  matchaLatte: 'src/assets/images/topdown_matcha_latte_1795167625208.webp',
  strawberryMatcha:
    'src/assets/images/topdown_strawberry_spirulina_1795167625250.webp',
  persianCold: 'src/assets/images/topdown_persian_cold_1795167621048.webp',
  milkshake: 'src/assets/images/topdown_milkshake_1795167621330.webp',
  mocktail: 'src/assets/images/topdown_mocktail_1795167622682.webp',
  mojitoFlow: 'src/assets/images/topdown_mojito_flow.webp',
  brazilianLemonadeFlow: 'src/assets/images/topdown_brazilian_lemonade_flow.webp',
  rokatoFlow: 'src/assets/images/topdown_rokato_flow.webp',
  chocoShakeFlow: 'src/assets/images/topdown_chocolate_milkshake_flow.webp',
  redLoveFlow: 'src/assets/images/topdown_red-love_flow.webp',
} as const;

const FRONT_IMG = {
  espresso: 'src/assets/images/eyvan_espresso_shot_1795166293523.webp',
  latteArt: 'src/assets/images/eyvan_latte_art_1795166293026.webp',
  mochaChoco: 'src/assets/images/eyvan_mocha_choco_1795166292129.webp',
  pumpkinCarrot: 'src/assets/images/eyvan_pumpkin_carrot_latte_1795166292864.webp',
  masalaKarak: 'src/assets/images/eyvan_masala_karak_1795166298324.webp',
  persianTea: 'src/assets/images/eyvan_persian_tea_baklava_1795166292600.webp',
  herbalInfusion: 'src/assets/images/eyvan_herbal_infusion_1795166292777.webp',
  icedEspresso: 'src/assets/images/eyvan_iced_espresso_americano_1795166296324.webp',
  icedLatte: 'src/assets/images/eyvan_iced_latte_signature_1795166293974.webp',
  affogatoRedFizz: 'src/assets/images/eyvan_affogato_redfizz_1795166292795.webp',
  matchaLatte: 'src/assets/images/eyvan_matcha_latte_1795166293482.webp',
  strawberryMatcha: 'src/assets/images/eyvan_strawberry_matcha_1795166292435.webp',
  blueSpirulina: 'src/assets/images/eyvan_blue_spirulina_1795166292171.webp',
  persianCold: 'src/assets/images/eyvan_persian_cold_drinks_1795166292296.webp',
  chocoShake: 'src/assets/images/eyvan_chocolate_lotus_shake_1795166292561.webp',
  berryShake: 'src/assets/images/eyvan_berry_tropical_shake_1795166291573.webp',
  redMocktail: 'src/assets/images/eyvan_red_mocktail_1795166292393.webp',
  greenMocktail: 'src/assets/images/eyvan_green_mojito_mocktail_1795166292338.webp',
  mojitoFlow: 'src/assets/images/eyvan_mojito_flow.webp',
  brazilianLemonadeFlow: 'src/assets/images/eyvan_brazilian_lemonade_flow.webp',
  rokatoFlow: 'src/assets/images/eyvan_rokato_flow.webp',
  chocoShakeFlow: 'src/assets/images/eyvan_chocolate_milkshake_flow.webp',
  redLoveFlow: 'src/assets/images/eyvan_red-love_flow.webp',
} as const;

const CUTOUT_IMG = {
  redMocktail: 'src/assets/images/cutouts/red_mocktail.webp',
  greenMojito: 'src/assets/images/cutouts/green_mojito.webp',
  icedLatte: 'src/assets/images/cutouts/iced_latte.webp',
  icedEspresso: 'src/assets/images/cutouts/iced_espresso.webp',
  chocoShake: 'src/assets/images/cutouts/choco_shake.webp',
  berryShake: 'src/assets/images/cutouts/berry_shake.webp',
  matchaLatte: 'src/assets/images/cutouts/matcha_latte.webp',
  strawberryMatcha: 'src/assets/images/cutouts/strawberry_matcha.webp',
  blueSpirulina: 'src/assets/images/cutouts/blue_spirulina.webp',
  persianCold: 'src/assets/images/cutouts/persian_cold.webp',
  hotLatte: 'src/assets/images/cutouts/hot_latte.webp',
  hotEspresso: 'src/assets/images/cutouts/hot_espresso.webp',
  hotMocha: 'src/assets/images/cutouts/hot_mocha.webp',
  persianTea: 'src/assets/images/cutouts/persian_tea.webp',
  mojitoFlow: 'src/assets/images/cutouts/mojito_flow.webp',
  brazilianLemonadeFlow: 'src/assets/images/cutouts/brazilian_lemonade_flow.webp',
  rokatoFlow: 'src/assets/images/cutouts/rokato_flow.webp',
  chocoShakeFlow: 'src/assets/images/cutouts/chocolate_milkshake_flow.webp',
  redLoveFlow: 'src/assets/images/cutouts/red-love_flow.webp',
} as const;

const FRONT_TO_CUTOUT: Record<string, string> = {
  [FRONT_IMG.espresso]: CUTOUT_IMG.hotEspresso,
  [FRONT_IMG.latteArt]: CUTOUT_IMG.hotLatte,
  [FRONT_IMG.mochaChoco]: CUTOUT_IMG.hotMocha,
  [FRONT_IMG.pumpkinCarrot]: CUTOUT_IMG.hotLatte,
  [FRONT_IMG.masalaKarak]: CUTOUT_IMG.hotMocha,
  [FRONT_IMG.persianTea]: CUTOUT_IMG.persianTea,
  [FRONT_IMG.herbalInfusion]: CUTOUT_IMG.persianTea,
  [FRONT_IMG.icedEspresso]: CUTOUT_IMG.icedEspresso,
  [FRONT_IMG.icedLatte]: CUTOUT_IMG.icedLatte,
  [FRONT_IMG.affogatoRedFizz]: CUTOUT_IMG.icedEspresso,
  [FRONT_IMG.matchaLatte]: CUTOUT_IMG.matchaLatte,
  [FRONT_IMG.strawberryMatcha]: CUTOUT_IMG.strawberryMatcha,
  [FRONT_IMG.blueSpirulina]: CUTOUT_IMG.blueSpirulina,
  [FRONT_IMG.persianCold]: CUTOUT_IMG.persianCold,
  [FRONT_IMG.chocoShake]: CUTOUT_IMG.chocoShake,
  [FRONT_IMG.berryShake]: CUTOUT_IMG.berryShake,
  [FRONT_IMG.redMocktail]: CUTOUT_IMG.redMocktail,
  [FRONT_IMG.greenMocktail]: CUTOUT_IMG.greenMojito,
  [FRONT_IMG.mojitoFlow]: CUTOUT_IMG.mojitoFlow,
  [FRONT_IMG.brazilianLemonadeFlow]: CUTOUT_IMG.brazilianLemonadeFlow,
  [FRONT_IMG.rokatoFlow]: CUTOUT_IMG.rokatoFlow,
  [FRONT_IMG.chocoShakeFlow]: CUTOUT_IMG.chocoShakeFlow,
  [FRONT_IMG.redLoveFlow]: CUTOUT_IMG.redLoveFlow,
};

export const MENU_CATEGORIES: MenuCategory[] = [
  {
    id: 'hot-coffee',
    name: 'نوشیدنی‌های گرم بر پایه قهوه',
    shortName: 'قهوه گرم',
    subtitle: 'عصاره‌گیری دقیق با انتخاب دانه ۵۰٪/۵۰٪ یا ۱۰۰٪ عربیکا و امکان افزودن سیروپ',
    defaultTone: 'navy',
    isHotCategory: true,
  },
  {
    id: 'hot-drinks',
    name: 'نوشیدنی‌های گرم',
    shortName: 'نوشیدنی گرم',
    subtitle: 'نوشیدنی‌های شکلاتی، ادویه‌ای و کرمی دست‌ساز بار گرم ایوان',
    defaultTone: 'bronze',
    isHotCategory: true,
  },
  {
    id: 'iced-coffee',
    name: 'نوشیدنی‌های سرد بر پایه قهوه',
    shortName: 'قهوه سرد',
    subtitle: 'قهوه‌های سرد تخصصی، آیس لاته ایوان و آفوگاتو روی یخ کریستالی',
    defaultTone: 'midnight',
  },
  {
    id: 'tea-herbal',
    name: 'چای و دمنوش',
    shortName: 'چای و دمنوش',
    subtitle: 'چای اصیل ایرانی و دمنوش‌های گیاهی دست‌چین با عطر زعفران و گل',
    defaultTone: 'bronze',
    isHotCategory: true,
  },
  {
    id: 'cold-drinks',
    name: 'سردنوش و آیس‌تی',
    shortName: 'سردنوش',
    subtitle: 'عرقیات اصیل ایرانی و آیس‌تی‌های خنک و معطر با طراوت طبیعی',
    defaultTone: 'olive',
  },
  {
    id: 'matcha-bar',
    name: 'ماچا بار',
    shortName: 'ماچا بار',
    subtitle: 'ماچای تشریفاتی ژاپنی و اسپیریولینا در سرو گرم و سرد',
    defaultTone: 'olive',
  },
  {
    id: 'milkshakes',
    name: 'شیک',
    shortName: 'شیک',
    subtitle: 'میلک‌شیک‌های غلیظ و پرملات با بستنی تازه و تاپینگ اختصاصی',
    defaultTone: 'bronze',
  },
  {
    id: 'mocktails',
    name: 'ماکتل',
    shortName: 'ماکتل',
    subtitle: 'ترکیب‌های گازدار و میوه‌ای تازه با مرکبات و گیاهان معطر',
    defaultTone: 'plum',
  },
  {
    id: 'breakfast',
    name: 'صبحانه',
    shortName: 'صبحانه',
    subtitle: 'به‌زودی در منوی آشپزخانه ایوان',
    comingSoon: true,
    comingSoonDescription:
      'منوی صبحانه ایرانی و ملل ایوان شامل سینی‌های صبحانه، بشقاب‌های گرم و نان تازه هم‌اکنون در حال طراحی و تست نهایی سرآشپز است و به‌زودی سرو می‌شود.',
    defaultTone: 'bronze',
  },
  {
    id: 'appetizers',
    name: 'پیش‌غذا',
    shortName: 'پیش‌غذا',
    subtitle: 'به‌زودی در منوی آشپزخانه ایوان',
    comingSoon: true,
    comingSoonDescription:
      'سالادهای فصل، سوپ روز و پیش‌غذاهای دست‌ساز ایوان با مواد اولیه تازه به‌زودی به میز دیجیتال اضافه خواهند شد.',
    defaultTone: 'olive',
  },
  {
    id: 'main-course',
    name: 'غذای اصلی',
    shortName: 'غذای اصلی',
    subtitle: 'به‌زودی در منوی آشپزخانه ایوان',
    comingSoon: true,
    comingSoonDescription:
      'غذاهای اصلی رستوران ایوان شامل خوراک‌های اصیل ایرانی و فرنگی به‌زودی رونمایی و روی میز دوّار ایوان ارائه می‌شوند.',
    defaultTone: 'navy',
  },
];

type RawMenuItem = Omit<MenuItem, 'cutoutImage' | 'vesselType'>;

const RAW_MENU_ITEMS: RawMenuItem[] = [
  // =========================================================================
  // 1. نوشیدنی‌های گرم بر پایه قهوه (10 items)
  // =========================================================================
  {
    id: 'espresso',
    categoryId: 'hot-coffee',
    name: 'اسپرسو',
    description:
      'عصاره خالص و غلیظ قهوه تازه برشته‌شده با کرمای طلایی، عطر فندقی و ته‌مزه ماندگار.',
    priceBlend50: 175,
    priceArabica100: 236,
    supportsSyrup: true,
    isHot: true,
    image: IMG.espresso,
    frontImage: FRONT_IMG.espresso,
    plateAngle: 0,
    backdropTone: 'navy',
  },
  {
    id: 'americano',
    categoryId: 'hot-coffee',
    name: 'آمریکانو',
    description:
      'دبل شات اسپرسو رقیق‌شده با آب داغ تصفیه‌شده؛ بافت سبک، شفاف و خوش‌عطر.',
    priceBlend50: 180,
    priceArabica100: 241,
    supportsSyrup: true,
    isHot: true,
    image: IMG.espresso,
    frontImage: FRONT_IMG.espresso,
    plateAngle: 42,
    backdropTone: 'midnight',
  },
  {
    id: 'cortado',
    categoryId: 'hot-coffee',
    name: 'کورتادو',
    description:
      'تعادل دقیق اسپرسو و شیر بخاردهی‌شده هم‌حجم با بافت کوتاه، مخملی و طعم پررنگ قهوه.',
    priceBlend50: 221,
    priceArabica100: 282,
    supportsSyrup: true,
    supportsMilkTemp: true,
    isHot: true,
    image: IMG.latteArt,
    frontImage: FRONT_IMG.latteArt,
    plateAngle: -18,
    backdropTone: 'navy',
  },
  {
    id: 'cappuccino',
    categoryId: 'hot-coffee',
    name: 'کاپوچینو',
    description:
      'اسپرسو غنی همراه با شیر بخاردهی‌شده و لایه‌ای لطیف و منسجم از فوم شیر گرم.',
    priceBlend50: 240,
    priceArabica100: 301,
    supportsSyrup: true,
    supportsMilkTemp: true,
    isHot: true,
    image: IMG.latteArt,
    frontImage: FRONT_IMG.latteArt,
    plateAngle: 24,
    backdropTone: 'bronze',
  },
  {
    id: 'latte',
    categoryId: 'hot-coffee',
    name: 'لاته',
    description:
      'ترکیب ملایم اسپرسو و شیر ابریشمی با میکروفوم ظریف در دمای استاندارد ۶۰ تا ۷۰ درجه.',
    priceBlend50: 255,
    priceArabica100: 316,
    supportsSyrup: true,
    supportsMilkTemp: true,
    isHot: true,
    image: IMG.latteArt,
    frontImage: FRONT_IMG.latteArt,
    plateAngle: -8,
    backdropTone: 'navy',
  },
  {
    id: 'caramel-macchiato',
    categoryId: 'hot-coffee',
    name: 'کارامل ماکیاتو',
    description:
      'لایه‌های شیر بخاردهی‌شده، شات اسپرسو تازه و سس کارامل گرم با رایحه وانیل.',
    priceBlend50: 274,
    priceArabica100: 335,
    supportsSyrup: true,
    supportsMilkTemp: true,
    isHot: true,
    image: IMG.caramelMocha,
    frontImage: FRONT_IMG.mochaChoco,
    plateAngle: 12,
    backdropTone: 'bronze',
  },
  {
    id: 'mocha',
    categoryId: 'hot-coffee',
    name: 'موکا',
    description:
      'پیوند اسپرسوی تازه با شکلات تلخ آب‌شده و شیر مخملی، تزیین‌شده با پودر کاکائو.',
    priceBlend50: 274,
    priceArabica100: 335,
    supportsSyrup: true,
    supportsMilkTemp: true,
    isHot: true,
    image: IMG.caramelMocha,
    frontImage: FRONT_IMG.mochaChoco,
    plateAngle: -28,
    backdropTone: 'midnight',
  },
  {
    id: 'hot-mocha',
    categoryId: 'hot-coffee',
    name: 'هات موکا',
    description:
      'نسخه غلیظ‌تر موکا با شکلات داغ پرمایه و دبل اسپرسو؛ گرم، عمیق و دلچسب.',
    priceBlend50: 320,
    priceArabica100: 381,
    supportsSyrup: true,
    supportsMilkTemp: true,
    highlight: 'ویژه بار گرم',
    isHot: true,
    image: IMG.hotChocolate,
    frontImage: FRONT_IMG.mochaChoco,
    plateAngle: 18,
    backdropTone: 'bronze',
  },
  {
    id: 'pumpkin-latte',
    categoryId: 'hot-coffee',
    name: 'لاته پامکین',
    description:
      'لاته گرم با پوره کدوحلوایی و ترکیب ادویه‌های دارچین، جوز هندی و میخک.',
    priceBlend50: 274,
    priceArabica100: 335,
    supportsSyrup: true,
    supportsMilkTemp: true,
    isHot: true,
    image: IMG.pumpkinCarrot,
    frontImage: FRONT_IMG.pumpkinCarrot,
    plateAngle: 0,
    backdropTone: 'bronze',
  },
  {
    id: 'carrot-latte',
    categoryId: 'hot-coffee',
    name: 'لاته هویج',
    description:
      'ترکیب خلاقانه اسپرسو، شیر گرم و طعم ملایم کیک هویج و دارچین تازه.',
    priceBlend50: 274,
    priceArabica100: 335,
    supportsSyrup: true,
    supportsMilkTemp: true,
    isHot: true,
    image: IMG.pumpkinCarrot,
    frontImage: FRONT_IMG.pumpkinCarrot,
    plateAngle: 54,
    backdropTone: 'olive',
  },

  // =========================================================================
  // 2. نوشیدنی‌های گرم (9 items)
  // =========================================================================
  {
    id: 'hot-chocolate',
    categoryId: 'hot-drinks',
    name: 'هات چاکلت',
    description:
      'شکلات داغ غلیظ با کاکائوی خالص و شیر مخملی، گرم و متعادل در شیرینی.',
    price: 235,
    supportsSyrup: true,
    supportsMilkTemp: true,
    isHot: true,
    image: IMG.hotChocolate,
    frontImage: FRONT_IMG.mochaChoco,
    plateAngle: 0,
    backdropTone: 'bronze',
  },
  {
    id: 'white-hot-chocolate',
    categoryId: 'hot-drinks',
    name: 'وایت چاکلت',
    description:
      'شکلات سفید کرمی ذوب‌شده در شیر گرم با لطافت وانیلی و بافت ابریشمی.',
    price: 235,
    supportsSyrup: true,
    supportsMilkTemp: true,
    isHot: true,
    image: IMG.latteArt,
    frontImage: FRONT_IMG.latteArt,
    plateAngle: -24,
    backdropTone: 'navy',
  },
  {
    id: 'hot-lotus',
    categoryId: 'hot-drinks',
    name: 'هات لوتوس',
    description:
      'نوشیدنی گرم و مخملی با کرم بیسکویت کاراملی لوتوس و عطر ملایم دارچین.',
    price: 235,
    supportsSyrup: true,
    supportsMilkTemp: true,
    isHot: true,
    image: IMG.caramelMocha,
    frontImage: FRONT_IMG.masalaKarak,
    plateAngle: 15,
    backdropTone: 'bronze',
  },
  {
    id: 'hot-nutella',
    categoryId: 'hot-drinks',
    name: 'هات نوتلا',
    description:
      'شکلات فندقی نوتلا هم‌زده با شیر داغ بخاردهی‌شده؛ غنی و پرعطر.',
    price: 235,
    supportsSyrup: true,
    supportsMilkTemp: true,
    isHot: true,
    image: IMG.hotChocolate,
    frontImage: FRONT_IMG.mochaChoco,
    plateAngle: 48,
    backdropTone: 'midnight',
  },
  {
    id: 'hot-almond',
    categoryId: 'hot-drinks',
    name: 'هات بادام',
    description:
      'نوشیدنی گرم و لطیف بر پایه طعم بادام بوداده و شیر مخملی.',
    price: 235,
    supportsSyrup: true,
    supportsMilkTemp: true,
    isHot: true,
    image: IMG.latteArt,
    frontImage: FRONT_IMG.latteArt,
    plateAngle: 32,
    backdropTone: 'olive',
  },
  {
    id: 'carrot-milk',
    categoryId: 'hot-drinks',
    name: 'شیرهویج',
    description:
      'ترکیب گرم و مقوی عصاره هویج تازه، شیر بخاردهی‌شده و عطر ملایم هل و دارچین.',
    price: 265,
    supportsSyrup: true,
    supportsMilkTemp: true,
    isHot: true,
    image: IMG.pumpkinCarrot,
    frontImage: FRONT_IMG.pumpkinCarrot,
    plateAngle: -16,
    backdropTone: 'bronze',
  },
  {
    id: 'masala-chai',
    categoryId: 'hot-drinks',
    name: 'ماسالا',
    description:
      'چای ادویه‌ای گرم با هل، زنجبیل، دارچین، میخک و شیر بخاردهی‌شده.',
    price: 235,
    supportsSyrup: true,
    supportsMilkTemp: true,
    isHot: true,
    image: IMG.pumpkinCarrot,
    frontImage: FRONT_IMG.masalaKarak,
    plateAngle: 28,
    backdropTone: 'olive',
  },
  {
    id: 'karak-tea',
    categoryId: 'hot-drinks',
    name: 'چای کرک',
    description:
      'چای سیاه دم‌کشیده با شیر غلیظ، هل سبز معطر و زعفران در بافت کرمی.',
    price: 280,
    supportsSyrup: true,
    supportsMilkTemp: true,
    highlight: 'پیشنهاد باریستا',
    isHot: true,
    image: IMG.caramelMocha,
    frontImage: FRONT_IMG.masalaKarak,
    plateAngle: -32,
    backdropTone: 'bronze',
  },
  {
    id: 'caramel-tea',
    categoryId: 'hot-drinks',
    name: 'چای کاراملی',
    description:
      'چای گرم با نت کاراملی ملایم و شیر ابریشمی؛ متعادل و خوش‌عطر.',
    price: 189,
    supportsSyrup: true,
    supportsMilkTemp: true,
    isHot: true,
    image: IMG.caramelMocha,
    frontImage: FRONT_IMG.masalaKarak,
    plateAngle: 60,
    backdropTone: 'navy',
  },

  // =========================================================================
  // 3. نوشیدنی‌های سرد بر پایه قهوه (10 items — tall glasses, prefersFrontView)
  // =========================================================================
  {
    id: 'iced-espresso',
    categoryId: 'iced-coffee',
    name: 'آیس اسپرسو',
    description:
      'عصاره تازه اسپرسو سرو‌شده روی یخ شفاف برای طراوت فوری و طعم خالص قهوه.',
    priceBlend50: 180,
    priceArabica100: 241,
    supportsSyrup: true,
    image: IMG.icedEspresso,
    frontImage: FRONT_IMG.icedEspresso,
    prefersFrontView: true,
    plateAngle: 0,
    backdropTone: 'midnight',
  },
  {
    id: 'iced-americano',
    categoryId: 'iced-coffee',
    name: 'آیس آمریکانو',
    description:
      'دبل شات اسپرسو همراه با آب خنک و یخ شفاف؛ سبک، زلال و انرژی‌بخش.',
    priceBlend50: 180,
    priceArabica100: 241,
    supportsSyrup: true,
    image: IMG.icedEspresso,
    frontImage: FRONT_IMG.icedEspresso,
    prefersFrontView: true,
    plateAngle: 45,
    backdropTone: 'navy',
  },
  {
    id: 'iced-latte',
    categoryId: 'iced-coffee',
    name: 'آیس لاته',
    description:
      'شیر سرد و اسپرسوی تازه بر روی یخ کریستالی با رگه‌های ابریشمی قهوه.',
    priceBlend50: 255,
    priceArabica100: 316,
    supportsSyrup: true,
    image: IMG.icedLatte,
    frontImage: FRONT_IMG.icedLatte,
    prefersFrontView: true,
    plateAngle: 0,
    backdropTone: 'navy',
  },
  {
    id: 'iced-caramel',
    categoryId: 'iced-coffee',
    name: 'آیس کارامل',
    description:
      'آیس لاته همراه با سس کارامل دست‌ساز و شیر سرد روی یخ.',
    priceBlend50: 298,
    priceArabica100: 359,
    supportsSyrup: true,
    image: IMG.icedLatte,
    frontImage: FRONT_IMG.icedLatte,
    prefersFrontView: true,
    plateAngle: 35,
    backdropTone: 'bronze',
  },
  {
    id: 'iced-mocha',
    categoryId: 'iced-coffee',
    name: 'آیس موکا',
    description:
      'ترکیب خنک اسپرسو، سس شکلات تلخ و شیر سرد روی یخ شفاف.',
    priceBlend50: 298,
    priceArabica100: 359,
    supportsSyrup: true,
    image: IMG.icedLatte,
    frontImage: FRONT_IMG.icedLatte,
    prefersFrontView: true,
    plateAngle: -30,
    backdropTone: 'midnight',
  },
  {
    id: 'iced-coconut-latte',
    categoryId: 'iced-coffee',
    name: 'آیس لاته نارگیل',
    description:
      'آیس لاته معطر با طعم استوایی نارگیل، شیر سرد و اسپرسوی تازه.',
    priceBlend50: 298,
    priceArabica100: 359,
    supportsSyrup: true,
    image: IMG.icedLatte,
    frontImage: FRONT_IMG.icedLatte,
    prefersFrontView: true,
    plateAngle: 72,
    backdropTone: 'olive',
  },
  {
    id: 'red-fizz',
    categoryId: 'iced-coffee',
    name: 'رد فیز',
    description:
      'ترکیب خنک و گازدار اسپرسو با نت میوه‌های قرمز؛ طعمی متفاوت و پرطراوت.',
    priceBlend50: 279,
    priceArabica100: 340,
    supportsSyrup: true,
    image: IMG.mocktail,
    frontImage: FRONT_IMG.affogatoRedFizz,
    prefersFrontView: true,
    plateAngle: 18,
    backdropTone: 'plum',
  },
  {
    id: 'eyvan-iced-latte',
    categoryId: 'iced-coffee',
    name: 'آیس لاته ایوان',
    description:
      'دستور اختصاصی کافه ایوان با دانه ۱۰۰٪ عربیکا، شیر سرد مخملی و طعم امضادار بار.',
    priceArabica100: 359,
    supportsSyrup: true,
    highlight: 'امضای ایوان',
    image: IMG.icedLatte,
    frontImage: FRONT_IMG.icedLatte,
    prefersFrontView: true,
    plateAngle: -14,
    backdropTone: 'navy',
  },
  {
    id: 'iced-date-latte',
    categoryId: 'iced-coffee',
    name: 'آیس لاته خرما',
    description:
      'لاته سرد اختصاصی با دانه ۱۰۰٪ عربیکا و شیرینی طبیعی خرمای مرغوب ایرانی.',
    priceArabica100: 359,
    supportsSyrup: true,
    highlight: '۱۰۰٪ عربیکا',
    image: IMG.icedLatte,
    frontImage: FRONT_IMG.icedLatte,
    prefersFrontView: true,
    plateAngle: 110,
    backdropTone: 'bronze',
  },
  {
    id: 'affogato',
    categoryId: 'iced-coffee',
    name: 'آفوگاتو',
    description:
      'اسکوپ بستنی وانیلی غنی غرق در شات داغ اسپرسوی تازه؛ تقابل لطیف سرد و گرم.',
    priceBlend50: 234,
    priceArabica100: 295,
    supportsSyrup: true,
    image: IMG.affogato,
    frontImage: FRONT_IMG.affogatoRedFizz,
    prefersFrontView: true,
    plateAngle: 0,
    backdropTone: 'bronze',
  },

  // =========================================================================
  // 4. چای و دمنوش (9 items)
  // =========================================================================
  {
    id: 'tea',
    categoryId: 'tea-herbal',
    name: 'چای',
    description:
      'چای سیاه اصیل ایرانی دم‌کشیده با عطر طبیعی و رنگ یاقوتی در استکان شیشه‌ای.',
    price: 138,
    isHot: true,
    image: IMG.persianTea,
    frontImage: FRONT_IMG.persianTea,
    plateAngle: 0,
    backdropTone: 'bronze',
  },
  {
    id: 'tea-baklava',
    categoryId: 'tea-herbal',
    name: 'چای و باقلوا',
    description:
      'استکان چای تازه ایرانی همراه با باقلوای پسته‌ای ترد و معطر به گلاب.',
    price: 175,
    highlight: 'محبوب ایوان',
    isHot: true,
    image: IMG.persianTea,
    frontImage: FRONT_IMG.persianTea,
    plateAngle: 26,
    backdropTone: 'bronze',
  },
  {
    id: 'saffron-tea',
    categoryId: 'tea-herbal',
    name: 'چای زعفران',
    description:
      'چای ایرانی دم‌کشیده با رشته‌های زعفران سرگل خراسان و عطر ماندگار.',
    price: 150,
    isHot: true,
    image: IMG.persianTea,
    frontImage: FRONT_IMG.persianTea,
    plateAngle: -22,
    backdropTone: 'bronze',
  },
  {
    id: 'farang-herbal',
    categoryId: 'tea-herbal',
    name: 'دمنوش فرنگ',
    description:
      'دمنوش گیاهی خوش‌عطر و آرام‌بخش با نت‌های گلی و گیاهان معطر دست‌چین.',
    price: 260,
    isHot: true,
    image: IMG.persianCold,
    frontImage: FRONT_IMG.herbalInfusion,
    plateAngle: 15,
    backdropTone: 'olive',
  },
  {
    id: 'farkhondeh-herbal',
    categoryId: 'tea-herbal',
    name: 'دمنوش فرخنده',
    description:
      'ترکیب لطیف و نشاط‌آور گیاهان ایرانی با رایحه ملایم مرکبات و گلبرگ‌ها.',
    price: 260,
    isHot: true,
    image: IMG.persianTea,
    frontImage: FRONT_IMG.herbalInfusion,
    plateAngle: 64,
    backdropTone: 'olive',
  },
  {
    id: 'iran-herbal',
    categoryId: 'tea-herbal',
    name: 'دمنوش ایران',
    description:
      'گزیده‌ای از گیاهان بومی ایران با عطر زعفران، هل و گل محمدی اصیل.',
    price: 260,
    highlight: 'ترکیب اصیل',
    isHot: true,
    image: IMG.persianTea,
    frontImage: FRONT_IMG.herbalInfusion,
    plateAngle: -48,
    backdropTone: 'navy',
  },
  {
    id: 'narineh-herbal',
    categoryId: 'tea-herbal',
    name: 'دمنوش نارینه',
    description:
      'دمنوش میوه‌ای و ترش‌وشیرین با رنگ یاقوتی و عطر تازه انار و گلبرگ.',
    price: 260,
    isHot: true,
    image: IMG.mocktail,
    frontImage: FRONT_IMG.herbalInfusion,
    plateAngle: -25,
    backdropTone: 'plum',
  },
  {
    id: 'shazdeh-herbal',
    categoryId: 'tea-herbal',
    name: 'دمنوش شازده',
    description:
      'دم‌نوش معطر و متعادل با طبع گرم و ته‌مزه دلنشین گیاهان کوهستانی.',
    price: 260,
    isHot: true,
    image: IMG.persianCold,
    frontImage: FRONT_IMG.herbalInfusion,
    plateAngle: 88,
    backdropTone: 'olive',
  },
  {
    id: 'lalehzar-herbal',
    categoryId: 'tea-herbal',
    name: 'دمنوش لاله‌زار',
    description:
      'الهام‌گرفته از باغ‌های گل محمدی لاله‌زار؛ آرام‌بخش، لطیف و معطر.',
    price: 260,
    isHot: true,
    image: IMG.persianTea,
    frontImage: FRONT_IMG.herbalInfusion,
    plateAngle: 120,
    backdropTone: 'plum',
  },

  // =========================================================================
  // 5. سردنوش و آیس‌تی (6 items — tall glasses, prefersFrontView)
  // =========================================================================
  {
    id: 'green-tea-cold',
    categoryId: 'cold-drinks',
    name: 'گرین تی',
    description:
      'چای سبز سرد دم‌کشیده با عطر برگ تازه و طعمی زلال و خنک.',
    price: 240,
    image: IMG.persianCold,
    frontImage: FRONT_IMG.persianCold,
    prefersFrontView: true,
    plateAngle: 0,
    backdropTone: 'olive',
  },
  {
    id: 'iced-saffron-tea',
    categoryId: 'cold-drinks',
    name: 'آیس‌تی زعفران',
    description:
      'آیس‌تی شفاف با عصاره زعفران تازه و رایحه دلپذیر روی یخ.',
    price: 255,
    image: IMG.persianCold,
    frontImage: FRONT_IMG.persianCold,
    prefersFrontView: true,
    plateAngle: 52,
    backdropTone: 'bronze',
  },
  {
    id: 'bidmeshk',
    categoryId: 'cold-drinks',
    name: 'بیدمشک',
    description:
      'شربت خنک و سنتی عرق بیدمشک اصیل؛ آرام‌بخش و باطراوت.',
    price: 240,
    image: IMG.persianCold,
    frontImage: FRONT_IMG.persianCold,
    prefersFrontView: true,
    plateAngle: -36,
    backdropTone: 'olive',
  },
  {
    id: 'bahar-narenj',
    categoryId: 'cold-drinks',
    name: 'بهارنارنج',
    description:
      'سردنوش معطر بهارنارنج شیرازی با طراوت لطیف شکوفه‌های نارنج.',
    price: 240,
    image: IMG.persianCold,
    frontImage: FRONT_IMG.persianCold,
    prefersFrontView: true,
    plateAngle: 94,
    backdropTone: 'navy',
  },
  {
    id: 'khiar-sekanjabin',
    categoryId: 'cold-drinks',
    name: 'خیارسکنجبین',
    description:
      'شربت اصیل سکنجبین خانگی با رشته‌های خیار تازه و برگ نعنا روی یخ.',
    price: 255,
    highlight: 'خنک و اصیل',
    image: IMG.persianCold,
    frontImage: FRONT_IMG.persianCold,
    prefersFrontView: true,
    plateAngle: 18,
    backdropTone: 'olive',
  },
  {
    id: 'peach-iced-tea',
    categoryId: 'cold-drinks',
    name: 'آیس‌تی هلو',
    description:
      'چای سرد میوه‌ای با طعم شیرین و معطر هلوی تازه.',
    price: 195,
    image: IMG.persianCold,
    frontImage: FRONT_IMG.persianCold,
    prefersFrontView: true,
    plateAngle: -72,
    backdropTone: 'bronze',
  },

  // =========================================================================
  // 6. ماچا بار (8 items)
  // =========================================================================
  {
    id: 'matcha',
    categoryId: 'matcha-bar',
    name: 'ماچا',
    description:
      'چای سبز پودری تشریفاتی هم‌زده با ویسک بامبو؛ شفاف، خالص و سرشار از آنتی‌اکسیدان.',
    price: 210,
    isHot: true,
    image: IMG.matchaLatte,
    frontImage: FRONT_IMG.matchaLatte,
    plateAngle: 0,
    backdropTone: 'olive',
  },
  {
    id: 'matcha-latte',
    categoryId: 'matcha-bar',
    name: 'ماچا لاته',
    description:
      'ماچای درجه‌یک ژاپنی همراه با شیر بخاردهی‌شده مخملی و عطر سبز ملایم.',
    price: 255,
    supportsSyrup: true,
    supportsMilkTemp: true,
    isHot: true,
    image: IMG.matchaLatte,
    frontImage: FRONT_IMG.matchaLatte,
    plateAngle: 28,
    backdropTone: 'olive',
  },
  {
    id: 'strawberry-matcha',
    categoryId: 'matcha-bar',
    name: 'ماچا استرابری',
    description:
      'لایه‌های چشم‌نواز پوره توت‌فرنگی تازه، شیر سرد و شات ماچای خالص روی یخ.',
    price: 315,
    highlight: 'پرطرفدار',
    image: IMG.strawberryMatcha,
    frontImage: FRONT_IMG.strawberryMatcha,
    prefersFrontView: true,
    plateAngle: 0,
    backdropTone: 'plum',
  },
  {
    id: 'iced-matcha',
    categoryId: 'matcha-bar',
    name: 'آیس ماچا',
    description:
      'ماچای خالص هم‌زده روی آب خنک و تکه‌های یخ شفاف؛ سبک و باطراوت.',
    price: 220,
    image: IMG.matchaLatte,
    frontImage: FRONT_IMG.matchaLatte,
    prefersFrontView: true,
    plateAngle: -38,
    backdropTone: 'olive',
  },
  {
    id: 'iced-matcha-latte',
    categoryId: 'matcha-bar',
    name: 'آیس ماچا لاته',
    description:
      'ماچای تشریفاتی روی شیر سرد و یخ با بافت خنک و کرمی.',
    price: 260,
    supportsSyrup: true,
    image: IMG.matchaLatte,
    frontImage: FRONT_IMG.matchaLatte,
    prefersFrontView: true,
    plateAngle: 64,
    backdropTone: 'olive',
  },
  {
    id: 'iced-spirulina',
    categoryId: 'matcha-bar',
    name: 'آیس اسپیریولینا',
    description:
      'نوشیدنی سرد و طبیعی اسپیریولینا با شیر مخملی و یخ کریستالی.',
    price: 290,
    image: IMG.icedLatte,
    frontImage: FRONT_IMG.blueSpirulina,
    prefersFrontView: true,
    plateAngle: -20,
    backdropTone: 'navy',
  },
  {
    id: 'spirulina',
    categoryId: 'matcha-bar',
    name: 'اسپیریولینا',
    description:
      'لاته گرم و لطیف اسپیریولینا با بافت ابریشمی و طعمی متعادل.',
    price: 290,
    supportsMilkTemp: true,
    isHot: true,
    image: IMG.latteArt,
    frontImage: FRONT_IMG.blueSpirulina,
    plateAngle: 52,
    backdropTone: 'navy',
  },
  {
    id: 'iced-pomegranate-spirulina',
    categoryId: 'matcha-bar',
    name: 'آیس اسپیریولینا انار',
    description:
      'ترکیب لایه‌ای و خنک اسپیریولینا با عصاره انار تازه؛ ملس و چشم‌نواز.',
    price: 320,
    highlight: 'ترکیب ویژه',
    image: IMG.strawberryMatcha,
    frontImage: FRONT_IMG.strawberryMatcha,
    prefersFrontView: true,
    plateAngle: 44,
    backdropTone: 'plum',
  },

  // =========================================================================
  // 7. شیک (7 items — tall glasses, prefersFrontView)
  // =========================================================================
  {
    id: 'chocolate-milkshake',
    categoryId: 'milkshakes',
    name: 'شیک شکلات',
    description:
      'شیک غلیظ بستنی شکلاتی و سس کاکائوی تلخ با بافتی خامه‌ای و یکدست.',
    price: 335,
    image: IMG.chocoShakeFlow,
    frontImage: FRONT_IMG.chocoShakeFlow,
    prefersFrontView: true,
    plateAngle: 0,
    backdropTone: 'bronze',
  },
  {
    id: 'nutella-milkshake',
    categoryId: 'milkshakes',
    name: 'شیک نوتلا',
    description:
      'ترکیب پرملات بستنی تازه و کرم فندق نوتلا با تاپینگ شکلاتی.',
    price: 370,
    image: IMG.milkshake,
    frontImage: FRONT_IMG.chocoShake,
    prefersFrontView: true,
    plateAngle: 40,
    backdropTone: 'bronze',
  },
  {
    id: 'peanut-butter-milkshake',
    categoryId: 'milkshakes',
    name: 'شیک بادام‌زمینی',
    description:
      'شیک مقوی و کرمی با کره بادام‌زمینی طبیعی و بستنی وانیلی.',
    price: 390,
    image: IMG.milkshake,
    frontImage: FRONT_IMG.chocoShake,
    prefersFrontView: true,
    plateAngle: -32,
    backdropTone: 'bronze',
  },
  {
    id: 'lotus-milkshake',
    categoryId: 'milkshakes',
    name: 'شیک لوتوس',
    description:
      'شیک مخملی بیسکویت کاراملی لوتوس با کرانچ بیسکویت روی خامه.',
    price: 370,
    highlight: 'پرفروش',
    image: IMG.milkshake,
    frontImage: FRONT_IMG.chocoShake,
    prefersFrontView: true,
    plateAngle: 78,
    backdropTone: 'bronze',
  },
  {
    id: 'pina-colada-milkshake',
    categoryId: 'milkshakes',
    name: 'شیک پیناکولادا',
    description:
      'ترکیب خنک و استوایی آناناس تازه، کرم نارگیل و بستنی خامه‌ای.',
    price: 445,
    image: IMG.strawberryMatcha,
    frontImage: FRONT_IMG.berryShake,
    prefersFrontView: true,
    plateAngle: -18,
    backdropTone: 'olive',
  },
  {
    id: 'espresso-milkshake',
    categoryId: 'milkshakes',
    name: 'شیک اسپرسو',
    description:
      'شات اسپرسوی تازه ترکیب‌شده با بستنی وانیلی برای دوستداران قهوه و شیک.',
    price: 385,
    image: IMG.affogato,
    frontImage: FRONT_IMG.chocoShake,
    prefersFrontView: true,
    plateAngle: 35,
    backdropTone: 'navy',
  },
  {
    id: 'berry-milkshake',
    categoryId: 'milkshakes',
    name: 'شیک بری',
    description:
      'شیک میوه‌ای و خوش‌رنگ با میکس توت‌ها و بستنی تازه.',
    price: 425,
    image: IMG.strawberryMatcha,
    frontImage: FRONT_IMG.berryShake,
    prefersFrontView: true,
    plateAngle: 96,
    backdropTone: 'plum',
  },

  // =========================================================================
  // 8. ماکتل (8 items — tall glasses, prefersFrontView)
  // =========================================================================
  {
    id: 'red-love',
    categoryId: 'mocktails',
    name: 'رد لاو',
    description:
      'ماکتل یاقوتی و گازدار با ترکیب میوه‌های قرمز تازه و عطر مرکبات.',
    price: 260,
    image: IMG.redLoveFlow,
    frontImage: FRONT_IMG.redLoveFlow,
    prefersFrontView: true,
    plateAngle: 0,
    backdropTone: 'plum',
  },
  {
    id: 'lemonade',
    categoryId: 'mocktails',
    name: 'لیموناد',
    description:
      'آب لیموترش تازه دست‌فشار با شیرینی متعادل و یخ خردشده.',
    price: 260,
    image: IMG.persianCold,
    frontImage: FRONT_IMG.greenMocktail,
    prefersFrontView: true,
    plateAngle: -24,
    backdropTone: 'olive',
  },
  {
    id: 'brazilian-lemonade',
    categoryId: 'mocktails',
    name: 'لیموناد برزیلی',
    description:
      'لیموناد کرمی و خنک با لایم تازه و بافت مخملی سبک.',
    price: 295,
    image: IMG.brazilianLemonadeFlow,
    frontImage: FRONT_IMG.brazilianLemonadeFlow,
    prefersFrontView: true,
    plateAngle: 64,
    backdropTone: 'olive',
  },
  {
    id: 'mojito',
    categoryId: 'mocktails',
    name: 'موهیتو',
    description:
      'برگ‌های نعنای تازه، لایم برش‌خورده و سودای خنک روی یخ فراوان.',
    price: 295,
    image: IMG.mojitoFlow,
    frontImage: FRONT_IMG.mojitoFlow,
    prefersFrontView: true,
    plateAngle: 22,
    backdropTone: 'olive',
  },
  {
    id: 'red-mojito',
    categoryId: 'mocktails',
    name: 'رد موهیتو',
    description:
      'موهیتوی کلاسیک همراه با عصاره میوه‌های قرمز برای طعمی ملس و پرطراوت.',
    price: 310,
    image: IMG.mocktail,
    frontImage: FRONT_IMG.redMocktail,
    prefersFrontView: true,
    plateAngle: 48,
    backdropTone: 'plum',
  },
  {
    id: 'rokato',
    categoryId: 'mocktails',
    name: 'روکاتو',
    description:
      'ماکتل امضادار بار سرد ایوان با توازن طعمی میوه‌ای، خنک و گازدار.',
    price: 310,
    highlight: 'ویژه بار سرد',
    image: IMG.rokatoFlow,
    frontImage: FRONT_IMG.rokatoFlow,
    prefersFrontView: true,
    plateAngle: -36,
    backdropTone: 'navy',
  },
  {
    id: 'coco-paradise',
    categoryId: 'mocktails',
    name: 'کوکو پارادایس',
    description:
      'ترکیب خنک و استوایی نارگیل و میوه‌های تابستانی با عطر ملایم.',
    price: 280,
    image: IMG.mocktail,
    frontImage: FRONT_IMG.redMocktail,
    prefersFrontView: true,
    plateAngle: 88,
    backdropTone: 'navy',
  },
  {
    id: 'green-rush',
    categoryId: 'mocktails',
    name: 'گرین راش',
    description:
      'ماکتل سبز و پرانرژی با نت سیب سبز، لایم و نعنای تازه.',
    price: 287,
    image: IMG.persianCold,
    frontImage: FRONT_IMG.greenMocktail,
    prefersFrontView: true,
    plateAngle: -56,
    backdropTone: 'olive',
  },
];

export const MENU_ITEMS: MenuItem[] = RAW_MENU_ITEMS.map((item) => {
  const cutoutImage =
    item.id === 'red-fizz'
      ? CUTOUT_IMG.redMocktail
      : (FRONT_TO_CUTOUT[item.frontImage] ?? CUTOUT_IMG.icedLatte);
  const vesselType: 'tall' | 'cup' =
    item.prefersFrontView ||
    item.categoryId === 'mocktails' ||
    item.categoryId === 'milkshakes' ||
    item.categoryId === 'cold-drinks' ||
    item.categoryId === 'iced-coffee'
      ? 'tall'
      : 'cup';
  return {
    ...item,
    cutoutImage,
    vesselType,
  };
});
