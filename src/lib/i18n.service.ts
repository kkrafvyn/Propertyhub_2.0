export interface LanguageConfig {
  code: string;
  name: string;
  nativeName: string;
  region: string;
  direction: 'ltr' | 'rtl';
  dateFormat: string;
  timeFormat: string;
}

export const SUPPORTED_LANGUAGES: Record<string, LanguageConfig> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    region: 'US',
    direction: 'ltr',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
  },
  es: {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    region: 'ES',
    direction: 'ltr',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
  },
  fr: {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    region: 'FR',
    direction: 'ltr',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
  },
  de: {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    region: 'DE',
    direction: 'ltr',
    dateFormat: 'DD.MM.YYYY',
    timeFormat: '24h',
  },
  it: {
    code: 'it',
    name: 'Italian',
    nativeName: 'Italiano',
    region: 'IT',
    direction: 'ltr',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
  },
  pt: {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    region: 'PT',
    direction: 'ltr',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
  },
  ja: {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    region: 'JP',
    direction: 'ltr',
    dateFormat: 'YYYY/MM/DD',
    timeFormat: '24h',
  },
  zh: {
    code: 'zh',
    name: 'Chinese',
    nativeName: '中文',
    region: 'CN',
    direction: 'ltr',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: '24h',
  },
  ar: {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    region: 'SA',
    direction: 'rtl',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
  },
  hi: {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    region: 'IN',
    direction: 'ltr',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
  },
  sw: {
    code: 'sw',
    name: 'Swahili',
    nativeName: 'Kiswahili',
    region: 'KE',
    direction: 'ltr',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
  },
  yo: {
    code: 'yo',
    name: 'Yoruba',
    nativeName: 'Yorùbá',
    region: 'NG',
    direction: 'ltr',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
  },
};

// Translation keys - extend as needed
const translations: Record<string, Record<string, string>> = {
  en: {
    'common.home': 'Home',
    'common.properties': 'Properties',
    'common.listings': 'Listings',
    'common.search': 'Search',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.cancel': 'Cancel',
    'common.submit': 'Submit',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'currency.usd': 'US Dollar',
    'currency.eur': 'Euro',
    'currency.gbp': 'British Pound',
    'currency.ghs': 'Ghana Cedi',
    'currency.ngn': 'Nigerian Naira',
    'properties.bedrooms': 'Bedrooms',
    'properties.bathrooms': 'Bathrooms',
    'properties.price': 'Price',
    'properties.location': 'Location',
    'listing.forSale': 'For Sale',
    'listing.forRent': 'For Rent',
    'listing.forLease': 'For Lease',
    'auth.login': 'Login',
    'auth.signup': 'Sign Up',
    'auth.logout': 'Logout',
    'auth.forgotPassword': 'Forgot Password',
  },
  es: {
    'common.home': 'Inicio',
    'common.properties': 'Propiedades',
    'common.listings': 'Listados',
    'common.search': 'Buscar',
    'common.save': 'Guardar',
    'common.delete': 'Eliminar',
    'common.edit': 'Editar',
    'common.cancel': 'Cancelar',
    'common.submit': 'Enviar',
    'common.loading': 'Cargando...',
    'common.error': 'Error',
    'common.success': 'Éxito',
    'currency.usd': 'Dólar estadounidense',
    'currency.eur': 'Euro',
    'currency.gbp': 'Libra esterlina',
    'properties.bedrooms': 'Dormitorios',
    'properties.bathrooms': 'Baños',
    'properties.price': 'Precio',
    'properties.location': 'Ubicación',
    'listing.forSale': 'En Venta',
    'listing.forRent': 'Se Alquila',
    'listing.forLease': 'Se Arrienda',
    'auth.login': 'Iniciar sesión',
    'auth.signup': 'Registrarse',
    'auth.logout': 'Cerrar sesión',
    'auth.forgotPassword': 'Olvidé mi contraseña',
  },
  fr: {
    'common.home': 'Accueil',
    'common.properties': 'Propriétés',
    'common.listings': 'Annonces',
    'common.search': 'Rechercher',
    'common.save': 'Enregistrer',
    'common.delete': 'Supprimer',
    'common.edit': 'Modifier',
    'common.cancel': 'Annuler',
    'common.submit': 'Soumettre',
    'common.loading': 'Chargement...',
    'common.error': 'Erreur',
    'common.success': 'Succès',
    'currency.usd': 'Dollar américain',
    'currency.eur': 'Euro',
    'currency.gbp': 'Livre sterling',
    'properties.bedrooms': 'Chambres',
    'properties.bathrooms': 'Salles de bain',
    'properties.price': 'Prix',
    'properties.location': 'Emplacement',
    'listing.forSale': 'À Vendre',
    'listing.forRent': 'À Louer',
    'listing.forLease': 'Bail',
    'auth.login': 'Connexion',
    'auth.signup': 'Inscription',
    'auth.logout': 'Déconnexion',
    'auth.forgotPassword': 'Mot de passe oublié',
  },
  ar: {
    'common.home': 'الرئيسية',
    'common.properties': 'العقارات',
    'common.listings': 'القوائم',
    'common.search': 'البحث',
    'common.save': 'حفظ',
    'common.delete': 'حذف',
    'common.edit': 'تحرير',
    'common.cancel': 'إلغاء',
    'common.submit': 'إرسال',
    'common.loading': 'جاري التحميل...',
    'common.error': 'خطأ',
    'common.success': 'نجح',
    'currency.usd': 'الدولار الأمريكي',
    'currency.eur': 'اليورو',
    'properties.bedrooms': 'غرف النوم',
    'properties.bathrooms': 'الحمامات',
    'properties.price': 'السعر',
    'properties.location': 'الموقع',
    'listing.forSale': 'للبيع',
    'listing.forRent': 'للإيجار',
    'auth.login': 'دخول',
    'auth.signup': 'اشتراك',
  },
};

class I18nService {
  private currentLanguage = 'en';

  setLanguage(languageCode: string): void {
    if (SUPPORTED_LANGUAGES[languageCode]) {
      this.currentLanguage = languageCode;
      localStorage.setItem('language', languageCode);
      document.documentElement.lang = languageCode;
      document.documentElement.dir = SUPPORTED_LANGUAGES[languageCode].direction;
    }
  }

  getLanguage(): string {
    return this.currentLanguage;
  }

  getLanguageConfig(): LanguageConfig {
    return SUPPORTED_LANGUAGES[this.currentLanguage];
  }

  getSupportedLanguages(): LanguageConfig[] {
    return Object.values(SUPPORTED_LANGUAGES);
  }

  /**
   * Translate a key with optional parameters
   * Example: t('common.welcome', { name: 'John' })
   */
  t(key: string, params?: Record<string, string | number>): string {
    const lang = translations[this.currentLanguage] || translations.en;
    let text = lang[key] || translations.en[key] || key;

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        text = text.replace(`{{${key}}}`, String(value));
      });
    }

    return text;
  }

  /**
   * Format date according to language preferences
   */
  formatDate(date: Date | string, format?: 'short' | 'long'): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const lang = this.getLanguageConfig();

    if (format === 'long') {
      return new Intl.DateTimeFormat(lang.code, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(d);
    }

    return new Intl.DateTimeFormat(lang.code).format(d);
  }

  /**
   * Format time according to language preferences
   */
  formatTime(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const lang = this.getLanguageConfig();
    const hour12 = lang.timeFormat === '12h';

    return new Intl.DateTimeFormat(lang.code, {
      hour: '2-digit',
      minute: '2-digit',
      hour12,
    }).format(d);
  }

  /**
   * Format number according to language locale
   */
  formatNumber(num: number, style?: 'decimal' | 'percent'): string {
    const lang = this.getLanguageConfig();
    return new Intl.NumberFormat(lang.code, {
      style: style || 'decimal',
    }).format(num);
  }

  /**
   * Get language by region/country code
   */
  getLanguageByRegion(region: string): LanguageConfig | null {
    const regionUpper = region.toUpperCase();
    return (
      Object.values(SUPPORTED_LANGUAGES).find((l) => l.region === regionUpper) || null
    );
  }

  /**
   * Initialize language from browser settings
   */
  initializeFromBrowser(): void {
    const saved = localStorage.getItem('language');
    if (saved && SUPPORTED_LANGUAGES[saved]) {
      this.setLanguage(saved);
      return;
    }

    // Try to detect from browser
    const browserLang = navigator.language.split('-')[0];
    if (SUPPORTED_LANGUAGES[browserLang]) {
      this.setLanguage(browserLang);
    }
  }
}

export const i18nService = new I18nService();
