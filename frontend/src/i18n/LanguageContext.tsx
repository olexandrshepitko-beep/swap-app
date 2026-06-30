import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { LANGUAGES, translations } from './translations'

export type LangCode = 'en' | 'ru' | 'uk' | 'pl' | 'de' | 'fr' | 'es' | 'zh' | 'ja' | 'ko' | 'kk' | 'be' | 'uz' | 'tg' | 'az' | 'hy' | 'ka' | 'ro' | 'ky' | 'tk' | 'lt' | 'lv' | 'et'

interface LanguageContextType {
  lang: LangCode
  setLang: (code: LangCode) => void
  t: (key: string) => string
  showLanguageSelector: boolean
  setShowLanguageSelector: (show: boolean) => void
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  setLang: () => {},
  t: (key: string) => key,
  showLanguageSelector: false,
  setShowLanguageSelector: () => {},
})

export const useLanguage = () => useContext(LanguageContext)

// Geo-IP -> country code mapping
const COUNTRY_TO_LANG: Record<string, LangCode> = {
  ru: 'ru', by: 'be', kz: 'kk', ua: 'uk', pl: 'pl',
  de: 'de', fr: 'fr', es: 'es', it: 'en', pt: 'en',
  nl: 'en', gb: 'en', us: 'en', ca: 'en', au: 'en',
  cn: 'zh', jp: 'ja', kr: 'ko',
  uz: 'uz', tj: 'tg', az: 'az', am: 'hy', ge: 'ka',
  md: 'ro', kg: 'ky', tm: 'tk',
  lt: 'lt', lv: 'lv', ee: 'et',
  at: 'de', ch: 'de', be: 'fr',
}

// Определяем язык по гео (IP)
async function detectGeoLang(): Promise<LangCode | null> {
  try {
    const res = await fetch('https://ip-api.com/json/?fields=status,countryCode', { signal: AbortSignal.timeout(3000) })
    const data = await res.json()
    if (data?.status === 'success' && data?.countryCode) {
      const cc = data.countryCode.toLowerCase()
      return COUNTRY_TO_LANG[cc] || null
    }
    return null
  } catch {
    return null
  }
}

// Определяем язык по Telegram (fallback)
function detectTelegramLang(): LangCode {
  try {
    const tgLang = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code || ''
    const map: Record<string, LangCode> = {
      ru: 'ru', uk: 'uk', be: 'be', kk: 'kk',
      pl: 'pl', de: 'de', fr: 'fr', es: 'es',
      en: 'en', it: 'en', pt: 'en', nl: 'en',
      zh: 'zh', ja: 'ja', ko: 'ko',
      uz: 'uz', tg: 'tg', az: 'az', hy: 'hy',
      ka: 'ka', ro: 'ro', ky: 'ky', tk: 'tk',
      lt: 'lt', lv: 'lv', et: 'et',
    }
    return map[tgLang.split('-')[0]] || 'en' as LangCode
  } catch {
    return 'en' as LangCode
  }
}

// Определяем язык браузера (последний fallback)
function detectBrowserLang(): LangCode {
  try {
    const navLang = navigator.language.split('-')[0]
    const map: Record<string, LangCode> = {
      ru: 'ru', uk: 'uk', pl: 'pl', de: 'de', fr: 'fr',
      es: 'es', en: 'en', zh: 'zh', ja: 'ja', ko: 'ko',
      kk: 'kk', be: 'be', uz: 'uz', tg: 'tg', az: 'az',
      hy: 'hy', ka: 'ka', ro: 'ro', ky: 'ky', tk: 'tk',
      lt: 'lt', lv: 'lv', et: 'et',
    }
    return map[navLang] || ('en' as LangCode)
  } catch {
    return 'en'
  }
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<LangCode>('en')
  const [showLanguageSelector, setShowLanguageSelector] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('barter_lang') as LangCode | null
    if (saved && LANGUAGES.find(l => l.code === saved)) {
      setLangState(saved)
      return
    }

    // Каскад: Geo → Telegram → Browser → English
    detectGeoLang().then(geoLang => {
      if (geoLang) {
        setLangState(geoLang)
      } else {
        const tgLang = detectTelegramLang()
        if (tgLang !== 'en') {
          setLangState(tgLang)
        } else {
          setLangState(detectBrowserLang())
        }
      }
    })
  }, [])

  const setLang = useCallback((code: LangCode) => {
    setLangState(code)
    localStorage.setItem('barter_lang', code)
    setShowLanguageSelector(false)
  }, [])

  const t = useCallback((key: string): string => {
    const langData = (translations as any)[lang]
    if (langData?.[key]) return langData[key]
    const enData = translations['en']
    return enData?.[key] || key
  }, [lang])

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, showLanguageSelector, setShowLanguageSelector }}>
      {children}

      {/* Language selector modal */}
      {showLanguageSelector && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            animation: 'fadeIn 0.2s ease',
          }}
          onClick={() => setShowLanguageSelector(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#1a1a2e', borderRadius: 20, padding: 24,
              maxWidth: 300, width: '90%',
              maxHeight: '80vh', overflowY: 'auto',
              border: '1px solid rgba(255,255,255,0.1)',
              animation: 'modalPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}>
            <h3 style={{
              fontSize: 18, fontWeight: 700, margin: '0 0 16px',
              color: '#e8e8f0', textAlign: 'center',
            }}>
              🌐 Language
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code as LangCode)}
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: 12,
                    border: lang === l.code
                      ? '1px solid rgba(102,126,234,0.5)'
                      : '1px solid rgba(255,255,255,0.08)',
                    background: lang === l.code
                      ? 'rgba(102,126,234,0.15)'
                      : 'rgba(255,255,255,0.03)',
                    color: lang === l.code ? '#667eea' : '#c0c0d0',
                    fontSize: 14, fontWeight: lang === l.code ? 700 : 500,
                    cursor: 'pointer', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}
                >
                  <span>{l.native}</span>
                  {lang === l.code && (
                    <span style={{ color: '#667eea' }}>✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalPop { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </LanguageContext.Provider>
  )
}
