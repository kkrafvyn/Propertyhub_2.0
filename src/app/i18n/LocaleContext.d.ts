import type { ReactNode } from 'react'

export type TranslateVars = Record<string, string | number>
export type TranslateFn = (key: string, vars?: TranslateVars) => string

export interface LocaleContextValue {
  locale: string
  setLocale: (code: string) => void
  t: TranslateFn
  dir: 'ltr' | 'rtl'
  locales: string[]
  localeReady: boolean
}

export function LocaleProvider(props: { children: ReactNode }): JSX.Element
export function useLocale(): LocaleContextValue
export function useTranslation(): Pick<LocaleContextValue, 't' | 'locale' | 'setLocale' | 'dir' | 'localeReady'>
