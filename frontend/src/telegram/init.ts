// Инициализация Telegram WebApp SDK
// Этот модуль вызывается при импорте до рендера React дерева

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void
        expand: () => void
        openInvoice: (url: string, callback?: (status: 'paid' | 'cancelled' | 'failed' | 'pending') => void) => void
        enableClosingConfirmation: () => void
        disableClosingConfirmation: () => void
        isExpanded: boolean
        viewportHeight: number
        viewportStableHeight: number
        initData: string
        initDataUnsafe: {
          query_id?: string
          user?: {
            id: number
            first_name: string
            last_name?: string
            username?: string
            language_code?: string
            is_premium?: boolean
          }
          auth_date?: string
          hash?: string
        }
        colorScheme: 'light' | 'dark'
        themeParams: {
          bg_color?: string
          text_color?: string
          hint_color?: string
          link_color?: string
          button_color?: string
          button_text_color?: string
          secondary_bg_color?: string
        }
        MainButton: {
          text: string
          color: string
          textColor: string
          isVisible: boolean
          isActive: boolean
          show: () => void
          hide: () => void
          enable: () => void
          disable: () => void
          setText: (text: string) => void
          onClick: (callback: () => void) => void
          offClick: (callback: () => void) => void
        }
        BackButton: {
          isVisible: boolean
          show: () => void
          hide: () => void
          onClick: (callback: () => void) => void
          offClick: (callback: () => void) => void
        }
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy') => void
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void
          selectionChanged: () => void
        }
        sendData: (data: string) => void
        openTelegramLink: (url: string) => void
        openLink: (url: string) => void
        close: () => void
      }
    }
  }
}

try {
  if (window.Telegram?.WebApp) {
    const webApp = window.Telegram.WebApp
    webApp.ready()
    webApp.expand()
    webApp.enableClosingConfirmation()

    // Set theme colors
    const root = document.documentElement
    const theme = webApp.themeParams
    if (theme.bg_color) root.style.setProperty('--tg-bg-color', theme.bg_color)
    if (theme.text_color) root.style.setProperty('--tg-text-color', theme.text_color)
    if (theme.button_color) root.style.setProperty('--tg-button-color', theme.button_color)
    if (theme.button_text_color) root.style.setProperty('--tg-button-text-color', theme.button_text_color)
    if (theme.secondary_bg_color) root.style.setProperty('--tg-secondary-bg-color', theme.secondary_bg_color)

    console.log('[Telegram] WebApp initialized:', webApp.initDataUnsafe?.user?.id)
  } else {
    console.warn('[Telegram] WebApp SDK not found — running outside Telegram')
  }
} catch (err) {
  console.error('[Telegram] Initialization error:', err)
}

export {}
