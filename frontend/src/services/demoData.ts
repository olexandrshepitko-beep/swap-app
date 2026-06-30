import type { FeedItem } from './api'

// ========== REAL Product Videos from Pexels ==========
// Кожне відео показує саме те, що описано — безкоштовні стокові матеріали
const VIDEO_URLS: string[] = [
  'https://videos.pexels.com/video-files/8125752/8125752-hd_1080_1920_25fps.mp4',  // 0: ноутбук
  'https://videos.pexels.com/video-files/6624858/6624858-hd_1080_1920_30fps.mp4',  // 1: смартфон
  'https://videos.pexels.com/video-files/8456997/8456997-hd_1080_1920_25fps.mp4',  // 2: навушники
  'https://videos.pexels.com/video-files/7539227/7539227-hd_1080_1920_25fps.mp4',  // 3: кросівки
  'https://videos.pexels.com/video-files/8571776/8571776-hd_1080_2048_25fps.mp4',  // 4: годинник
  'https://videos.pexels.com/video-files/19023512/19023512-hd_1080_1920_30fps.mp4', // 5: камера
  'https://videos.pexels.com/video-files/8847596/8847596-hd_1080_1920_25fps.mp4',  // 6: колонка
  'https://videos.pexels.com/video-files/5406020/5406020-hd_1080_1920_25fps.mp4',  // 7: планшет
  'https://videos.pexels.com/video-files/7934967/7934967-hd_1080_2048_25fps.mp4',  // 8: окуляри
  'https://videos.pexels.com/video-files/9187960/9187960-hd_1080_1920_25fps.mp4',  // 9: кепка
  'https://videos.pexels.com/video-files/3676906/3676906-hd_1080_2048_25fps.mp4',  // 10: іграшка
  'https://videos.pexels.com/video-files/20455949/20455949-hd_1080_1920_30fps.mp4', // 11: велосипед
  'https://videos.pexels.com/video-files/8453909/8453909-hd_1080_2048_25fps.mp4',  // 12: парфуми
  'https://videos.pexels.com/video-files/5094593/5094593-hd_1080_2048_25fps.mp4',  // 13: крісло
  'https://videos.pexels.com/video-files/16542678/16542678-hd_1080_1920_30fps.mp4', // 14: гітара
  'https://videos.pexels.com/video-files/8861901/8861901-hd_1080_1920_25fps.mp4',  // 15: гантелі
  'https://videos.pexels.com/video-files/8247014/8247014-hd_1080_1920_25fps.mp4',  // 16: кільце
  'https://videos.pexels.com/video-files/29788266/12799172_2160_3840_30fps.mp4',   // 17: рюкзак
  'https://videos.pexels.com/video-files/29285339/12630589_2160_3840_30fps.mp4',   // 18: куртка
  'https://videos.pexels.com/video-files/8855209/8855209-hd_1080_1920_30fps.mp4',  // 19: прикраса
]

// ========== Demo Users ==========
export interface DemoUser {
  id: number
  username: string
  avatarUrl: string
  isPro: boolean
}

export const DEMO_USERS: DemoUser[] = [
  { id: 1, username: 'felix_barter', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix', isPro: true },
  { id: 2, username: 'aneka_style', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka', isPro: false },
  { id: 3, username: 'alice_swap', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice', isPro: false },
  { id: 4, username: 'max_barter', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Max', isPro: true },
  { id: 5, username: 'olga_trade', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Olga', isPro: false },
  { id: 6, username: 'dima_exchange', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Dima', isPro: false },
  { id: 7, username: 'lena_swap', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lena', isPro: true },
  { id: 8, username: 'pavel_barter', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Pavel', isPro: false },
  { id: 9, username: 'nina_trade', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nina', isPro: false },
  { id: 10, username: 'artem_swap', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Artem', isPro: true },
  { id: 11, username: 'sveta_barter', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sveta', isPro: false },
  { id: 12, username: 'igor_exchange', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Igor', isPro: false },
]

// ========== Items — описи відповідають тому, що ВИДНО на відео ==========
// Кожен опис точно описує предмет, який демонструється у відповідному відео
const ITEMS_DATA: { title: string; description: string; category: string; condition: string; videoIndex: number }[] = [
  { title: 'Ноутбук', description: 'Робочий ноутбук, екран 15.6 дюймів, швидкий, для роботи й навчання.', category: 'electronics', condition: 'good', videoIndex: 0 },
  { title: 'Смартфон', description: 'Сенсорний екран, розблоковано, всі мережі працюють.', category: 'electronics', condition: 'like_new', videoIndex: 1 },
  { title: 'Бездротові навушники', description: 'Bluetooth 5.2, активне шумозаглушення, заряд на 30 годин.', category: 'electronics', condition: 'like_new', videoIndex: 2 },
  { title: 'Кросівки', description: 'Розмір 43, дихаюча сітка, зручна підошва, трохи носили.', category: 'clothing', condition: 'good', videoIndex: 3 },
  { title: 'Наручний годинник', description: 'Класичний дизайн, шкіряний ремінець, механізм справний.', category: 'other', condition: 'good', videoIndex: 4 },
  { title: 'Цифрова камера', description: 'Full HD відеозйомка, 20 МП, з картою пам\'яті в комплекті.', category: 'electronics', condition: 'good', videoIndex: 5 },
  { title: 'Портативна колонка', description: 'Bluetooth 5.0, вологозахист, глибокий бас, 12 годин роботи.', category: 'electronics', condition: 'new', videoIndex: 6 },
  { title: 'Планшет', description: 'Легкий, яскравий екран, чудово підходить для навчання та розваг.', category: 'electronics', condition: 'like_new', videoIndex: 7 },
  { title: 'Сонцезахисні окуляри', description: 'Поляризаційні лінзи, стильна оправа, футляр у подарунок.', category: 'other', condition: 'new', videoIndex: 8 },
  { title: 'Кепка', description: 'Бавовняна, регульований розмір, універсальний колір.', category: 'clothing', condition: 'new', videoIndex: 9 },
  { title: 'М\'яка іграшка', description: 'Пухнастий ведмідь, висота 35 см, гіпоалергенний наповнювач.', category: 'toys', condition: 'new', videoIndex: 10 },
  { title: 'Велосипед', description: 'Міський, 26 колеса, 7 швидкостей, справний, пройшов ТО.', category: 'sports', condition: 'good', videoIndex: 11 },
  { title: 'Парфумерна вода', description: '50 мл, свіжий аромат, флакон цілий, коробка збережена.', category: 'other', condition: 'new', videoIndex: 12 },
  { title: 'Крісло', description: 'Комфортне, оббивка без пошкоджень, підходить для дому/офісу.', category: 'home', condition: 'good', videoIndex: 13 },
  { title: 'Акустична гітара', description: '6 струн, чудовий звук, без тріщин, чохол у подарунок.', category: 'other', condition: 'good', videoIndex: 14 },
  { title: 'Гантелі набір', description: '2 штуки по 5 кг, гумове покриття, зручний хват.', category: 'sports', condition: 'new', videoIndex: 15 },
  { title: 'Обручка', description: 'Срібло 925, розмір 17, елегантний дизайн.', category: 'other', condition: 'like_new', videoIndex: 16 },
  { title: 'Рюкзак', description: '40 літрів, багато кишень, підходить для походів і навчання.', category: 'other', condition: 'like_new', videoIndex: 17 },
  { title: 'Куртка демісезонна', description: 'Розмір M, водонепроникна, утеплена, ношена акуратно.', category: 'clothing', condition: 'good', videoIndex: 18 },
  { title: 'Прикраса', description: 'Елегантне кольє, біжутерія високої якості, майже нове.', category: 'other', condition: 'like_new', videoIndex: 19 },
]

// ========== Create initial demo items ==========
function createDemoItems(): FeedItem[] {
  return ITEMS_DATA.map((item, i) => ({
    id: i + 1,
    title: item.title,
    description: item.description,
    titleKey: `demo.${i}.title`,
    descKey: `demo.${i}.desc`,
    category: item.category,
    condition: item.condition,
    videoUrl: VIDEO_URLS[item.videoIndex],
    isPro: DEMO_USERS[i % DEMO_USERS.length].isPro,
  }))
}

export const DEMO_ITEMS: FeedItem[] = createDemoItems()

// ========== Demo Matches ==========
export interface DemoMatch {
  id: number
  itemId: number
  matchedItemId: number
  matchedVideoUrl: string
  matchedTitle: string
  matchedDescription: string
  matchedCondition: string
  matchedCategory: string
  status: string
  opponentUsername?: string
  opponentAvatarUrl?: string
}

export const DEMO_MATCHES: DemoMatch[] = [
  {
    id: 1,
    itemId: 1,
    matchedItemId: 5,
    matchedVideoUrl: VIDEO_URLS[4],
    matchedTitle: 'Наручний годинник',
    matchedDescription: 'Класичний дизайн, шкіряний ремінець, механізм справний.',
    matchedCondition: 'good',
    matchedCategory: 'other',
    status: 'pending',
    opponentUsername: 'felix_barter',
    opponentAvatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  },
  {
    id: 2,
    itemId: 3,
    matchedItemId: 12,
    matchedVideoUrl: VIDEO_URLS[11],
    matchedTitle: 'Велосипед',
    matchedDescription: 'Міський, 26 колеса, 7 швидкостей, справний, пройшов ТО.',
    matchedCondition: 'good',
    matchedCategory: 'sports',
    status: 'completed',
    opponentUsername: 'alex_barter',
    opponentAvatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
  },
  {
    id: 3,
    itemId: 7,
    matchedItemId: 9,
    matchedVideoUrl: VIDEO_URLS[4],
    matchedTitle: 'Наручний годинник',
    matchedDescription: 'Класичний дизайн, шкіряний ремінець, механізм справний.',
    matchedCondition: 'good',
    matchedCategory: 'other',
    status: 'paid_user1',
    opponentUsername: 'max_barter',
    opponentAvatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Max',
  },
  {
    id: 4,
    itemId: 2,
    matchedItemId: 15,
    matchedVideoUrl: VIDEO_URLS[14],
    matchedTitle: 'Акустична гітара',
    matchedDescription: '6 струн, чудовий звук, без тріщин, чохол у подарунок.',
    matchedCondition: 'good',
    matchedCategory: 'other',
    status: 'paid_user2',
    opponentUsername: 'olga_trade',
    opponentAvatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Olga',
  },
  {
    id: 5,
    itemId: 4,
    matchedItemId: 20,
    matchedVideoUrl: VIDEO_URLS[5],
    matchedTitle: 'Цифрова камера',
    matchedDescription: 'Full HD відеозйомка, 20 МП, з картою пам\'яті в комплекті.',
    matchedCondition: 'good',
    matchedCategory: 'electronics',
    status: 'pending',
    opponentUsername: 'lena_swap',
    opponentAvatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lena',
  },
  {
    id: 6,
    itemId: 10,
    matchedItemId: 8,
    matchedVideoUrl: VIDEO_URLS[3],
    matchedTitle: 'Кросівки',
    matchedDescription: 'Розмір 43, дихаюча сітка, зручна підошва, трохи носили.',
    matchedCondition: 'good',
    matchedCategory: 'clothing',
    status: 'completed',
    opponentUsername: 'nina_trade',
    opponentAvatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nina',
  },
]

// ========== Generate more items for infinite scroll ==========
let itemCounter = DEMO_ITEMS.length

export function generateMoreItems(count: number): FeedItem[] {
  const newItems: FeedItem[] = []
  for (let i = 0; i < count; i++) {
    itemCounter++
    const template = ITEMS_DATA[Math.floor(Math.random() * ITEMS_DATA.length)]
    const user = DEMO_USERS[Math.floor(Math.random() * DEMO_USERS.length)]
    newItems.push({
      id: itemCounter,
      title: template.title + (Math.random() > 0.7 ? ' ★' : ''),
      description: template.description,
      titleKey: `demo.${template.videoIndex}.title`,
      descKey: `demo.${template.videoIndex}.desc`,
      category: template.category,
      condition: template.condition,
      videoUrl: VIDEO_URLS[template.videoIndex],
      isPro: user.isPro,
    })
  }
  return newItems
}

// ========== Simulate match on like (30% chance) ==========
let matchCounter = DEMO_MATCHES.length

export function simulateMatch(): DemoMatch | null {
  if (Math.random() > 0.3) return null

  matchCounter++
  const opponent = DEMO_USERS[Math.floor(Math.random() * DEMO_USERS.length)]
  const randomItem = DEMO_ITEMS[Math.floor(Math.random() * DEMO_ITEMS.length)]

  const statuses: string[] = ['pending', 'pending', 'pending', 'paid_user1', 'paid_user2', 'completed']
  const status = statuses[Math.floor(Math.random() * statuses.length)]

  return {
    id: matchCounter,
    itemId: randomItem.id,
    matchedItemId: randomItem.id,
    matchedVideoUrl: randomItem.videoUrl,
    matchedTitle: randomItem.title,
    matchedDescription: randomItem.description,
    matchedCondition: randomItem.condition,
    matchedCategory: randomItem.category,
    status,
    opponentUsername: opponent.username,
    opponentAvatarUrl: opponent.avatarUrl,
  }
}
