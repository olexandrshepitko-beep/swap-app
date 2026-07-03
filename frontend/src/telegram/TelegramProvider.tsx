import React, { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import type { TelegramUser } from './types'

interface TelegramContextValue {
  /** Telegram user data if available */
  user: TelegramUser | null
  /** Raw initData string for backend validation */
  initData: string
  /** Whether the app is running inside Telegram */
  isTelegram: boolean
  /** Show the Telegram MainButton */
  showMainButton: (text: string, onClick: () => void, color?: string) => void
  /** Hide the Telegram MainButton */
  hideMainButton: () => void
  /** Show the Telegram BackButton */
  showBackButton: (onClick: () => void) => void
  /** Hide the Telegram BackButton */
  hideBackButton: () => void
  /** Trigger haptic feedback */
  hapticFeedback: (style?: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') => void
  /** Open a Telegram link internally */
  openTelegramLink: (url: string) => void
  /** Send data back to bot */
  sendData: (data: string) => void
  /**
   * Открыть нативный UI оплаты Telegram. callback вызывается с итоговым
   * статусом, но это ТОЛЬКО для UX (например, показать спиннер) —
   * подтверждение реальной оплаты приходит на бэкенд отдельно, через
   * защищённый /telegram/webhook, а не через этот callback.
   */
  openInvoice: (url: string, callback?: (status: 'paid' | 'cancelled' | 'failed' | 'pending') => void) => void
}

const TelegramContext = createContext<TelegramContextValue | null>(null)

export function useTelegram(): TelegramContextValue {
  const ctx = useContext(TelegramContext)
  if (!ctx) {
    throw new Error('useTelegram must be used within TelegramProvider')
  }
  return ctx
}

function getWebApp() {
  return window.Telegram?.WebApp ?? null
}

export function TelegramProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<TelegramUser | null>(null)
  const [initData, setInitData] = useState('')
  const [isTelegram, setIsTelegram] = useState(false)

  useEffect(() => {
    const webApp = getWebApp()
    if (webApp) {
      setIsTelegram(true)
      setInitData(webApp.initData || '')

      const rawUser = webApp.initDataUnsafe?.user
      if (rawUser) {
        setUser({
          id: rawUser.id,
          firstName: rawUser.first_name,
          lastName: rawUser.last_name ?? null,
          username: rawUser.username ?? null,
          languageCode: rawUser.language_code ?? null,
          isPremium: rawUser.is_premium ?? false,
        })
      }
    }
  }, [])

  const showMainButton = useCallback((text: string, onClick: () => void, color?: string) => {
    const webApp = getWebApp()
    if (!webApp) return
    const btn = webApp.MainButton
    btn.setText(text)
    if (color) btn.color = color
    btn.onClick(onClick)
    btn.show()
    btn.enable()
  }, [])

  const hideMainButton = useCallback(() => {
    const webApp = getWebApp()
    if (!webApp) return
    webApp.MainButton.hide()
  }, [])

  const showBackButton = useCallback((onClick: () => void) => {
    const webApp = getWebApp()
    if (!webApp) return
    webApp.BackButton.onClick(onClick)
    webApp.BackButton.show()
  }, [])

  const hideBackButton = useCallback(() => {
    const webApp = getWebApp()
    if (!webApp) return
    webApp.BackButton.hide()
  }, [])

  const hapticFeedback = useCallback((style: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light') => {
    const webApp = getWebApp()
    if (!webApp) return
    if (style === 'success' || style === 'warning' || style === 'error') {
      webApp.HapticFeedback.notificationOccurred(style)
    } else {
      webApp.HapticFeedback.impactOccurred(style)
    }
  }, [])

  const openTelegramLink = useCallback((url: string) => {
    const webApp = getWebApp()
    if (!webApp) return
    webApp.openTelegramLink(url)
  }, [])

  const sendData = useCallback((data: string) => {
    const webApp = getWebApp()
    if (!webApp) return
    webApp.sendData(data)
  }, [])

  const openInvoice = useCallback(
    (url: string, callback?: (status: 'paid' | 'cancelled' | 'failed' | 'pending') => void) => {
      const webApp = getWebApp()
      if (!webApp) return
      webApp.openInvoice(url, callback)
    },
    []
  )

  return (
    <TelegramContext.Provider
      value={{
        user,
        initData,
        isTelegram,
        showMainButton,
        hideMainButton,
        showBackButton,
        hideBackButton,
        hapticFeedback,
        openTelegramLink,
        sendData,
        openInvoice,
      }}
    >
      {children}
    </TelegramContext.Provider>
  )
}
