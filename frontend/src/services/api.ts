import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'

// Базовий URL API бекенду — обов'язково задати через VITE_API_URL
const BASE_URL = import.meta.env.VITE_API_URL
if (!BASE_URL) {
  console.warn('[API] VITE_API_URL не задано! Використовується localhost:8000 для dev')
}

const API_BASE = BASE_URL || 'http://localhost:8000'

function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: API_BASE,
    timeout: 30_000,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  // Interceptor: додаємо initData Telegram в кожен запит
  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const initData = window.Telegram?.WebApp?.initData

    if (initData) {
      config.headers.set('X-Telegram-Init-Data', initData)
      config.headers.set('Authorization', `tma ${initData}`)
    }

    // Додаємо userId якщо доступний
    const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id
    if (userId) {
      config.headers.set('X-User-Id', String(userId))
    }

    return config
  })

  // Interceptor: обробка помилок
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response) {
        const { status, data } = error.response
        console.error(`[API Error] ${status}:`, data)

        if (status === 401) {
          console.warn('[API] Не авторизовано — перевірте initData Telegram')
        }
      } else if (error.request) {
        console.error('[API] Мережева помилка — сервер не відповідає')
      } else {
        console.error('[API] Помилка запиту:', error.message)
      }
      return Promise.reject(error)
    }
  )

  return client
}

const api = createApiClient()

// ========== Бекенд API типи (відповідають backend FastAPI) ==========

export interface CreateItemPayload {
  video_file_id: string
  title: string
  description?: string
  category?: string
  condition: string  // new, like_new, good, fair
}

export interface ItemResponse {
  id: number        // !!! int, не string
  owner_id: number
  video_file_id: string
  title: string
  description: string | null
  category: string | null
  condition: string
  status: string
  created_at: string
}

export interface ItemFeedResponse {
  items: ItemResponse[]
  page: number
  page_size: number
  total: number | null
}

// Для фронтенд-демо-даних (локальне використання)
export interface FeedItem {
  id: number
  title: string
  description: string
  category: string
  condition: string
  videoUrl: string
  thumbnailUrl?: string
  isPro: boolean
  titleKey?: string
  descKey?: string
}

export interface SwipeResponse {
  match_id: number | null
  message: string
}

export interface MatchResponse {
  id: number
  item_a_id: number
  item_b_id: number
  status: string
  created_at: string
}

export interface MatchDetailResponse {
  id: number
  item_a_id: number
  item_b_id: number
  user_a_id: number
  user_b_id: number
  status: string
  created_at: string
}

export interface PaymentInitRequest {
  match_id: number
}

export interface PaymentInitResponse {
  payment_id: number
  match_id: number
  amount: number
  currency: string
  status: string
}

export interface PaymentStatusResponse {
  match_id: number
  user_id: number
  amount: number
  status: string
  provider_payment_id: string | null
}

export interface SubscriptionStatusResponse {
  active: boolean
  start_date: string | null
  end_date: string | null
  auto_renew: boolean
}

export interface SubscriptionCreateResponse {
  subscription_id: number
  amount: number
  currency: string
  status: string
}

export interface ChatUnlockResponse {
  unlocked: boolean
  deep_link: string | null
  message: string
}

export interface AuthResponse {
  token: string
  user_id: number
  telegram_id: number
  first_name: string
  username: string | null
  is_new: boolean
}

export const barterApi = {
  // ===== Аутентифікація =====
  authTelegram: async (initData: string): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/auth/telegram', { init_data: initData })
    return data
  },

  // ===== Товари / Items =====
  createItem: async (payload: CreateItemPayload): Promise<ItemResponse> => {
    const { data } = await api.post<ItemResponse>('/items', payload)
    return data
  },

  getFeed: async (page: number = 1, pageSize: number = 20): Promise<ItemFeedResponse> => {
    const { data } = await api.get<ItemFeedResponse>('/items/feed', {
      params: { page, page_size: pageSize },
    })
    return data
  },

  getItem: async (itemId: number): Promise<ItemResponse> => {
    const { data } = await api.get<ItemResponse>(`/items/${itemId}`)
    return data
  },

  // ===== Свайпи / Swipe =====
  likeItem: async (itemId: number): Promise<SwipeResponse> => {
    const { data } = await api.post<SwipeResponse>('/swipe', { item_id: itemId, direction: 'like' })
    return data
  },

  skipItem: async (itemId: number): Promise<SwipeResponse> => {
    const { data } = await api.post<SwipeResponse>('/swipe', { item_id: itemId, direction: 'pass' })
    return data
  },

  // ===== Матчі / Matches =====
  getMatches: async (statusFilter?: string): Promise<MatchResponse[]> => {
    const { data } = await api.get<MatchResponse[]>('/matches', {
      params: statusFilter ? { status_filter: statusFilter } : {},
    })
    return data
  },

  // ===== Платежі / Payment =====
  getPaymentStatus: async (matchId: number): Promise<PaymentStatusResponse> => {
    const { data } = await api.get<PaymentStatusResponse>(`/payment/status/${matchId}`)
    return data
  },

  initiatePayment: async (matchId: number): Promise<PaymentInitResponse> => {
    const { data } = await api.post<PaymentInitResponse>('/payment/init', { match_id: matchId })
    return data
  },

  // ===== PRO підписка =====
  getProStatus: async (): Promise<SubscriptionStatusResponse> => {
    const { data } = await api.get<SubscriptionStatusResponse>('/subscription/status')
    return data
  },

  subscribePro: async (): Promise<SubscriptionCreateResponse> => {
    const { data } = await api.post<SubscriptionCreateResponse>('/subscription/create', {})
    return data
  },

  // ===== Чат =====
  getChatUnlock: async (matchId: number): Promise<ChatUnlockResponse> => {
    const { data } = await api.get<ChatUnlockResponse>(`/chat/unlock/${matchId}`)
    return data
  },
}

export default api
