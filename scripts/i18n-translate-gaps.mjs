import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import en from '../src/i18n/locales/en.js'
import ar from '../src/i18n/locales/ar.js'
import fr from '../src/i18n/locales/fr.js'
import es from '../src/i18n/locales/es.js'
import pt from '../src/i18n/locales/pt.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const localesDir = join(root, 'src', 'i18n', 'locales')

const OVERRIDES = {
  ar: {
    'nav.compare': 'قارن',
    'nav.saved': 'المحفوظات',
    'nav.listProperty': 'أضف عقارك',
    'footer.support': 'الدعم',
    'footer.helpCentre': 'مركز المساعدة',
    'footer.hosting': 'الاستضافة',
    'footer.company': 'بيت مفتاح',
    'footer.legal': 'قانوني',
    'footer.sitemap': 'خريطة الموقع',
    'mobile.explore': 'استكشف',
    'mobile.search': 'بحث',
    'mobile.saved': 'محفوظ',
    'mobile.inbox': 'الرسائل',
    'mobile.profile': 'الملف',
    'integrations.oauthHint': 'سجّل الدخول عبر Google أو Apple — فعّل المزودين في لوحة Supabase Auth وأضف عناوين إعادة التوجيه.',
    'integrations.paymentsHint': 'الدفع المباشر يتطلب STRIPE_SECRET_KEY أو PAYSTACK_SECRET_KEY في أسرار Edge Functions. حتى ذلك الحين، يعمل الدفع في وضع تجريبي.',
    'integrations.paymentDemo': 'تمت جدولة الدفع في الوضع التجريبي. اضبط أسرار الدفع في Supabase للدفع المباشر.',
    'legal.lastUpdated': 'آخر تحديث: يونيو 2026',
    'legal.privacy.title': 'سياسة الخصوصية',
    'legal.terms.title': 'شروط الخدمة',
    'extensions.crm.advance': 'تقدم',
    'mobile.monthlyRent': 'الإيجار الشهري',
    'mobile.payNow': 'ادفع الآن',
    'mobile.redirecting': 'جاري التوجيه…',
    'mobile.newRequest': 'طلب جديد',
    'mobile.issuePlaceholder': 'صف المشكلة',
    'mobile.submit': 'إرسال',
    'mobile.signed': 'موقّع',
    'mobile.agentPipelineMobile': 'خطك على الجوال',
    'mobile.leaseSigning': 'توقيع العقد',
    'mobile.rentPayments': 'مدفوعات الإيجار',
  },
  fr: {
    'nav.compare': 'Comparer',
    'nav.saved': 'Enregistrés',
    'nav.listProperty': 'Publier un bien',
    'footer.support': 'Assistance',
    'footer.helpCentre': 'Centre d\'aide',
    'footer.hosting': 'Hébergement',
    'footer.company': 'BaytMiftah',
    'footer.legal': 'Mentions légales',
    'footer.sitemap': 'Plan du site',
    'mobile.explore': 'Explorer',
    'mobile.search': 'Rechercher',
    'mobile.saved': 'Favoris',
    'mobile.inbox': 'Messages',
    'mobile.profile': 'Profil',
    'integrations.oauthHint': 'Connectez-vous avec Google ou Apple — activez les fournisseurs dans Supabase Auth et ajoutez les URL de redirection.',
    'integrations.paymentsHint': 'Le paiement en direct nécessite STRIPE_SECRET_KEY ou PAYSTACK_SECRET_KEY dans les secrets Edge Functions. Sinon, mode démo.',
    'integrations.paymentDemo': 'Paiement en file d\'attente (démo). Configurez les secrets Supabase pour le paiement réel.',
    'legal.lastUpdated': 'Dernière mise à jour : juin 2026',
    'legal.privacy.title': 'Politique de confidentialité',
    'legal.terms.title': 'Conditions d\'utilisation',
    'extensions.crm.advance': 'Avancer',
    'mobile.monthlyRent': 'Loyer mensuel',
    'mobile.payNow': 'Payer',
    'mobile.redirecting': 'Redirection…',
    'mobile.newRequest': 'Nouvelle demande',
    'mobile.issuePlaceholder': 'Décrivez le problème',
    'mobile.submit': 'Envoyer',
    'mobile.signed': 'Signé',
    'mobile.agentPipelineMobile': 'Votre pipeline mobile',
    'mobile.leaseSigning': 'Signature du bail',
    'mobile.rentPayments': 'Paiements de loyer',
  },
  es: {
    'nav.compare': 'Comparar',
    'nav.saved': 'Guardados',
    'nav.listProperty': 'Publicar propiedad',
    'footer.support': 'Soporte',
    'footer.helpCentre': 'Centro de ayuda',
    'footer.hosting': 'Anfitrión',
    'footer.company': 'BaytMiftah',
    'footer.legal': 'Legal',
    'footer.sitemap': 'Mapa del sitio',
    'mobile.explore': 'Explorar',
    'mobile.search': 'Buscar',
    'mobile.saved': 'Guardados',
    'mobile.inbox': 'Mensajes',
    'mobile.profile': 'Perfil',
    'integrations.oauthHint': 'Inicia sesión con Google o Apple — habilita proveedores en Supabase Auth y añade URLs de redirección.',
    'integrations.paymentsHint': 'El pago en vivo requiere STRIPE_SECRET_KEY o PAYSTACK_SECRET_KEY en secretos Edge Functions. Hasta entonces, modo demo.',
    'integrations.paymentDemo': 'Pago en cola (demo). Configura secretos en Supabase para checkout real.',
    'legal.lastUpdated': 'Última actualización: junio 2026',
    'legal.privacy.title': 'Política de privacidad',
    'legal.terms.title': 'Términos de servicio',
    'extensions.crm.advance': 'Avanzar',
    'mobile.monthlyRent': 'Alquiler mensual',
    'mobile.payNow': 'Pagar ahora',
    'mobile.redirecting': 'Redirigiendo…',
    'mobile.newRequest': 'Nueva solicitud',
    'mobile.issuePlaceholder': 'Describe el problema',
    'mobile.submit': 'Enviar',
    'mobile.signed': 'Firmado',
    'mobile.agentPipelineMobile': 'Tu pipeline móvil',
    'mobile.leaseSigning': 'Firma del contrato',
    'mobile.rentPayments': 'Pagos de alquiler',
  },
  pt: {
    'nav.compare': 'Comparar',
    'nav.saved': 'Guardados',
    'nav.listProperty': 'Anunciar imóvel',
    'footer.support': 'Suporte',
    'footer.helpCentre': 'Centro de ajuda',
    'footer.hosting': 'Anfitrião',
    'footer.company': 'BaytMiftah',
    'footer.legal': 'Legal',
    'footer.sitemap': 'Mapa do site',
    'mobile.explore': 'Explorar',
    'mobile.search': 'Pesquisar',
    'mobile.saved': 'Guardados',
    'mobile.inbox': 'Mensagens',
    'mobile.profile': 'Perfil',
    'integrations.oauthHint': 'Entre com Google ou Apple — ative fornecedores no Supabase Auth e adicione URLs de redirecionamento.',
    'integrations.paymentsHint': 'Pagamento ao vivo requer STRIPE_SECRET_KEY ou PAYSTACK_SECRET_KEY nos segredos Edge Functions. Até lá, modo demo.',
    'integrations.paymentDemo': 'Pagamento em fila (demo). Configure segredos Supabase para checkout real.',
    'legal.lastUpdated': 'Última atualização: junho 2026',
    'legal.privacy.title': 'Política de privacidade',
    'legal.terms.title': 'Termos de serviço',
    'extensions.crm.advance': 'Avançar',
    'mobile.monthlyRent': 'Renda mensal',
    'mobile.payNow': 'Pagar agora',
    'mobile.redirecting': 'A redirecionar…',
    'mobile.newRequest': 'Novo pedido',
    'mobile.issuePlaceholder': 'Descreva o problema',
    'mobile.submit': 'Enviar',
    'mobile.signed': 'Assinado',
    'mobile.agentPipelineMobile': 'O seu pipeline móvel',
    'mobile.leaseSigning': 'Assinatura do contrato',
    'mobile.rentPayments': 'Pagamentos de renda',
  },
}

function getByPath(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj)
}

function setByPath(obj, path, value) {
  const keys = path.split('.')
  let cur = obj
  for (let i = 0; i < keys.length - 1; i++) {
    cur[keys[i]] = cur[keys[i]] ?? {}
    cur = cur[keys[i]]
  }
  cur[keys[keys.length - 1]] = value
}

function deepMerge(base, patch) {
  const out = { ...base }
  for (const [key, value] of Object.entries(patch)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      out[key] = deepMerge(base[key] ?? {}, value)
    } else if (!(key in base)) {
      out[key] = value
    }
  }
  return out
}

function applyLegalTranslations(locale, localeCode) {
  const legalEn = en.legal
  const privacySections = ['intro', 'collectTitle', 'collectBody', 'useTitle', 'useBody', 'shareTitle', 'shareBody', 'securityTitle', 'securityBody', 'rightsTitle', 'rightsBody', 'contactTitle', 'contactBody']
  const termsSections = ['intro', 'acceptanceTitle', 'acceptanceBody', 'listingsTitle', 'listingsBody', 'paymentsTitle', 'paymentsBody', 'accountsTitle', 'accountsBody', 'liabilityTitle', 'liabilityBody', 'lawTitle', 'lawBody']

  if (localeCode === 'ar') {
    setByPath(locale, 'legal.privacy.intro', 'تشرح هذه السياسة كيفية جمع واستخدام وحماية معلوماتك الشخصية على منصة بيت مفتاح.')
    setByPath(locale, 'legal.terms.intro', 'باستخدام بيت مفتاح فإنك توافق على هذه الشروط.')
  }
  if (localeCode === 'fr') {
    setByPath(locale, 'legal.privacy.intro', 'Cette politique explique comment nous collectons, utilisons et protégeons vos données sur BaytMiftah.')
    setByPath(locale, 'legal.terms.intro', 'En utilisant BaytMiftah, vous acceptez ces conditions.')
  }
  if (localeCode === 'es') {
    setByPath(locale, 'legal.privacy.intro', 'Esta política explica cómo recopilamos, usamos y protegemos su información en BaytMiftah.')
    setByPath(locale, 'legal.terms.intro', 'Al usar BaytMiftah, acepta estos términos.')
  }
  if (localeCode === 'pt') {
    setByPath(locale, 'legal.privacy.intro', 'Esta política explica como recolhemos, usamos e protegemos os seus dados na BaytMiftah.')
    setByPath(locale, 'legal.terms.intro', 'Ao usar a BaytMiftah, concorda com estes termos.')
  }

  for (const s of privacySections) {
    const k = s.endsWith('Title') ? `legal.privacy.${s}` : `legal.privacy.${s}`
    if (getByPath(locale, k) === getByPath(en, k) && localeCode !== 'en') {
      /* keep en body for long legal text in non-ar if not translated — skip */
    }
  }
  void privacySections
  void termsSections
  return locale
}

const targets = [
  { file: 'ar.js', data: ar, code: 'ar', localeName: ar.localeName },
  { file: 'fr.js', data: fr, code: 'fr', localeName: fr.localeName },
  { file: 'es.js', data: es, code: 'es', localeName: es.localeName },
  { file: 'pt.js', data: pt, code: 'pt', localeName: pt.localeName },
]

for (const { file, data, code, localeName } of targets) {
  let merged = deepMerge(data, en)
  for (const [path, value] of Object.entries(OVERRIDES[code] ?? {})) {
    setByPath(merged, path, value)
  }
  merged = applyLegalTranslations(merged, code)
  merged.localeName = localeName
  writeFileSync(join(localesDir, file), `export default ${JSON.stringify(merged, null, 2)}\n`)
  console.log('Translated gaps in', file)
}
