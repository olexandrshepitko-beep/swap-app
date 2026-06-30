import { useTelegram } from '../telegram/TelegramProvider'

/**
 * Custom hook to access Telegram user data and initData.
 * Shorthand for useTelegram() but with user-specific extraction.
 */
export function useTelegramData() {
  const { user, initData, isTelegram } = useTelegram()

  return {
    userId: user?.id ?? null,
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    username: user?.username ?? '',
    languageCode: user?.languageCode ?? 'en',
    isPremium: user?.isPremium ?? false,
    initData,
    isTelegram,
    user,
  }
}
