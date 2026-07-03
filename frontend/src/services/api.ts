import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'

// Базовый URL API бэкенда
const BASE_URL = import.meta.env.VITE_API_URL || 'https://api.barter.app'

// JWT хранится в памяти модуля (не localStorage — для Mini App это ок,
// токен живёт, пока открыта вкладка; получаем заново при каждом старте
// через authTelegram()).
let authToken: string | null = null

export function setAuthToken(token: string | null) {
  authToken = token
}

/** Собрать абсолютный URL до медиа (video_url из ответов бэкенда — относительный путь) */
export function resolveMediaUrl(path: string): string {
  if (path.startsWith('http')) return path
  return `${BASE_URL}${path}`
}

function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: BASE_URL,
    timeout: 30_000,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    // Приоритет 1: JWT, полученный через authTelegram() — быстрее (без
    // повторной HMAC-проверки init_data на каждый запрос).
    if (authToken) {
      config.headers.set('Authorization', `Bearer ${authToken}`)
    }
    // Приоритет 2 (fallback, всегда отправляем на случай истёкшего JWT):
    // сырой init_data, бэкенд провалидирует его сам.
    const initData = window.Telegram?.WebApp?.initData
    if (initData) {
      config.headers.set('X-Telegram-Init-Data', initData)
    }
    return config
  })

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response) {
        const { status, data } = error.response
        console.error(`[API Error] ${status}:`, data)
        if (status === 401) {
          console.warn('[API] Unauthorized — init_data/JWT невалидны или истекли')
        }
      } else if (error.request) {
        console.error('[API] Network error — no response received')
      } else {
        console.error('[API] Request setup error:', error.message)
      }
      return Promise.reject(error)
    }
  )

  return client
}

const api = createApiClient()

// ========== Типы (соответствуют реальным Pydantic-схемам бэкенда) ==========

export interface AuthResponse {
  token: string
  user_id: number
  telegram_id: number
  first_name: string
  username?: string
  is_new: boolean
}

export interface CreateItemPayload {
  title: string
  description: string
  category: string
  condition: string
  videoBlob?: Blob
}

export interface FeedItem {
  id: number
  owner_id: number
  owner_username?: string
  video_url: string
  title: string
  description?: string
  category?: string
  condition: string
  status: string
  created_at: string
}

export interface ItemFeedResponse {
  items: FeedItem[]
  page: number
  page_size: number
  total?: number
}

export interface SwipeResponse {
  match_id?: number
  message: string
}

export interface ReceivedLike {
  swiped_at: string
  liked_item: {
    id: number
    title: string
    video_url: string
    category?: string
    condition: string
  }
  liker_id: number
}

export interface MatchItemInfo {
  id: number
  title: string
  description?: string
  category?: string
  condition: string
  video_url: string
}

export interface MatchOpponentInfo {
  id: number
  username?: string
  first_name: string
}

export interface MatchResponse {
  id: number
  status: string
  created_at: string
  my_item: MatchItemInfo
  their_item: MatchItemInfo
  opponent: MatchOpponentInfo
}

export interface PaymentInitResponse {
  payment_id: number
  match_id: number
  amount: number
  currency: string
  status: string
  invoice_link: string
}

export interface PaymentStatusResponse {
  match_id: number
  user_id: number
  amount: number
  status: 'init' | 'paid' | 'refunded' | 'failed'
  provider_payment_id?: string
}

export interface SubscriptionCreateResponse {
  subscription_id: number
  amount: number
  currency: string
  status: string
  invoice_link: string
}

export interface SubscriptionStatusResponse {
  active: boolean
  start_date?: string
  end_date?: string
  auto_renew: boolean
}

export interface ChatUnlockResponse {
  unlocked: boolean
  deep_link?: string
  message: string
}

export interface TonPaymentInfo {
  address: string
  amount_nanoton: number
  amount_ton: number
  comment: string
}

export interface TonSubscriptionInfo extends TonPaymentInfo {
  subscription_id: number
}

export interface TonVerifyResult {
  verified: boolean
  message: string
}

// ========== API Methods ==========

export const barterApi = {
  /**
   * Обязательно вызвать один раз при старте приложения, ДО любых других
   * запросов: создаёт/обновляет User в БД и выдаёт JWT. Без этого вызова
   * все остальные эндпоинты будут отдавать 401 для нового пользователя —
   * get_current_user не создаёт юзера сам, только ищет существующего.
   */
  authTelegram: async (initData: string): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/auth/telegram', { init_data: initData })
    setAuthToken(data.token)
    return data
  },

  /** Create a new barter item (реальная multipart-загрузка видео) */
  createItem: async (payload: CreateItemPayload): Promise<FeedItem> => {
    const formData = new FormData()
    formData.append('title', payload.title)
    formData.append('description', payload.description)
    formData.append('category', payload.category)
    formData.append('condition', payload.condition)
    if (payload.videoBlob) {
      formData.append('video', payload.videoBlob, 'item_video.mp4')
    }

    const { data } = await api.post<FeedItem>('/items', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  /** Get feed items — реальный путь /items/feed, с пагинацией */
  getFeed: async (page: number = 1, pageSize: number = 20): Promise<ItemFeedResponse> => {
    const { data } = await api.get<ItemFeedResponse>('/items/feed', {
      params: { page, page_size: pageSize },
    })
    return data
  },

  /** Единый свайп (лайк/скип) — реальный контракт бэкенда POST /swipe */
  swipe: async (itemId: number, direction: 'like' | 'pass'): Promise<SwipeResponse> => {
    const { data } = await api.post<SwipeResponse>('/swipe', { item_id: itemId, direction })
    return data
  },

  /** «Меня выбрали» — реальные данные вместо фейкового генератора */
  getReceivedLikes: async (): Promise<ReceivedLike[]> => {
    const { data } = await api.get<ReceivedLike[]>('/swipe/received')
    return data
  },

  /** Get matches for current user (обогащённые — с данными вещей и оппонента) */
  getMatches: async (): Promise<MatchResponse[]> => {
    const { data } = await api.get<MatchResponse[]>('/matches')
    return data
  },

  /** Check payment status for a match */
  getPaymentStatus: async (matchId: number): Promise<PaymentStatusResponse | null> => {
    try {
      const { data } = await api.get<PaymentStatusResponse>(`/payment/status/${matchId}`)
      return data
    } catch {
      return null // 404 = платёж ещё не инициирован
    }
  },

  /** Инициировать оплату матча — возвращает invoice_link для openInvoice() */
  initiatePayment: async (matchId: number): Promise<PaymentInitResponse> => {
    const { data } = await api.post<PaymentInitResponse>('/payment/init', { match_id: matchId })
    return data
  },

  /** Get PRO subscription status */
  getProStatus: async (): Promise<SubscriptionStatusResponse> => {
    const { data } = await api.get<SubscriptionStatusResponse>('/subscription/status')
    return data
  },

  /** Создать заявку на PRO — возвращает invoice_link для openInvoice() */
  subscribePro: async (): Promise<SubscriptionCreateResponse> => {
    const { data } = await api.post<SubscriptionCreateResponse>('/subscription/create')
    return data
  },

  /** Получить deep link на чат, если обе стороны оплатили */
  getChatUnlock: async (matchId: number): Promise<ChatUnlockResponse> => {
    const { data } = await api.get<ChatUnlockResponse>(`/chat/unlock/${matchId}`)
    return data
  },

  // --- TON Connect ---

  getTonPaymentInfo: async (matchId: number): Promise<TonPaymentInfo> => {
    const { data } = await api.get<TonPaymentInfo>(`/payment/ton/info/${matchId}`)
    return data
  },

  verifyTonPayment: async (matchId: number): Promise<TonVerifyResult> => {
    const { data } = await api.post<TonVerifyResult>(`/payment/ton/verify/${matchId}`)
    return data
  },

  getSubscriptionTonInfo: async (): Promise<TonSubscriptionInfo> => {
    const { data } = await api.get<TonSubscriptionInfo>('/subscription/ton/info')
    return data
  },

  verifySubscriptionTonPayment: async (subscriptionId: number): Promise<TonVerifyResult> => {
    const { data } = await api.post<TonVerifyResult>(`/subscription/ton/verify/${subscriptionId}`)
    return data
  },
}

export default api
