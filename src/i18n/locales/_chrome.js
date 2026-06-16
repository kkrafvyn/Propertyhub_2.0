import { mergeLocale } from '../mergeLocale.js'

/**
 * Factory for partial locale files — keeps overrides DRY.
 * Each locale file only supplies translated chrome; English fills the rest.
 */
export function coreChrome(localeName, {
  nav = {},
  search = {},
  categories = {},
  footer = {},
  mobile = {},
  home = {},
  filters = {},
  auth = {},
  profile = {},
  language = {},
  common = {},
  listing = {},
} = {}) {
  return {
    localeName,
    nav,
    search,
    categories,
    footer,
    mobile,
    home,
    filters,
    auth,
    profile,
    language,
    common,
    listing,
  }
}

/** Build a locale module from a partials/*.js export. */
export function buildPartialLocale(en, partial) {
  const { localeName, ...rest } = partial
  return mergeLocale(en, coreChrome(localeName, rest))
}
