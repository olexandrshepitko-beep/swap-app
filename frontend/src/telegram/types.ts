/** Telegram user data extracted from WebApp initData */
export interface TelegramUser {
  id: number
  firstName: string
  lastName: string | null
  username: string | null
  languageCode: string | null
  isPremium: boolean
}

/** Category for barter items */
export type ItemCategory =
  | 'electronics'
  | 'clothing'
  | 'books'
  | 'home'
  | 'sports'
  | 'toys'
  | 'other'

/** Condition of a barter item */
export type ItemCondition = 'new' | 'like_new' | 'good' | 'fair'

/** A barter item from the feed */
export interface BarterItem {
  id: string
  ownerId: number
  title: string
  description: string
  category: ItemCategory
  condition: ItemCondition
  videoUrl: string
  thumbnailUrl?: string
  createdAt: string
  isPro: boolean
}

/** Match between two users */
export interface Match {
  id: string
  itemId: string
  matchedItemId: string
  matchedVideoUrl: string
  matchedTitle: string
  matchedDescription: string
  matchedCondition: ItemCondition
  matchedCategory: ItemCategory
  status: 'pending' | 'paid_user1' | 'paid_user2' | 'completed' | 'expired'
  opponentUsername?: string
  opponentAvatarUrl?: string
}

/** Payment status for a match */
export interface PaymentStatus {
  matchId: string
  currentUserPaid: boolean
  opponentPaid: boolean
  bothPaid: boolean
}
