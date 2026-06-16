/**
 * Factory for partial locale files — keeps overrides DRY.
 * Each locale file only supplies translated chrome; English fills the rest.
 */
export function coreChrome(localeName, {
  nav = {},
  search = {},
  categories = {},
  mobile = {},
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
    mobile,
    auth,
    profile,
    language,
    common,
    listing,
  }
}
