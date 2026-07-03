import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'

// Базовый URL API бэкенда — заменить на продакшен URL
const BASE_URL = import.meta.env.VITE_API_URL || 'https://api.barter.app'

function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: BASE_URL,
    timeout: 30_000,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  // Interceptor: добавляем initData Telegram в заголовок каждого запроса
  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const initData = window.Telegram?.WebApp?.initData

    if (initData) {
      config.headers.set('X-Telegram-Init-Data', initData)
      config.headers.set('Authorization', `tma ${initData}`)
    }

    // Добавляем userId если доступен
    const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id
    if (userId) {
      config.headers.set('X-User-Id', String(userId))
    }

    return config
  })

  // Interceptor: обработка ошибок
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response) {
        const { status, data } = error.response
        console.error(`[API Error] ${status}:`, data)

        if (status === 401) {
          // Неавторизован — возможно, неверный initData
          console.warn('[API] Unauthorized — check Telegram initData')
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

// ========== API Methods ==========

export interface CreateItemPayload {
  title: string
  description: string
  category: string
  condition: string
  videoBlob?: Blob
}

export interface CreateItemResponse {
  id: string
  videoUrl: string
  thumbnailUrl?: string
}

export interface FeedItem {
  id: string
  title: string
  description: string
  category: string
  condition: string
  videoUrl: string
  thumbnailUrl?: string
  isPro: boolean
}

export interface MatchResponse {
  id: string
  itemId: string
  matchedItemId: string
  matchedVideoUrl: string
  matchedTitle: string
  matchedDescription: string
  matchedCondition: string
  matchedCategory: string
  status: string
  opponentUsername?: string
  opponentAvatarUrl?: string
}

export interface PaymentRequiredResponse {
  requiresPayment: boolean
  amount: string
  matchId: string
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

export const barterApi = {
  /** Create a new barter item */
  createItem: async (payload: CreateItemPayload): Promise<CreateItemResponse> => {
    const formData = new FormData()
    formData.append('title', payload.title)
    formData.append('description', payload.description)
    formData.append('category', payload.category)
    formData.append('condition', payload.condition)
    if (payload.videoBlob) {
      formData.append('video', payload.videoBlob, 'item_video.mp4')
    }

    const { data } = await api.post<CreateItemResponse>('/items', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  /** Get feed items */
  getFeed: async (page: number = 1, limit: number = 20): Promise<FeedItem[]> => {
    const { data } = await api.get<FeedItem[]>('/feed', {
      params: { page, limit },
    })
    return data
  },

  /** Like / swipe right on an item */
  likeItem: async (itemId: string): Promise<{ match?: MatchResponse }> => {
    const { data } = await api.post<{ match?: MatchResponse }>(`/items/${itemId}/like`)
    return data
  },

  /** Skip / swipe left on an item */
  skipItem: async (itemId: string): Promise<void> => {
    await api.post(`/items/${itemId}/skip`)
  },

  /** Get matches for current user */
  getMatches: async (): Promise<MatchResponse[]> => {
    const { data } = await api.get<MatchResponse[]>('/matches')
    return data
  },

  /** Check payment status for a match (реальный путь бэкенда) */
  getPaymentStatus: async (matchId: string): Promise<PaymentStatusResponse | null> => {
    try {
      const { data } = await api.get<PaymentStatusResponse>(`/payment/status/${matchId}`)
      return data
    } catch {
      return null // 404 = платёж ещё не инициирован
    }
  },

  /** Инициировать оплату матча — возвращает invoice_link для openInvoice() */
  initiatePayment: async (matchId: string): Promise<PaymentInitResponse> => {
    const { data } = await api.post<PaymentInitResponse>('/payment/init', {
      match_id: Number(matchId),
    })
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
}

export default api
