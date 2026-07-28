/** Mobile shell chrome merged into non-English locales at load time. */
import enMobile from '../en/mobile.js'
import { mergeLocale } from '../../mergeLocale.js'
import { getMobileExtras } from './_mobileExtras.js'

const EN_MOBILE_SHELL = {
  mobile: {
    appShell: enMobile.mobile.appShell,
  },
}
export const MOBILE_CHROME_BY_CODE = {
  ar: {
    mobile: {
      primaryNav: 'التنقل الرئيسي',
      tabletNav: 'تنقل الجهاز اللوحي',
      appShell: {
        availableNow: 'متاح الآن',
        exploreModes: 'استكشف الأنماط',
        browseSales: 'تصفح المبيعات',
        monthlyHomes: 'منازل شهرية',
        shortStays: 'إقامات قصيرة',
        verifiedAgencies: 'وكالات موثّقة',
        contextNav: 'تنقل سياقي',
      },
    },
  },
  fr: {
    mobile: {
      primaryNav: 'Navigation principale',
      tabletNav: 'Navigation tablette',
      appShell: {
        availableNow: 'Disponible maintenant',
        exploreModes: "Modes d'exploration",
        browseSales: 'Parcourir les ventes',
        monthlyHomes: 'Logements mensuels',
        shortStays: 'Séjours courts',
        verifiedAgencies: 'Agences vérifiées',
        contextNav: 'Navigation contextuelle',
      },
    },
  },
  es: {
    mobile: {
      primaryNav: 'Navegación principal',
      tabletNav: 'Navegación en tablet',
      appShell: {
        availableNow: 'Disponible ahora',
        exploreModes: 'Modos de exploración',
        browseSales: 'Ver ventas',
        monthlyHomes: 'Hogares mensuales',
        shortStays: 'Estancias cortas',
        verifiedAgencies: 'Agencias verificadas',
        contextNav: 'Navegación contextual',
      },
    },
  },
  pt: {
    mobile: {
      primaryNav: 'Navegação principal',
      tabletNav: 'Navegação em tablet',
      appShell: {
        availableNow: 'Disponível agora',
        exploreModes: 'Modos de exploração',
        browseSales: 'Ver vendas',
        monthlyHomes: 'Casas mensais',
        shortStays: 'Estadias curtas',
        verifiedAgencies: 'Agências verificadas',
        contextNav: 'Navegação contextual',
      },
    },
  },
  de: {
    mobile: {
      primaryNav: 'Hauptnavigation',
      tabletNav: 'Tablet-Navigation',
      appShell: {
        availableNow: 'Jetzt verfügbar',
        exploreModes: 'Entdeckungsmodi',
        browseSales: 'Verkäufe durchsuchen',
        monthlyHomes: 'Monatliche Wohnungen',
        shortStays: 'Kurzaufenthalte',
        verifiedAgencies: 'Verifizierte Agenturen',
        contextNav: 'Kontextnavigation',
      },
    },
  },
  it: {
    mobile: {
      primaryNav: 'Navigazione principale',
      tabletNav: 'Navigazione tablet',
      appShell: {
        availableNow: 'Disponibile ora',
        exploreModes: 'Modalità di esplorazione',
        browseSales: 'Sfoglia vendite',
        monthlyHomes: 'Case mensili',
        shortStays: 'Soggiorni brevi',
        verifiedAgencies: 'Agenzie verificate',
        contextNav: 'Navigazione contestuale',
      },
    },
  },
  nl: {
    mobile: {
      primaryNav: 'Hoofdnavigatie',
      tabletNav: 'Tabletnavigatie',
      appShell: {
        availableNow: 'Nu beschikbaar',
        exploreModes: 'Verkenningsmodi',
        browseSales: 'Bekijk verkopen',
        monthlyHomes: 'Maandelijkse woningen',
        shortStays: 'Kort verblijf',
        verifiedAgencies: 'Geverifieerde bureaus',
        contextNav: 'Contextnavigatie',
      },
    },
  },
  ru: {
    mobile: {
      primaryNav: 'Основная навигация',
      tabletNav: 'Навигация на планшете',
      appShell: {
        availableNow: 'Доступно сейчас',
        exploreModes: 'Режимы поиска',
        browseSales: 'Смотреть продажи',
        monthlyHomes: 'Аренда на месяц',
        shortStays: 'Краткосрочное проживание',
        verifiedAgencies: 'Проверенные агентства',
        contextNav: 'Контекстная навигация',
      },
    },
  },
  tr: {
    mobile: {
      primaryNav: 'Ana gezinme',
      tabletNav: 'Tablet gezinmesi',
      appShell: {
        availableNow: 'Şimdi müsait',
        exploreModes: 'Keşif modları',
        browseSales: 'Satışlara göz at',
        monthlyHomes: 'Aylık evler',
        shortStays: 'Kısa konaklama',
        verifiedAgencies: 'Doğrulanmış acenteler',
        contextNav: 'Bağlamsal gezinme',
      },
    },
  },
  zh: {
    mobile: {
      primaryNav: '主导航',
      tabletNav: '平板导航',
      appShell: {
        availableNow: '现已上线',
        exploreModes: '探索模式',
        browseSales: '浏览出售',
        monthlyHomes: '月租房源',
        shortStays: '短住',
        verifiedAgencies: '认证中介',
        contextNav: '情境导航',
      },
    },
  },
  hi: {
    mobile: {
      primaryNav: 'मुख्य नेविगेशन',
      tabletNav: 'टैबलेट नेविगेशन',
      appShell: {
        availableNow: 'अभी उपलब्ध',
        exploreModes: 'एक्सप्लोर मोड',
        browseSales: 'बिक्री देखें',
        monthlyHomes: 'मासिक घर',
        shortStays: 'छोटा ठहराव',
        verifiedAgencies: 'सत्यापित एजेंसियाँ',
        contextNav: 'संदर्भ नेविगेशन',
      },
    },
  },
  ja: {
    mobile: {
      primaryNav: 'メインナビ',
      tabletNav: 'タブレットナビ',
      appShell: {
        availableNow: '今すぐ利用可能',
        exploreModes: '探索モード',
        browseSales: '売買を見る',
        monthlyHomes: '月額住宅',
        shortStays: '短期滞在',
        verifiedAgencies: '認証済みエージェンシー',
        contextNav: 'コンテキストナビ',
      },
    },
  },
  ko: {
    mobile: {
      primaryNav: '주요 탐색',
      tabletNav: '태블릿 탐색',
      appShell: {
        availableNow: '지금 이용 가능',
        exploreModes: '탐색 모드',
        browseSales: '매매 보기',
        monthlyHomes: '월세 주택',
        shortStays: '단기 숙박',
        verifiedAgencies: '인증 중개사',
        contextNav: '상황별 탐색',
      },
    },
  },
  vi: {
    mobile: {
      primaryNav: 'Điều hướng chính',
      tabletNav: 'Điều hướng máy tính bảng',
      appShell: {
        availableNow: 'Có sẵn ngay',
        exploreModes: 'Chế độ khám phá',
        browseSales: 'Xem bán',
        monthlyHomes: 'Nhà thuê tháng',
        shortStays: 'Lưu trú ngắn',
        verifiedAgencies: 'Đại lý đã xác minh',
        contextNav: 'Điều hướng theo ngữ cảnh',
      },
    },
  },
  tw: {
    mobile: {
      primaryNav: 'Navigeshɔn kɛse',
      tabletNav: 'Tablet navigeshɔn',
      appShell: {
        availableNow: 'Wɔ hɔ seisei',
        exploreModes: 'Hwɛ kwan ahorow',
        browseSales: 'Hwɛ ntɛntɛn',
        monthlyHomes: 'Fie bosome biara',
        shortStays: 'Tɔn kakra',
        verifiedAgencies: 'Agencies a wɔahwɛ mu',
        contextNav: 'Kontekst navigeshɔn',
      },
    },
  },
  ha: {
    mobile: {
      primaryNav: 'Babban kewayawa',
      tabletNav: 'Kewayawa ta tablet',
      appShell: {
        availableNow: 'Akwai yanzu',
        exploreModes: 'Hanyoyin bincike',
        browseSales: 'Duba tallace-tallace',
        monthlyHomes: 'Gidaje na wata-wata',
        shortStays: 'Zauna gajere',
        verifiedAgencies: 'Hukumomin da aka tabbatar',
        contextNav: 'Kewayawa ta mahallin',
      },
    },
  },
  sw: {
    mobile: {
      primaryNav: 'Urambazaji mkuu',
      tabletNav: 'Urambazaji wa kompyuta kibao',
      appShell: {
        availableNow: 'Inapatikana sasa',
        exploreModes: 'Njia za kuchunguza',
        browseSales: 'Angalia mauzo',
        monthlyHomes: 'Nyumba za kila mwezi',
        shortStays: 'Makazi mafupi',
        verifiedAgencies: 'Mashirika yaliyothibitishwa',
        contextNav: 'Urambazaji wa muktadha',
      },
    },
  },
  yo: {
    mobile: {
      primaryNav: 'Ìtọ́sọ́nà pàtàkì',
      tabletNav: 'Ìtọ́sọ́nà tábìlẹ̀ẹ̀tì',
      appShell: {
        availableNow: 'Wà ní báyìí',
        exploreModes: 'Àwọn ọ̀nà wá',
        browseSales: 'Wo títà',
        monthlyHomes: 'Ilé oṣù',
        shortStays: 'Ìgbà kúkúrú',
        verifiedAgencies: 'Àjọṣepọ̀ tí a jẹ́rìí',
        contextNav: 'Ìtọ́sọ́nà àkóónú',
      },
    },
  },
  ig: {
    mobile: {
      primaryNav: 'Nchọgharị isi',
      tabletNav: 'Nchọgharị tablet',
      appShell: {
        availableNow: 'Dị ugbu a',
        exploreModes: 'Ụdị nyocha',
        browseSales: 'Lelee ire',
        monthlyHomes: 'Ụlọ kwa ọnwa',
        shortStays: 'Nọ nwa oge',
        verifiedAgencies: 'Ụlọ ọrụ akwadoro',
        contextNav: 'Nchọgharị kontekst',
      },
    },
  },
  am: {
    mobile: {
      primaryNav: 'ዋና አሰሳ',
      tabletNav: 'የታብሌት አሰሳ',
      appShell: {
        availableNow: 'አሁን ይገኛል',
        exploreModes: 'የመፈለጊያ ሁነቶች',
        browseSales: 'ሽያጮችን ይመልከቱ',
        monthlyHomes: 'ወርሃዊ ቤቶች',
        shortStays: 'አጭር ቆይታ',
        verifiedAgencies: 'የተረጋገጡ ድርጅቶች',
        contextNav: 'የአውድ አሰሳ',
      },
    },
  },
  pl: {
    mobile: {
      primaryNav: 'Główna nawigacja',
      tabletNav: 'Nawigacja na tablecie',
      appShell: {
        availableNow: 'Dostępne teraz',
        exploreModes: 'Tryby odkrywania',
        browseSales: 'Przeglądaj sprzedaż',
        monthlyHomes: 'Mieszkania miesięczne',
        shortStays: 'Krótkie pobyty',
        verifiedAgencies: 'Zweryfikowane agencje',
        contextNav: 'Nawigacja kontekstowa',
      },
    },
  },
  sv: {
    mobile: {
      primaryNav: 'Huvudnavigering',
      tabletNav: 'Surfplattanavigering',
      appShell: {
        availableNow: 'Tillgängligt nu',
        exploreModes: 'Utforskningslägen',
        browseSales: 'Bläddra försäljning',
        monthlyHomes: 'Månatliga hem',
        shortStays: 'Korttidsboende',
        verifiedAgencies: 'Verifierade byråer',
        contextNav: 'Kontextnavigering',
      },
    },
  },
  uk: {
    mobile: {
      primaryNav: 'Головна навігація',
      tabletNav: 'Навігація планшета',
      appShell: {
        availableNow: 'Доступно зараз',
        exploreModes: 'Режими пошуку',
        browseSales: 'Переглянути продаж',
        monthlyHomes: 'Місячне житло',
        shortStays: 'Короткострокове проживання',
        verifiedAgencies: 'Перевірені агентства',
        contextNav: 'Контекстна навігація',
      },
    },
  },
  id: {
    mobile: {
      primaryNav: 'Navigasi utama',
      tabletNav: 'Navigasi tablet',
      appShell: {
        availableNow: 'Tersedia sekarang',
        exploreModes: 'Mode jelajah',
        browseSales: 'Lihat penjualan',
        monthlyHomes: 'Rumah bulanan',
        shortStays: 'Menginap singkat',
        verifiedAgencies: 'Agen terverifikasi',
        contextNav: 'Navigasi kontekstual',
      },
    },
  },
  ms: {
    mobile: {
      primaryNav: 'Navigasi utama',
      tabletNav: 'Navigasi tablet',
      appShell: {
        availableNow: 'Tersedia sekarang',
        exploreModes: 'Mod teroka',
        browseSales: 'Lihat jualan',
        monthlyHomes: 'Rumah bulanan',
        shortStays: 'Penginapan singkat',
        verifiedAgencies: 'Agensi disahkan',
        contextNav: 'Navigasi konteks',
      },
    },
  },
  th: {
    mobile: {
      primaryNav: 'การนำทางหลัก',
      tabletNav: 'การนำทางแท็บเล็ต',
      appShell: {
        availableNow: 'พร้อมใช้งานตอนนี้',
        exploreModes: 'โหมดสำรวจ',
        browseSales: 'ดูขาย',
        monthlyHomes: 'บ้านรายเดือน',
        shortStays: 'พักสั้น',
        verifiedAgencies: 'เอเจนซี่ที่ยืนยันแล้ว',
        contextNav: 'การนำทางตามบริบท',
      },
    },
  },
  bn: {
    mobile: {
      primaryNav: 'প্রধান নেভিগেশন',
      tabletNav: 'ট্যাবলেট নেভিগেশন',
      appShell: {
        availableNow: 'এখনই উপলব্ধ',
        exploreModes: 'অন্বেষণ মোড',
        browseSales: 'বিক্রয় দেখুন',
        monthlyHomes: 'মাসিক বাড়ি',
        shortStays: 'স্বল্প থাকা',
        verifiedAgencies: 'যাচাইকৃত এজেন্সি',
        contextNav: 'প্রসঙ্গ নেভিগেশন',
      },
    },
  },
  ur: {
    mobile: {
      primaryNav: 'بنیادی نیویگیشن',
      tabletNav: 'ٹیبلٹ نیویگیشن',
      appShell: {
        availableNow: 'اب دستیاب',
        exploreModes: 'تلاش کے طریقے',
        browseSales: 'فروخت دیکھیں',
        monthlyHomes: 'ماہانہ گھر',
        shortStays: 'مختصر قیام',
        verifiedAgencies: 'تصدیق شدہ ایجنسیاں',
        contextNav: 'سیاق و سباق نیویگیشن',
      },
    },
  },
  fa: {
    mobile: {
      primaryNav: 'ناوبری اصلی',
      tabletNav: 'ناوبری تبلت',
      appShell: {
        availableNow: 'اکنون در دسترس',
        exploreModes: 'حالت‌های کاوش',
        browseSales: 'مشاهده فروش',
        monthlyHomes: 'خانه‌های ماهانه',
        shortStays: 'اقامت کوتاه',
        verifiedAgencies: 'آژانس‌های تأییدشده',
        contextNav: 'ناوبری زمینه‌ای',
      },
    },
  },
  ee: {
    mobile: {
      primaryNav: 'Taɖitusi titina',
      tabletNav: 'Tablet taɖitusi',
      appShell: {
        availableNow: 'Le afii',
        exploreModes: 'Kpɔkpɔ ƒe nɔnɔme',
        browseSales: 'Kpɔ dzidzɔkpɔkpɔwo',
        monthlyHomes: 'Aƒi ƒe ɣleti',
        shortStays: 'Ɣeyiɣi kpui',
        verifiedAgencies: 'Agency siwo wokpɔe ŋu',
        contextNav: 'Taɖitusi ƒe nɔnɔme',
      },
    },
  },
  zu: {
    mobile: {
      primaryNav: 'Ukuzulazula okuyinhloko',
      tabletNav: 'Ukuzulazula kwethebulethi',
      appShell: {
        availableNow: 'Kuyatholakala manje',
        exploreModes: 'Izindlela zokuhlola',
        browseSales: 'Buka ukuthengisa',
        monthlyHomes: 'Izindlu zanyanga zonke',
        shortStays: 'Ukuhlala okufushane',
        verifiedAgencies: 'Izikhungo eziqinisekisiwe',
        contextNav: 'Ukuzulazula komongo',
      },
    },
  },
  af: {
    mobile: {
      primaryNav: 'Hoofnavigasie',
      tabletNav: 'Tablet-navigasie',
      appShell: {
        availableNow: 'Beskikbaar nou',
        exploreModes: 'Verkenningsmodusse',
        browseSales: 'Blaai verkope',
        monthlyHomes: 'Maandelikse huise',
        shortStays: 'Kortverblyf',
        verifiedAgencies: 'Geverifieerde agentskappe',
        contextNav: 'Konteksnavigasie',
      },
    },
  },
}

export function getMobileChrome(code) {
  const partial = MOBILE_CHROME_BY_CODE[code] ?? {}
  return mergeLocale(mergeLocale(EN_MOBILE_SHELL, partial), getMobileExtras(code))
}
