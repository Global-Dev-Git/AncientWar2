import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { fallbackLocale, translations, type LocaleKey, type TranslationKey } from '../i18n/translations'

interface TranslationContextValue {
  locale: LocaleKey
  setLocale: (locale: LocaleKey) => void
  t: (key: TranslationKey) => string
}

const TranslationContext = createContext<TranslationContextValue | undefined>(undefined)

const STORAGE_KEY = 'ancient-war-locale'

export const TranslationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<LocaleKey>(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(STORAGE_KEY) as LocaleKey | null
      if (stored && stored in translations) {
        return stored
      }
    }
    return fallbackLocale
  })

  const setLocale = useCallback((next: LocaleKey) => {
    setLocaleState(next)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next)
    }
  }, [])

  const value = useMemo<TranslationContextValue>(() => {
    const dictionary = translations[locale] ?? translations[fallbackLocale]
    const t = (key: TranslationKey) => dictionary[key] ?? translations[fallbackLocale][key]
    return { locale, setLocale, t }
  }, [locale, setLocale])

  return <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>
}

export const useTranslation = () => {
  const context = useContext(TranslationContext)
  if (!context) {
    throw new Error('useTranslation must be used within TranslationProvider')
  }
  return context
}
