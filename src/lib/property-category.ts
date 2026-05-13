const PROPERTY_CATEGORY_ALIASES: Record<string, string> = {
  apartment: 'apartment',
  apartments: 'apartment',
  house: 'house',
  houses: 'house',
  office: 'office',
  offices: 'office',
  commercial: 'commercial',
  commercials: 'commercial',
  land: 'land',
  lands: 'land',
}

export function normalizePropertyCategory(value?: string | null): string | undefined {
  if (!value) return undefined

  const normalized = value.trim().toLowerCase()
  return PROPERTY_CATEGORY_ALIASES[normalized] ?? normalized
}
