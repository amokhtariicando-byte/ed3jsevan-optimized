import type { CategoryId } from '../data/menuData';

export type Language = 'fa' | 'ar';

export interface UiStrings {
  langShort: string;
  switchLangAria: string;
  // Header & Nav
  overviewTable: string;
  overviewShort: string;
  search: string;
  cafeInfo: string;
  instagram: string;
  simpleMenu: string;
  rotaryTable: string;
  categoriesBtn: string;
  comingSoon: string;
  // Showcase & Controls
  overviewBarPrefix: string;
  backToSingleView: string;
  eyvanKitchen: string;
  viewHotCoffee: string;
  followLaunchInstagram: string;
  ofWord: string;
  priceNoZeros: string;
  blend5050: string;
  arabica100: string;
  arabicaExclusive: string;
  arabicaExclusiveLong: string;
  backToTopView: string;
  viewFrontAngle: string;
  frontCupView: string;
  syrupAndDetails: string;
  productDetails: string;
  fullTrayView: string;
  dragHintFront: string;
  dragHintTop: string;
  comingSoonAtEyvan: string;
  clickAnyDrink: string;
  itemsOnTableSuffix: string;
  // Drawer
  selectCoffeeBean: string;
  blend5050Full: string;
  arabicaSpecialty: string;
  selectSyrup: string;
  optionalPlus: string;
  noSyrup: string;
  syrupPrefix: string;
  milkTemp: string;
  milkTempStandard: string;
  milkTempExtraHot: string;
  finalPriceLabel: string;
  includesPrefix: string;
  closeDetails: string;
  // Search Overlay
  searchPlaceholder: string;
  resultsFoundSuffix: string;
  popularSuggestions: string;
  noSearchMatchPrefix: string;
  noSearchMatchSuffix: string;
  syrupAvailableTag: string;
  // Simple Menu
  simpleMenuEyebrow: string;
  simpleMenuHeading: string;
  simpleMenuSubPrefix: string;
  simpleSearchPlaceholder: string;
  allSections: string;
  allSectionsSubtitlePrefix: string;
  allSectionsSubtitleSuffix: string;
  noResultsSimple: string;
  showAllProducts: string;
  itemCountUnit: string;
  itemCountShort: string;
  showOnTable: string;
  notifyLaunch: string;
  // Mobile Category Sheet
  categoriesTitle: string;
  quickSelectPrefix: string;
  quickSelectSuffix: string;
  // Cafe Info Modal
  cafeInfoModalTitle: string;
  addressHeading: string;
  hoursHeading: string;
  hotBarStandardHeading: string;
  officialInstagram: string;
  copied: string;
  copyLink: string;
  visitPage: string;
  // Footer
  infoAndHours: string;
  contactAndStandard: string;
  priceTomanNote: string;
  currencyUnit: string;
}

export const UI_STRINGS: Record<Language, UiStrings> = {
  fa: {
    langShort: 'عر',
    switchLangAria: 'تغییر زبان به عربی',
    overviewTable: 'نمای کلی میز',
    overviewShort: 'نمای کلی',
    search: 'جستجو',
    cafeInfo: 'مشخصات و نشانی',
    instagram: 'اینستاگرام',
    simpleMenu: 'منوی ساده',
    rotaryTable: 'میز دوّار',
    categoriesBtn: 'دسته‌ها',
    comingSoon: 'به‌زودی',
    overviewBarPrefix: 'نمای کلی میز',
    backToSingleView: 'بازگشت به نمایش تکی',
    eyvanKitchen: 'آشپزخانه کافه و رستوران ایوان',
    viewHotCoffee: 'مشاهده بار قهوه گرم',
    followLaunchInstagram: 'اطلاع از رونمایی در اینستاگرام',
    ofWord: 'از',
    priceNoZeros: 'قیمت بدون صفر',
    blend5050: '۵۰٪/۵۰٪',
    arabica100: '۱۰۰٪ عربیکا',
    arabicaExclusive: 'سرو اختصاصی با ۱۰۰٪ عربیکا',
    arabicaExclusiveLong: 'سرو انحصاری با ۱۰۰٪ عربیکا',
    backToTopView: 'بازگشت به نمای بالا',
    viewFrontAngle: 'مشاهده نمای روبه‌رو',
    frontCupView: 'نمای روبه‌رو لیوان',
    syrupAndDetails: 'سیروپ و جزئیات',
    productDetails: 'جزئیات محصول',
    fullTrayView: 'نمای کامل سینی',
    dragHintFront: 'برای چرخش میز بکشید یا روی نوشیدنی کناری بزنید',
    dragHintTop: 'برای چرخش میز بکشید · روی نوشیدنی بزنید',
    comingSoonAtEyvan: 'به‌زودی در ایوان',
    clickAnyDrink: 'روی هر نوشیدنی کلیک کنید',
    itemsOnTableSuffix: 'آیتم روی میز',
    selectCoffeeBean: 'انتخاب نوع دانه قهوه',
    blend5050Full: 'ترکیب ۵۰٪/۵۰٪',
    arabicaSpecialty: 'دانه ۱۰۰٪ عربیکا تخصصی',
    selectSyrup: 'انتخاب سیروپ طعم‌دار',
    optionalPlus: 'اختیاری · +',
    noSyrup: 'بدون سیروپ',
    syrupPrefix: 'سیروپ',
    milkTemp: 'دمای شیر',
    milkTempStandard: 'استاندارد (۶۰ تا ۷۰ درجه)',
    milkTempExtraHot: 'داغ‌تر از استاندارد',
    finalPriceLabel: 'قیمت نهایی با انتخاب فعلی',
    includesPrefix: 'شامل',
    closeDetails: 'بستن جزئیات',
    searchPlaceholder: 'جستجو بین ۶۷ نوشیدنی (مثلاً لاته، چای زعفران، ماچا، نوتلا)',
    resultsFoundSuffix: 'نتیجه یافت شد',
    popularSuggestions: 'پیشنهادهای محبوب روی میز ایوان',
    noSearchMatchPrefix: 'نوشیدنی با عبارت «',
    noSearchMatchSuffix: '» پیدا نشد',
    syrupAvailableTag: 'قابل افزودن سیروپ',
    simpleMenuEyebrow: 'منوی ساده و دسته‌بندی‌شده · کافه و رستوران ایوان',
    simpleMenuHeading: 'فهرست کامل نوشیدنی‌ها و بخش‌های منو',
    simpleMenuSubPrefix: 'تمامی قیمت‌ها بدون صفر و به تومان درج شده است',
    simpleSearchPlaceholder: 'جستجو در منو (لاته، موهیتو، چای کرک...)',
    allSections: 'همه بخش‌ها',
    allSectionsSubtitlePrefix: 'نمایش یکپارچه',
    allSectionsSubtitleSuffix: 'نوشیدنی و بخش‌های به‌زودی',
    noResultsSimple: 'نتیجه‌ای برای جستجوی شما پیدا نشد',
    showAllProducts: 'نمایش همه محصولات',
    itemCountUnit: 'مورد',
    itemCountShort: 'آیتم',
    showOnTable: 'نمایش روی میز',
    notifyLaunch: 'اطلاع از رونمایی',
    categoriesTitle: 'دسته‌بندی‌های منوی ایوان',
    quickSelectPrefix: 'انتخاب سریع از میان',
    quickSelectSuffix: 'بخش منو',
    cafeInfoModalTitle: 'مشخصات و نشانی کافه ایوان',
    addressHeading: 'نشانی و موقعیت مکانی',
    hoursHeading: 'ساعات پذیرایی',
    hotBarStandardHeading: 'استاندارد سرو بار گرم',
    officialInstagram: 'صفحه رسمی اینستاگرام ایوان',
    copied: 'کپی شد',
    copyLink: 'کپی لینک',
    visitPage: 'مشاهده پیج',
    infoAndHours: 'اطلاعات و ساعات کاری',
    contactAndStandard: 'ارتباط و استاندارد سرو',
    priceTomanNote: 'تمامی قیمت‌ها به تومان بدون صفرهای اضافه است.',
    currencyUnit: 'تومان',
  },
  ar: {
    langShort: 'فا',
    switchLangAria: 'التبديل إلى اللغة الفارسية',
    overviewTable: 'نظرة عامة على الطاولة',
    overviewShort: 'نظرة عامة',
    search: 'بحث',
    cafeInfo: 'العنوان والتفاصيل',
    instagram: 'إنستغرام',
    simpleMenu: 'القائمة البسيطة',
    rotaryTable: 'الطاولة الدوّارة',
    categoriesBtn: 'الأقسام',
    comingSoon: 'قريباً',
    overviewBarPrefix: 'نظرة عامة على الطاولة',
    backToSingleView: 'العودة للعرض الفردي',
    eyvanKitchen: 'مطبخ كافيه ومطعم إيوان',
    viewHotCoffee: 'استعراض بار القهوة الساخنة',
    followLaunchInstagram: 'تابع الإطلاق على إنستغرام',
    ofWord: 'من',
    priceNoZeros: 'السعر بدون أصفار',
    blend5050: '٥٠٪ / ٥٠٪',
    arabica100: '١٠٠٪ أرابيكا',
    arabicaExclusive: 'يُقدّم حصرياً بـ ١٠٠٪ أرابيكا',
    arabicaExclusiveLong: 'تقديم حصري بحبوب ١٠٠٪ أرابيكا',
    backToTopView: 'العودة للمنظور العلوي',
    viewFrontAngle: 'عرض الواجهة الأمامية',
    frontCupView: 'منظور الكوب الأمامي',
    syrupAndDetails: 'النكهات والتفاصيل',
    productDetails: 'تفاصيل المشروب',
    fullTrayView: 'عرض الصينية الكاملة',
    dragHintFront: 'اسحب لتدوير الطاولة أو اضغط على المشروب المجاور',
    dragHintTop: 'اسحب لتدوير الطاولة · اضغط على أي مشروب',
    comingSoonAtEyvan: 'قريباً في إيوان',
    clickAnyDrink: 'اضغط على أي مشروب للاختيار',
    itemsOnTableSuffix: 'أصناف على الطاولة',
    selectCoffeeBean: 'اختر نوع حبوب القهوة',
    blend5050Full: 'مزيج ٥٠٪ / ٥٠٪',
    arabicaSpecialty: 'حبوب ١٠٠٪ أرابيكا مختصة',
    selectSyrup: 'إضافة نكهة (سيروب)',
    optionalPlus: 'اختياري · +',
    noSyrup: 'بدون سيروب',
    syrupPrefix: 'سيروب',
    milkTemp: 'درجة حرارة الحليب',
    milkTempStandard: 'قياسية (٦٠ إلى ٧٠ درجة)',
    milkTempExtraHot: 'أكثر سخونة من القياسي',
    finalPriceLabel: 'السعر النهائي حسب اختيارك',
    includesPrefix: 'يشمل',
    closeDetails: 'إغلاق التفاصيل',
    searchPlaceholder: 'ابحث بين ٦٧ مشروباً (لاتيه، شاي زعفران، ماتشا، نوتيلا...)',
    resultsFoundSuffix: 'نتائج مطابقة',
    popularSuggestions: 'اختيارات محبوبة على طاولة إيوان',
    noSearchMatchPrefix: 'لم يتم العثور على مشروب باسم «',
    noSearchMatchSuffix: '»',
    syrupAvailableTag: 'قابل لإضافة السيروب',
    simpleMenuEyebrow: 'القائمة الكاملة المصنّفة · كافيه ومطعم إيوان',
    simpleMenuHeading: 'قائمة المشروبات والأقسام الكاملة',
    simpleMenuSubPrefix: 'جميع الأسعار بالتومان وبدون أصفار إضافية',
    simpleSearchPlaceholder: 'ابحث في القائمة (لاتيه، موهيتو، كرك...)',
    allSections: 'جميع الأقسام',
    allSectionsSubtitlePrefix: 'عرض شامل لـ',
    allSectionsSubtitleSuffix: 'مشروباً والأقسام القادمة قريباً',
    noResultsSimple: 'لم يتم العثور على نتائج لبحثك',
    showAllProducts: 'عرض جميع المشروبات',
    itemCountUnit: 'أصناف',
    itemCountShort: 'صنف',
    showOnTable: 'عرض على الطاولة',
    notifyLaunch: 'تابع الإطلاق',
    categoriesTitle: 'أقسام قائمة إيوان',
    quickSelectPrefix: 'اختيار سريع من بين',
    quickSelectSuffix: 'أقسام في القائمة',
    cafeInfoModalTitle: 'معلومات وعنوان كافيه إيوان',
    addressHeading: 'العنوان والموقع',
    hoursHeading: 'ساعات العمل',
    hotBarStandardHeading: 'معيار تقديم البار الساخن',
    officialInstagram: 'الصفحة الرسمية لكافيه إيوان على إنستغرام',
    copied: 'تم النسخ',
    copyLink: 'نسخ الرابط',
    visitPage: 'زيارة الصفحة',
    infoAndHours: 'المعلومات وساعات العمل',
    contactAndStandard: 'التواصل ومعيار التقديم',
    priceTomanNote: 'جميع الأسعار بالتومان بدون الأصفار الإضافية.',
    currencyUnit: 'تومان',
  },
};

export const AR_CAFE_INFO = {
  brandName: 'إيوان',
  brandSubtitle: 'كافيه ومطعم',
  tagline:
    'أجواء هادئة، قهوة مختصة بخيارين من الحبوب (٥٠/٥٠ أو ١٠٠٪ أرابيكا)، أعشاب إيرانية فاخرة، وقريباً مطبخ إيوان المتكامل',
  hours: 'يومياً من ٩:٠٠ صباحاً حتى ١١:٣٠ مساءً',
  milkTempNote:
    'درجة حرارة الحليب القياسية بين ٦٠ و٧٠ درجة مئوية؛ يرجى إبلاغ النادل إذا كنت تفضّلها أكثر سخونة',
  paymentNote: 'الدفع يتم حضورياً عند الصندوق',
  addressStatus: 'سيتم إدراج العنوان الدقيق وموقع الخريطة فور التأكيد',
  coordinatesLabel: 'الموقع جاهز للربط بالخريطة',
} as const;

export const AR_SYRUPS: Record<string, string> = {
  caramel: 'كراميل',
  vanilla: 'فانيلا',
  hazelnut: 'بندق',
  irish: 'آيريش',
  cinnamon: 'قرفة',
  coconut: 'جوز الهند',
  chocolate: 'شوكولاتة',
  'salted-caramel': 'كراميل مملح',
};

export const AR_CATEGORIES: Record<
  CategoryId,
  {
    name: string;
    shortName: string;
    subtitle: string;
    comingSoonDescription?: string;
  }
> = {
  'hot-coffee': {
    name: 'مشروبات القهوة الساخنة',
    shortName: 'قهوة ساخنة',
    subtitle:
      'استخلاص دقيق بخيار حبوب ٥٠٪/٥٠٪ أو ١٠٠٪ أرابيكا مع إمكانية إضافة السيروب',
  },
  'hot-drinks': {
    name: 'المشروبات الساخنة',
    shortName: 'مشروبات ساخنة',
    subtitle: 'مشروبات الشوكولاتة والتوابل والكريمات المحضّرة يدوياً في بار إيوان',
  },
  'iced-coffee': {
    name: 'مشروبات القهوة الباردة',
    shortName: 'قهوة باردة',
    subtitle: 'قهوة باردة مختصة، آيس لاتيه إيوان وأفوغاتو على ثلج كريستالي',
  },
  'tea-herbal': {
    name: 'الشاي والأعشاب',
    shortName: 'شاي وأعشاب',
    subtitle: 'شاي إيراني أصيل وأعشاب طبيعية منتقاة بعناية بعبق الزعفران والورد',
  },
  'cold-drinks': {
    name: 'المشروبات الباردة والآيس تي',
    shortName: 'مشروبات باردة',
    subtitle: 'خلاصات زهرية إيرانية أصيلة وآيس تي منعش بنكهات طبيعية',
  },
  'matcha-bar': {
    name: 'بار الماتشا',
    shortName: 'بار الماتشا',
    subtitle: 'ماتشا يابانية فاخرة وسبيرولينا بتقديم ساخن وبارد',
  },
  milkshakes: {
    name: 'ميلك شيك',
    shortName: 'شيك',
    subtitle: 'ميلك شيك غني وكريمي بالآيس كريم الطازج وإضافات إيوان الخاصة',
  },
  mocktails: {
    name: 'الموكتيل',
    shortName: 'موكتيل',
    subtitle: 'توليفات فاكهية فوارة ومنعشة بالحمضيات والأعشاب العطرية الطازجة',
  },
  breakfast: {
    name: 'الإفطار',
    shortName: 'الإفطار',
    subtitle: 'قريباً في قائمة مطبخ إيوان',
    comingSoonDescription:
      'قائمة الإفطار الإيراني والعالمي في إيوان، تشمل صواني الإفطار والأطباق الساخنة والخبز الطازج، قيد الإعداد والتجربة النهائية وستُقدّم قريباً.',
  },
  appetizers: {
    name: 'المقبلات',
    shortName: 'المقبلات',
    subtitle: 'قريباً في قائمة مطبخ إيوان',
    comingSoonDescription:
      'سلطات الموسم، شوربة اليوم ومقبلات إيوان المحضّرة بمكونات طازجة ستُضاف قريباً إلى الطاولة الرقمية.',
  },
  'main-course': {
    name: 'الأطباق الرئيسية',
    shortName: 'الأطباق الرئيسية',
    subtitle: 'قريباً في قائمة مطبخ إيوان',
    comingSoonDescription:
      'الأطباق الرئيسية لمطعم إيوان من المأكولات الإيرانية الأصيلة والعالمية ستُطرح قريباً على طاولة إيوان الدوّارة.',
  },
};

export const AR_ITEMS: Record<
  string,
  { name: string; description: string; highlight?: string }
> = {
  espresso: {
    name: 'إسبريسو',
    description:
      'خلاصة نقية ومركّزة من البن المحمّص الطازج بكريما ذهبية وعبق البندق ونهاية غنية.',
  },
  americano: {
    name: 'أمريكانو',
    description:
      'دبل شوت إسبريسو ممزوج بماء ساخن نقي؛ قوام خفيف وصافٍ بعبق قهوة متوازن.',
  },
  cortado: {
    name: 'كورتادو',
    description:
      'توازن دقيق بين الإسبريسو والحليب المبخّر بكميات متساوية بقوام مخملي ونكهة قهوة واضحة.',
  },
  cappuccino: {
    name: 'كابتشينو',
    description:
      'إسبريسو غني مع حليب مبخّر وطبقة ناعمة ومتماسكة من رغوة الحليب الدافئة.',
  },
  latte: {
    name: 'لاتيه',
    description:
      'مزيج ناعم من الإسبريسو والحليب الحريري برغوة دقيقة في درجة حرارة قياسية ٦٠ إلى ٧٠.',
  },
  'caramel-macchiato': {
    name: 'كراميل ماكياتو',
    description:
      'طبقات من الحليب المبخّر وشوت إسبريسو طازج وصلصة الكراميل الدافئة بلمسة فانيلا.',
  },
  mocha: {
    name: 'موكا',
    description:
      'توليفة الإسبريسو الطازج مع الشوكولاتة الداكنة الذائبة والحليب المخملي ورشة كاكاو.',
  },
  'hot-mocha': {
    name: 'هوت موكا',
    highlight: 'مميز البار الساخن',
    description:
      'نسخة أكثر كثافة من الموكا بشوكولاتة ساخنة غنية ودبل إسبريسو؛ دافئ وعميق النكهة.',
  },
  'pumpkin-latte': {
    name: 'لاتيه اليقطين',
    description:
      'لاتيه دافئ بمهروس اليقطين ومزيج توابل القرفة وجوزة الطيب والقرنفل.',
  },
  'carrot-latte': {
    name: 'لاتيه الجزر',
    description:
      'توليفة مبتكرة من الإسبريسو والحليب الدافئ بنكهة كيك الجزر اللطيفة والقرفة الطازجة.',
  },
  'hot-chocolate': {
    name: 'هوت شوكليت',
    description:
      'شوكولاتة ساخنة كثيفة بالكاكاو النقي والحليب المخملي بحلاوة متوازنة.',
  },
  'white-hot-chocolate': {
    name: 'وايت شوكليت',
    description:
      'شوكولاتة بيضاء كريمية ذائبة في الحليب الدافئ بنعومة الفانيلا وقوام حريري.',
  },
  'hot-lotus': {
    name: 'هوت لوتس',
    description:
      'مشروب ساخن ومخملي بكريمة بسكويت اللوتس بالكراميل ولمسة قرفة ناعمة.',
  },
  'hot-nutella': {
    name: 'هوت نوتيلا',
    description: 'شوكولاتة البندق نوتيلا مخفوقة مع حليب مبخّر ساخن؛ غني وذو عبق شهي.',
  },
  'hot-almond': {
    name: 'هوت لوز',
    description: 'مشروب دافئ وناعم بنكهة اللوز المحمّص والحليب المخملي.',
  },
  'carrot-milk': {
    name: 'حليب بالجزر الدافئ',
    description:
      'مزيج مغذٍ ودافئ من عصير الجزر الطازج والحليب المبخّر بلمسة هيل وقرفة.',
  },
  'masala-chai': {
    name: 'شاي ماسالا',
    description:
      'شاي التوابل الدافئ بالهيل والزنجبيل والقرفة والقرنفل مع الحليب المبخّر.',
  },
  'karak-tea': {
    name: 'شاي كرك',
    highlight: 'ترشيح الباريستا',
    description:
      'شاي أسود مخمّر مع الحليب المكثّف والهيل الأخضر العطري والزعفران بقوام كريمي.',
  },
  'caramel-tea': {
    name: 'شاي بالكراميل',
    description: 'شاي دافئ بلمسة كراميل ناعمة وحليب حريري؛ متوازن وعطري.',
  },
  'iced-espresso': {
    name: 'آيس إسبريسو',
    description:
      'خلاصة إسبريسو طازجة تُقدّم على ثلج شفاف لانتعاش فوري ونكهة قهوة نقية.',
  },
  'iced-americano': {
    name: 'آيس أمريكانو',
    description:
      'دبل شوت إسبريسو مع ماء بارد وثلج شفاف؛ خفيف ومنعش ومليء بالطاقة.',
  },
  'iced-latte': {
    name: 'آيس لاتيه',
    description:
      'حليب بارد وإسبريسو طازج على ثلج كريستالي بتموّجات حريرية من القهوة.',
  },
  'iced-caramel': {
    name: 'آيس كراميل',
    description: 'آيس لاتيه مع صلصة كراميل محضّرة يدوياً وحليب بارد على الثلج.',
  },
  'iced-mocha': {
    name: 'آيس موكا',
    description:
      'توليفة باردة من الإسبريسو وصلصة الشوكولاتة الداكنة والحليب البارد على الثلج.',
  },
  'iced-coconut-latte': {
    name: 'آيس لاتيه جوز الهند',
    description:
      'آيس لاتيه عطري بنكهة جوز الهند الاستوائية مع الحليب البارد والإسبريسو الطازج.',
  },
  'red-fizz': {
    name: 'ريد فيز',
    description:
      'توليفة باردة وفوارة من الإسبريسو بلمسات الفواكه الحمراء؛ نكهة فريدة ومنعشة.',
  },
  'eyvan-iced-latte': {
    name: 'آيس لاتيه إيوان',
    highlight: 'توقيع إيوان',
    description:
      'وصفة كافيه إيوان الخاصة بحبوب ١٠٠٪ أرابيكا وحليب بارد مخملي ونكهة البار المميزة.',
  },
  'iced-date-latte': {
    name: 'آيس لاتيه التمر',
    highlight: '١٠٠٪ أرابيكا',
    description:
      'لاتيه بارد خاص بحبوب ١٠٠٪ أرابيكا وحلاوة طبيعية من التمر الإيراني الفاخر.',
  },
  affogato: {
    name: 'أفوغاتو',
    description:
      'كرة آيس كريم فانيلا غنية مغمورة بشوت إسبريسو ساخن طازج؛ تباين رائع بين البارد والساخن.',
  },
  tea: {
    name: 'شاي إيراني',
    description:
      'شاي أسود إيراني أصيل مخمّر بعطر طبيعي ولون ياقوتي في كوب زجاجي تقليدي.',
  },
  'tea-baklava': {
    name: 'شاي وبقلاوة',
    highlight: 'الأكثر طلباً في إيوان',
    description:
      'كوب شاي إيراني طازج يُقدّم مع بقلاوة الفستق المقرمشة والمعطّرة بماء الورد.',
  },
  'saffron-tea': {
    name: 'شاي بالزعفران',
    description:
      'شاي إيراني مخمّر بخيوط زعفران خراسان الفاخر وعطر يدوم طويلاً.',
  },
  'farang-herbal': {
    name: 'شاي أعشاب فرنغ',
    description: 'منقوع عشبي عطري ومهدّئ بلمسات الأزهار والأعشاب المنتقاة يدوياً.',
  },
  'farkhondeh-herbal': {
    name: 'شاي أعشاب فرخنده',
    description: 'توليفة ناعمة ومنعشة من الأعشاب الإيرانية بعبق الحمضيات وبتلات الورد.',
  },
  'iran-herbal': {
    name: 'شاي أعشاب إيران',
    highlight: 'توليفة أصيلة',
    description: 'نخبة من الأعشاب الإيرانية الأصيلة بعبق الزعفران والهيل والورد المحمدي.',
  },
  'narineh-herbal': {
    name: 'شاي أعشاب نارينه',
    description: 'منقوع فاكهي متوازن بين الحامض والحلو بلون ياقوتي وعبق الرمان الطازج.',
  },
  'shazdeh-herbal': {
    name: 'شاي أعشاب شازده',
    description: 'منقوع عطري متوازن بطابع دافئ ونكهة لطيفة من الأعشاب الجبلية.',
  },
  'lalehzar-herbal': {
    name: 'شاي أعشاب لاله زار',
    description: 'مستوحى من بساتين الورد المحمدي في لاله زار؛ مهدّئ، ناعم وعطري.',
  },
  'green-tea-cold': {
    name: 'شاي أخضر مثلج',
    description: 'شاي أخضر بارد مخمّر بعبق الأوراق الطازجة وطعم صافٍ ومنعش.',
  },
  'iced-saffron-tea': {
    name: 'آيس تي زعفران',
    description: 'شاي مثلج شفاف بخلاصة الزعفران الطازج وعبق لطيف على الثلج.',
  },
  bidmeshk: {
    name: 'شراب بيدمشك',
    description: 'شراب بارد وتقليدي من خلاصة زهر الصفصاف الأصيل؛ مهدّئ ومنعش.',
  },
  'bahar-narenj': {
    name: 'شراب بهار نارنج',
    description: 'مشروب بارد عطري من زهر النارنج الشيرازي بانتعاش طبيعي لطيف.',
  },
  'khiar-sekanjabin': {
    name: 'خيار سكنجبين',
    highlight: 'منعش وأصيل',
    description: 'شراب السكنجبين المنزلي الأصيل مع شرائح الخيار الطازج وأوراق النعناع على الثلج.',
  },
  'peach-iced-tea': {
    name: 'آيس تي خوخ',
    description: 'شاي مثلج فاكهي بنكهة الخوخ الطازج الحلوة والعطرية.',
  },
  matcha: {
    name: 'ماتشا',
    description:
      'شاي أخضر ياباني احتفالي مخفوق بمخفقة الخيزران؛ نقي وغني بمضادات الأكسدة.',
  },
  'matcha-latte': {
    name: 'ماتشا لاتيه',
    description: 'ماتشا يابانية فاخرة مع حليب مبخّر مخملي وعبق أخضر ناعم.',
  },
  'strawberry-matcha': {
    name: 'ماتشا الفراولة',
    highlight: 'الأكثر رواجاً',
    description:
      'طبقات جذابة من مهروس الفراولة الطازجة والحليب البارد وشوت ماتشا نقي على الثلج.',
  },
  'iced-matcha': {
    name: 'آيس ماتشا',
    description: 'ماتشا نقية مخفوقة فوق ماء بارد ومكعبات ثلج شفافة؛ خفيف ومنعش.',
  },
  'iced-matcha-latte': {
    name: 'آيس ماتشا لاتيه',
    description: 'ماتشا احتفالية فوق حليب بارد وثلج بقوام بارد وكريمي.',
  },
  'iced-spirulina': {
    name: 'آيس سبيرولينا',
    description: 'مشروب بارد وطبيعي من السبيرولينا مع حليب مخملي وثلج كريستالي.',
  },
  spirulina: {
    name: 'سبيرولينا لاتيه',
    description: 'لاتيه دافئ وناعم من السبيرولينا بقوام حريري ونكهة متوازنة.',
  },
  'iced-pomegranate-spirulina': {
    name: 'آيس سبيرولينا بالرمان',
    highlight: 'توليفة خاصة',
    description:
      'توليفة طبقية باردة من السبيرولينا مع عصير الرمان الطازج؛ نكهة ملساء ومظهر لافت.',
  },
  'chocolate-milkshake': {
    name: 'ميلك شيك شوكولاتة',
    description:
      'شيك كثيف بآيس كريم الشوكولاتة وصلصة الكاكاو الداكن بقوام كريمي متجانس.',
  },
  'nutella-milkshake': {
    name: 'ميلك شيك نوتيلا',
    description: 'مزيج غني بالآيس كريم الطازج وكريمة البندق نوتيلا مع تزيين الشوكولاتة.',
  },
  'peanut-butter-milkshake': {
    name: 'ميلك شيك زبدة الفول السوداني',
    description: 'شيك كريمي ومغذٍ بزبدة الفول السوداني الطبيعية وآيس كريم الفانيلا.',
  },
  'lotus-milkshake': {
    name: 'ميلك شيك لوتس',
    highlight: 'الأكثر مبيعاً',
    description:
      'شيك مخملي ببسكويت الكراميل لوتس مع قطع البسكويت المقرمشة فوق الكريمة.',
  },
  'pina-colada-milkshake': {
    name: 'ميلك شيك بينا كولادا',
    description: 'توليفة باردة واستوائية من الأناناس الطازج وكريمة جوز الهند والآيس كريم.',
  },
  'espresso-milkshake': {
    name: 'ميلك شيك إسبريسو',
    description: 'شوت إسبريسو طازج ممزوج بآيس كريم الفانيلا لعشاق القهوة والميلك شيك.',
  },
  'berry-milkshake': {
    name: 'ميلك شيك التوت',
    description: 'شيك فاكهي بلون جذاب من مزيج التوت البري والآيس كريم الطازج.',
  },
  'red-love': {
    name: 'ريد لوف',
    description: 'موكتيل ياقوتي فوار بتوليفة الفواكه الحمراء الطازجة وعبق الحمضيات.',
  },
  lemonade: {
    name: 'ليموناضة',
    description: 'عصير ليمون طازج معصور يدوياً بحلاوة متوازنة وثلج مجروش.',
  },
  'brazilian-lemonade': {
    name: 'ليموناضة برازيلية',
    description: 'ليموناضة كريمية ومنعشة باللايم الطازج وقوام مخملي خفيف.',
  },
  mojito: {
    name: 'موهيتو',
    description: 'أوراق النعناع الطازج وشرائح اللايم والصودا الباردة على ثلج وفير.',
  },
  'red-mojito': {
    name: 'ريد موهيتو',
    description: 'موهيتو كلاسيكي ممزوج بخلاصة الفواكه الحمراء لنكهة منعشة وحامضة حلوة.',
  },
  rokato: {
    name: 'روكاتو',
    highlight: 'مميز البار البارد',
    description: 'موكتيل بتوقيع البار البارد في إيوان بتوازن فاكهي فوار ومنعش.',
  },
  'coco-paradise': {
    name: 'كوكو بارادايس',
    description: 'توليفة باردة واستوائية من جوز الهند وفواكه الصيف بعبق ناعم.',
  },
  'green-rush': {
    name: 'غرين راش',
    description: 'موكتيل أخضر منعش بنكهة التفاح الأخضر واللايم والنعناع الطازج.',
  },
};
