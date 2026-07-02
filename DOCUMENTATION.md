# Barter App — Полная документация проекта

> **Версия:** 1.0.0  
> **Стек:** React 18 + TypeScript 5 + Vite 5 + Telegram Mini App SDK  
> **Архитектура:** SPA с HashRouter, Telegram WebView внутри @Swap_AppBot  
> **Деплой:** GitHub Pages (olexandrshepitko-beep.github.io/swap-app)  
> **Исходники:** XRPLedgercity/barter-app (master) / olexandrshepitko-beep/swap-app (gh-pages)

---

## 1. АРХИТЕКТУРА ПРОЕКТА

### 1.1. Структура файлов

```
barter-app/
├── frontend/
│   ├── src/
│   │   ├── main.tsx                  # Точка входа + глобальные CSS анимации
│   │   ├── App.tsx                   # HashRouter + 7 маршрутов
│   │   │
│   │   ├── telegram/
│   │   │   ├── init.ts              # Инициализация Telegram WebApp SDK
│   │   │   ├── types.ts             # Типы TelegramUser
│   │   │   └── TelegramProvider.tsx  # React Context + 8 методов
│   │   │
│   │   ├── components/
│   │   │   ├── CardSwiper.tsx       # ⭐ Ядро ленты — drag + tap-to-skip
│   │   │   ├── SwipeableCard.tsx    # Устаревшая карточка (не используется в FeedPage)
│   │   │   ├── VideoPlayer.tsx      # Плеер для MatchPage/LikedPage
│   │   │   └── Icons.tsx            # 20 SVG иконок
│   │   │
│   │   ├── pages/
│   │   │   ├── StartPage.tsx        # 3-шаговое онбординг-меню
│   │   │   ├── FeedPage.tsx         # Лента + фильтр категорий + match-модалка
│   │   │   ├── LikedPage.tsx        # 2 таба: "Я выбрал" / "Меня выбрали"
│   │   │   ├── MatchPage.tsx        # Список матчей с видео + статусы
│   │   │   ├── CreateItemPage.tsx   # 3-шаговая форма: видео → описание → публикация
│   │   │   ├── ProPage.tsx          # PRO-подписка
│   │   │   └── PaymentPage.tsx      # Оплата за матч
│   │   │
│   │   ├── services/
│   │   │   ├── api.ts              # Axios-клиент + 14 API методов + 15 типов
│   │   │   └── demoData.ts         # 20 демо-товаров + 6 демо-матчей + генератор
│   │   │
│   │   ├── hooks/
│   │   │   └── useTelegram.ts      # Shorthand для TelegramProvider
│   │   │
│   │   ├── i18n/
│   │   │   ├── translations.ts     # 23 языка, ~3000 строк
│   │   │   └── LanguageContext.tsx  # React Context + Geo/Telegram/Browser детект
│   │   │
│   │   └── styles/
│   │       └── theme.ts            # 45 токенов: цвета, шрифты, радиусы, тени
│   │
│   ├── package.json                # 7 зависимостей, 7 devDependencies
│   ├── vite.config.ts              # Vite 5, base: './'
│   ├── tsconfig.json               # strict: true, ES2020, JSX: react-jsx
│   └── index.html                  # SPA entry
│
├── backend/                        # FastAPI сервер (отдельный проект)
├── Dockerfile
├── .github/workflows/             # CI/CD
└── start-dev.sh
```

### 1.2. Граф зависимостей компонентов

```
main.tsx
 ├── Global CSS (15 @keyframes анимаций)
 ├── HashRouter
 │    └── TelegramProvider (React Context)
 │         └── App (Routes)
 │              ├── "/"           → StartPage          [использует: TelegramProvider, LanguageContext, Icons]
 │              ├── "/feed"       → FeedPage           [использует: CardSwiper, Icons]
 │              │                        └── CardSwiper [внутренний <video>, progress-bar, tap-to-skip]
 │              ├── "/liked"      → LikedPage          [использует: TelegramProvider, LanguageContext, Icons]
 │              │                        └── <video> inline (без VideoPlayer)
 │              ├── "/matches"    → MatchPage          [использует: VideoPlayer, Icons]
 │              │                        └── VideoPlayer
 │              ├── "/create"     → CreateItemPage     [использует: Icons, MediaRecorder]
 │              ├── "/payment/:id"→ PaymentPage        [использует: TelegramProvider, Icons]
 │              └── "/pro"        → ProPage            [использует: TelegramProvider, Icons]
 │
 └── Telegram init (init.ts)      [один раз при загрузке]
```

### 1.3. Поток данных (Data Flow)

```
Telegram WebApp SDK
      │
      ├── init.ts → window.Telegram.WebApp.ready()
      │               → expand()
      │               → setHeaderColor('#0d0d1a')
      │               → onEvent('viewportChanged') → CSS var --app-height
      │
      ├── TelegramProvider.tsx → React Context
      │    ├── user: TelegramUser | null
      │    ├── initData: string
      │    ├── isTelegram: boolean
      │    ├── showMainButton(text, onClick)
      │    ├── hideMainButton()
      │    ├── showBackButton(onClick)
      │    ├── hideBackButton()
      │    ├── hapticFeedback(style)
      │    ├── openTelegramLink(url)
      │    └── sendData(data)
      │
      ├── App.tsx → likedItems: FeedItem[] (состояние в App)
      │    ├── → FeedPage (feed поток)
      │    │     ├── DEMO_ITEMS (20 штук)
      │    │     ├── generateMoreItems (бесконечная загрузка)
      │    │     ├── simulateMatch (30% шанс)
      │    │     └── barterApi.likeItem / skipItem
      │    ├── → LikedPage (выбранные + выбравшие)
      │    └── → MatchPage (список матчей)
      │
      └── api.ts → Axios client
           ├── interceptor: X-Telegram-Init-Data
           ├── interceptor: Authorization: tma {initData}
           └── 14 методов → FastAPI backend
```

---

## 2. КОМПОНЕНТЫ (DETAILED API REFERENCE)

### 2.1. CardSwiper.tsx ⭐ (Ядро ленты)

**Расположение:** `frontend/src/components/CardSwiper.tsx`  
**Особенность:** Это главный интерактивный компонент приложения. Отвечает за всю ленту товаров.

**Пропсы:**
```typescript
interface CardSwiperProps {
  items: FeedItem[]           // Массив товаров для отображения
  currentIndex: number        // Текущий индекс в ленте
  likedCount: number          // Количество лайков (для счетчика)
  onSwipeLeft: (item: FeedItem) => void   // Свайп влево (дизлайк/скип)
  onSwipeRight: (item: FeedItem) => void  // Свайп вправо (лайк)
  onIndexChange: (index: number) => void  // Смена карточки
}
```

**Внутреннее состояние:**
```typescript
swipeX: number          // Смещение по X (drag)
swipeY: number          // Смещение по Y (drag с коэф. 0.3)
isDragging: boolean     // Флаг активного перетаскивания
leaving: boolean        // Анимация ухода карточки
leaveDir: 'left'|'right'|null  // Направление ухода
startX/Y: useRef        // Начальные координаты касания
hasMoved: useRef        // Различение tap vs drag
```

**Логика взаимодействия (два режима):**

**Режим 1: Drag-свайп** (движение пальцем > 15px)
- `hasMoved.current = true` после смещения > 15px
- На `touchEnd` проверяется порог `threshold = 80px`
- `swipeX > 80` → Like (onSwipeRight + анимация ухода вправо)
- `swipeX < -80` → Skip (onSwipeLeft + анимация ухода влево)
- < 80px → возврат на место
- Визуальные индикаторы: 👍 (справа при drag > 50px), 👎 (слева при drag < -50px)

**Режим 2: Tap-to-skip** (касание без движения, как Instagram Stories)
- Если `hasMoved.current = false` на `touchEnd` → чистый тап
- `window.innerWidth / 2` — граница деления экрана
- **Правая половина** → goNext() (следующая карточка)
- **Левая половина** → goPrev() (предыдущая карточка)
- Не вызывает onSwipeLeft/onSwipeRight — чисто навигационное действие
- Progress bar сверху подсвечивает текущий индекс

**Визуальная структура карточки (сверху вниз):**
```
┌─────────────────────────────┐
│ [● ● ● ● ● ○ ○ ○] progress  │ <- 8 сегментов, до 8 items, pointerEvents: none
├─────────────────────────────┤
│  👑 PRO  📱 electronics     │ <- pointerEvents: none
│                             │
│      (video 9:16)           │ <- <video loop muted playsInline autoPlay
│      object-fit: cover      │
│                             │
│  ░░░░░░░░░░░░░░░░░░░░░░░░  │ <- gradient overlay 45%
│                             │
│    Название товара           │ <- pointerEvents: none
│    Описание товара           │ <- 2 строки, text-shadow
│  ┌──────┐  ┌─────────┐     │
│  │ Новый│  │ 🔄 Обмен│     │
│  └──────┘  └─────────┘     │
│                             │
│  ┌──────┐  ┌─────────┐     │
│  │  ✕   │  │    ✓    │     │ <- кнопки Skip/Like (56x56, круглые)
│  └──────┘  └─────────┘     │
│        Хочу отдать          │
│         1/20                │ <- счётчик
└─────────────────────────────┘
```

**Нюансы:**
- `pointerEvents: 'none'` на всех оверлеях — чтобы тач проходил сквозь на video
- `touchAction: 'pan-y'` — блокировка горизонтального скролла при drag
- `willChange: 'transform'` — оптимизация GPU для анимации
- Коэффициент вертикального смещения: 0.3 (при drag вниз карточка слегка уменьшается)

---

### 2.2. VideoPlayer.tsx

**Расположение:** `frontend/src/components/VideoPlayer.tsx`  
**Используется в:** MatchPage, SwipeableCard  
**НЕ используется в:** CardSwiper (там <video> напрямую), LikedPage (там inline <video>)

**Пропсы:**
```typescript
interface VideoPlayerProps {
  src: string                      // URL видео
  style?: React.CSSProperties      // Дополнительные стили
  autoPlay?: boolean               // default: true
  muted?: boolean                  // default: true
  loop?: boolean                   // default: true
  controls?: boolean               // default: false
  poster?: string                  // Постер (не используется)
  className?: string
}
```

**Внутренняя логика:**
```typescript
isLoaded: boolean   // Флаг загрузки (onLoadedData)
hasError: boolean   // Флаг ошибки (onError)
```

**Состояния:**
1. **Загрузка** — спиннер `conic-gradient` с маской radial-gradient
2. **Воспроизведение** — video с opacity: 1, transition 0.3s
3. **Ошибка** — иконка VideoIcon + "Не удалось загрузить видео"

**Autoplay fallback:**
```typescript
// После isLoaded = true:
tryPlay() // пытается video.play()
// Если заблокирован — повтор при первом touchstart/click
document.addEventListener('touchstart', onUserInteraction, { once: true })
document.addEventListener('click', onUserInteraction, { once: true })
```

**Нюанс:** IntersectionObserver удалён в пользу `preload="auto"` и немедленного рендера.

---

### 2.3. Icons.tsx

**Расположение:** `frontend/src/components/Icons.tsx`  
**21 иконка,** все через SVG с единым интерфейсом:

```typescript
interface IconProps {
  size?: number              // default: 24
  color?: string             // default: 'currentColor'
  className?: string
  style?: React.CSSProperties
}
```

**Полный список иконок:**

| Иконка | Размеры по умолчанию | Цвет | Используется в |
|--------|---------------------|------|----------------|
| `HeartIcon` | 24, stroke | currentColor | FeedPage, LikedPage |
| `HeartFilledIcon` | 24, fill | #ff6b9d | — |
| `XIcon` | 24 | currentColor | — |
| `BoltIcon` | 24 | currentColor | FeedPage, StartPage |
| `SparklesIcon` | 24 | currentColor | MatchPage, LikedPage |
| `CrownIcon` | 24 | #FFD700 | StartPage, MatchPage |
| `StarIcon` | 24 | #FFD700 | MatchPage, LikedPage |
| `ChatIcon` | 24 | currentColor | MatchPage, LikedPage |
| `CameraIcon` | 24 | currentColor | StartPage, CreateItemPage |
| `VideoIcon` | 24 | currentColor | VideoPlayer |
| `ArrowLeftIcon` | 24 | currentColor | FeedPage (запасная) |
| `UserIcon` | 24 | currentColor | — |
| `HomeIcon` | 24 | currentColor | — |
| `RefreshIcon` | 24 | currentColor | MatchPage, CreateItemPage |
| `LockIcon` | 24 | currentColor | StartPage, CreateItemPage |
| `HandshakeIcon` | 24 | currentColor | — |
| `CheckIcon` | 24 | #2ed573 | MatchPage |
| `ClockIcon` | 24 | currentColor | MatchPage |
| `WalletIcon` | 24 | currentColor | PaymentPage |
| `SmallHeartIcon` | 12 | #ff6b9d | Анимации |
| `GradientIcon` | wrapper | — | Для градиентных иконок |

**Нюанс:** `GradientIcon` — это контейнер, создающий `<linearGradient id="icon-gradient">`. Дочерние SVG внутри получают `stroke="url(#icon-gradient)"`. Все иконки используют `strokeLinecap="round"` и `strokeLinejoin="round"`.

---

## 3. СТРАНИЦЫ

### 3.1. StartPage — Онбординг

**Маршрут:** `/`  
**Использует:** TelegramProvider (showMainButton), LanguageContext, Icons

**Структура (сверху вниз):**
```
🌐 [язык]           👑 Demo Mode    <- flex row, space-between
      ░░░░░░░                        <- radial-gradient фон, bgPulse анимация
   ⚡ Barter                         <- logoContainer (80x80, rounded 24)
   Меняй вещи без денег              <- fadeUp анимация
┌──────────────────────────────┐
│    👤    🤝    👤            │ <- 2 аватара + handshake
│  Обменивайтесь вещами...      │
│  Никаких денег, только обмен  │
└──────────────────────────────┘
1. Сними видео своей вещи       <- stepStyle с fadeUp
2. Опиши и выбери категорию    <- stepStyle с fadeUp
3. Начни обмениваться!          <- stepStyle с fadeUp
🔒 Ваши данные защищены         <- hint
┌──────────────────────────────┐
│  📷 Загрузить свою вещь      │ <- CameraIcon, ведёт на /create
└──────────────────────────────┘
```

**Анимации (3 штуки):**
- `bgPulse` — фон пульсирует opacity 0.6↔1 (4s infinite alternate)
- `logoFloat` — логотип плывёт -4px↔0 (3s infinite)
- `hueRotate` — hue-rotate 0°↔15°↔0° (3s linear infinite)
- `fadeUp` — появляется снизу с задержкой 0.1s each

**Telegram MainButton:** текст "Смотреть ленту", onClick → navigate('/feed')

**Нюанс:** `containerStyle` имеет `padding: '16px 20px 100px'` — 100px снизу для MainButton.

---

### 3.2. FeedPage — Основная лента

**Маршрут:** `/feed`  
**Использует:** CardSwiper, Icons, barterApi (like/skip), demoData

**Пропсы:**
```typescript
interface FeedPageProps {
  likedItems: FeedItem[]
  onLikedItemsChange: (items: FeedItem[]) => void
}
```

**Структура:**
```
┌─────────────────────────────┐
│ ⚡ Barter · 📱  [📋][❤️ 3][✨]│ <- Категории + кнопки
│                             │
│ ┌─────┐ ┌─────┐ ┌─────┐   │
│ │🔥all│ │📱ел.│ │👕од.│...│   │ <- expandable категории
│ └─────┘ └─────┘ └─────┘   │
│                             │
│       CardSwiper            │ <- flex: 1, justify-content: center
│                             │
│   ✕    Хочу отдать    ✓ 3  │ <- Action buttons
│        1/20                 │ <- Counter
└─────────────────────────────┘
```

**Логика:**
- `items` — отфильтрованный массив по `selectedCategory`
- `loadMore()` при currentIndex > items.length - 3
- `handleSwipeRight` → hapticFeedback('medium') + hearts burst + barterApi.likeItem
- `handleSwipeLeft` → hapticFeedback('light') + barterApi.skipItem
- Match modal при успешном like (реальный или демо с 30%)

**Match Modal:**
```
┌─────────────────────────────┐
│         🎉                  │
│    ITS A MATCH!             │ <- gradient text
│    @felix_barter            │
│  ┌─────────────────────┐   │
│  │ ✨ Смотреть матчи   │   │  <- primary gradient кнопка
│  └─────────────────────┘   │
│  ┌─────────────────────┐   │
│  │ Продолжить просмотр │   │  <- transparent кнопка
│  └─────────────────────┘   │
└─────────────────────────────┘
```

**Нюанс:** `hapticFeedback('light')` на любом выборе категории.

---

### 3.3. LikedPage — Избранное

**Маршрут:** `/liked`  
**Пропсы:**
```typescript
interface LikedPageProps {
  likedItems: FeedItem[]
  onRemoveLiked: (item: FeedItem) => void
}
```

**Два таба:**

**Таб 1: "Я выбрал"** (`i_picked`)
- Grid 2 колонки
- Каждая карточка: video 9:16 + emoji категории + название + описание (60 символов)
- Кнопка "Хочу отдать" (toggle выбора для трейда)
- Кнопка ✕ удалить из избранного
- Если выбран item — появляется hint + кнопка "Смотреть матчи"

**Таб 2: "Меня выбрали"** (`picked_me`)
- Демо-данные (3-6 случайных пользователей)
- Каждая карточка: аватар (инициал в градиенте) + username + PRO бейдж
- Миниатюра их вещи (80×80) + название
- Кнопка "Хочу" → navigate('/matches')

**Генератор `generatePickedMe()`:**
```typescript
function generatePickedMe() {
  const count = 3 + Math.floor(Math.random() * 4)  // 3–6
  // Берёт случайных DEMO_USERS, без повторов
  // Каждый выбирает случайный DEMO_ITEMS
}
```

**Нюанс:** `selectedForTrade` — только один item может быть выбран (state `string | null`).

---

### 3.4. MatchPage — Матчи

**Маршрут:** `/matches`  
**Использует:** VideoPlayer (для каждого матча)

**Структура карточки матча:**
```
┌─────────────────────────────┐
│                             │
│   [video 16:9]              │ <- VideoPlayer с gradient overlay снизу
│                             │
├─────────────────────────────┤
│ Наручный годинник           │
│ Классический дизайн...      │
│ other · good                │
│ ⏳ Ожидание оплаты          │ <- status badge
│ ┌─────────────────────────┐│
│ │ 💬 Открыть чат за 15₽  ││ <- primary button
│ └─────────────────────────┘│
│ ┌─────────────────────────┐│
│ │ F        @felix_barter ⭐││ <- contact info (только completed)
│ └─────────────────────────┘│
└─────────────────────────────┘
```

**Статусы матчей (6 штук):**
| Статус | Цвет | Иконка | Действие кнопки |
|--------|------|--------|-----------------|
| `pending` | #ffa502 | ClockIcon | navigate('/payment/{id}') |
| `paid_user1` | #667eea | StarIcon | navigate('/payment/{id}') |
| `paid_user2` | #764ba2 | StarIcon | navigate('/payment/{id}') |
| `completed` | #2ed573 | CheckIcon | openTelegramLink(@username) |
| `expired` | #ff4757 | LockIcon | — |

**Обработка ошибок аватара:** fallback с инициалом пользователя на градиенте:
```typescript
onError={(e) => {
  (e.target as HTMLImageElement).style.display = 'none'
  // Создаёт <div> с первой буквой username на gradient background
}}
```

**Нюанс:** VideoPlayer в MatchPage — `muted={true}`, `loop={true}`, `autoPlay={true}`

---

### 3.5. CreateItemPage — Создание объявления

**Маршрут:** `/create`  
**3 шага:** Step 1 (видео) → Step 2 (описание) → Step 3 (публикация)

**Progress bar:**
```
[████████████░░░░░░░░░░]  1/3
```

**Step 1 — Запись видео:**
- Два режима:
  - **Запись с камеры:** MediaRecorder + getUserMedia (facingMode: 'environment', 720p)
  - **Загрузка из галереи:** file input → createObjectURL
- Лимит: 50MB, автостоп через 15 секунд
- Preview после записи с кнопкой "Снять заново"
- Bugfix: `setIsRecording(true)` до `getUserMedia` (Telegram WebView)

**Key fix для камеры:**
```typescript
// 1. Показать <video> элемент (чтобы ref был)
setIsRecording(true)
// 2. Потом получить stream
const stream = await navigator.mediaDevices.getUserMedia(...)
// 3. И только потом play
if (videoRef.current) {
  videoRef.current.srcObject = stream
  videoRef.current.play().catch(() => {})
}
```

**Step 2 — Описание:**
- Название (required, 100 символов)
- Описание (optional, 500 символов)
- Категория (7 шт., chip-style grid)
- Состояние (4 шт., chip-style grid)

**Step 3 — Публикация:**
- Lock icon + privacy info
- Сводка (название, категория, состояние)
- Кнопка "Опубликовать" → navigate('/feed')

**Нюансы:**
- MainButton динамически меняет цвет: если поле не заполнено → `#555` (серый)
- `videoRef` переиспользуется для preview и записи
- Blob хранится для отправки на сервер

---

### 3.6. ProPage — PRO Подписка

**Маршрут:** `/pro`  
**Статус:** Базовая страница с информацией о подписке

---

### 3.7. PaymentPage — Оплата

**Маршрут:** `/payment/:matchId`  
**Статус:** Базовая страница с информацией о платеже

---

## 4. TELEGRAM ИНТЕГРАЦИЯ

### 4.1. init.ts — Инициализация SDK

**Выполняется:** 1 раз при загрузке main.tsx (до React)

**Последовательность:**
```
1. Проверка: window.Telegram?.WebApp
2. webApp.ready()           — сообщаем Telegram что приложение готово
3. webApp.expand()          — расширяем на весь экран
4. webApp.enableClosingConfirmation() — подтверждение закрытия
5. webApp.setHeaderColor('#0d0d1a')  — цвет заголовка Telegram
6. CSS var --app-height = viewportStableHeight пикселей
7. Подписка на viewportChanged: обновление --app-height при стабилизации
8. Тема: bg_color, text_color, button_color, button_text_color, secondary_bg_color
```

**Функция `updateViewportHeight(webApp: any)`:**
```typescript
// Читает viewportStableHeight из Telegram SDK
// Устанавливает CSS переменную --app-height
// Используется как fallback: var(--app-height, 100vh)
```

**Глобальные типы (declare global):**
```typescript
interface Window {
  Telegram?: {
    WebApp: {
      ready, expand, setHeaderColor
      isExpanded, viewportHeight, viewportStableHeight
      initData, initDataUnsafe
      colorScheme, themeParams
      MainButton, BackButton, HapticFeedback
      onEvent, offEvent
      sendData, openTelegramLink, openLink, close
      // + все пропущенные методы
    }
  }
}
```

### 4.2. TelegramProvider.tsx — React Context

**Провайдер:** `TelegramProvider` оборачивает всё приложение.

**Публичные методы (8 штук):**

```typescript
user: TelegramUser | null      // { id, firstName, lastName, username, languageCode, isPremium }
initData: string               // Сырая строка init data
isTelegram: boolean            // true внутри Telegram, false вне

showMainButton(text, onClick, color?)  // Показать MainButton
hideMainButton()                       // Скрыть
showBackButton(onClick)                // Показать BackButton
hideBackButton()                       // Скрыть
hapticFeedback(style)                  // 'light'|'medium'|'heavy'|'success'|'warning'|'error'
openTelegramLink(url)                  // Открыть ссылку внутри Telegram
sendData(data)                         // Отправить данные боту
```

**Особенности:**
- `showMainButton` не очищает предыдущие onClick — нужна осторожность при переиспользовании
- `hapticFeedback` делегирует в `notificationOccurred` или `impactOccurred` в зависимости от стиля
- Все методы имеют guard: `if (!webApp) return`

### 4.3. useTelegram.ts — Хук-сокращение

```typescript
export function useTelegramData() {
  const { user, initData, isTelegram } = useTelegram()
  return {
    userId, firstName, lastName, username,
    languageCode, isPremium, initData, isTelegram, user
  }
}
```

---

## 5. API СЛОЙ

### 5.1. api.ts — Axios Client

**Базовый URL:** `import.meta.env.VITE_API_URL || 'http://localhost:8000'`

**Интерсепторы запросов (2):**
```typescript
// 1. X-Telegram-Init-Data — для аутентификации
config.headers.set('X-Telegram-Init-Data', initData)
// 2. Authorization: tma {initData}
config.headers.set('Authorization', `tma ${initData}`)
// 3. X-User-Id — для идентификации
config.headers.set('X-User-Id', String(userId))
```

**Типы (14 штук):**

| Тип | Поля | Назначение |
|-----|------|------------|
| `CreateItemPayload` | video_file_id, title, description?, category?, condition | Создание товара |
| `ItemResponse` | id, owner_id, video_file_id, title, description, category, condition, status, created_at | Ответ товара |
| `ItemFeedResponse` | items[], page, page_size, total | Пагинированная лента |
| `FeedItem` | id, title, description, category, condition, videoUrl, thumbnailUrl?, isPro, titleKey?, descKey? | Фронтенд-модель |
| `SwipeResponse` | match_id, message | Результат свайпа |
| `MatchResponse` | id, item_a_id, item_b_id, status, created_at | Матч |
| `MatchDetailResponse` | +user_a_id, +user_b_id | Детали матча |
| `PaymentInitRequest` | match_id | Запрос оплаты |
| `PaymentInitResponse` | payment_id, match_id, amount, currency, status | Ответ оплаты |
| `PaymentStatusResponse` | match_id, user_id, amount, status, provider_payment_id | Статус |
| `SubscriptionStatusResponse` | active, start_date, end_date, auto_renew | PRO статус |
| `SubscriptionCreateResponse` | subscription_id, amount, currency, status | Создание подписки |
| `ChatUnlockResponse` | unlocked, deep_link, message | Разблокировка чата |
| `AuthResponse` | token, user_id, telegram_id, first_name, username, is_new | Аутентификация |

**Методы API (12):**
```typescript
barterApi.authTelegram(initData)        → AuthResponse
barterApi.createItem(payload)           → ItemResponse
barterApi.getFeed(page, pageSize)       → ItemFeedResponse
barterApi.getItem(itemId)               → ItemResponse
barterApi.likeItem(itemId)              → SwipeResponse
barterApi.skipItem(itemId)              → SwipeResponse
barterApi.getMatches(statusFilter?)     → MatchResponse[]
barterApi.getPaymentStatus(matchId)     → PaymentStatusResponse
barterApi.initiatePayment(matchId)      → PaymentInitResponse
barterApi.getProStatus()                → SubscriptionStatusResponse
barterApi.subscribePro()                → SubscriptionCreateResponse
barterApi.getChatUnlock(matchId)        → ChatUnlockResponse
```

---

## 6. ДЕМО-ДАННЫЕ

### 6.1. demoData.ts

**20 товаров** с реальными Pexels видео:

| # | Товар | Видео (Pexels) |
|---|-------|----------------|
| 0 | Ноутбук | laptop demo |
| 1 | Смартфон | phone demo |
| 2 | Наушники | headphones |
| ... | ... | ... |
| 19 | Прикраса | jewelry |

**6 демо-матчей** с разными статусами (pending, completed, paid_user1, paid_user2)

**Генератор бесконечной ленты:**
```typescript
generateMoreItems(count: number): FeedItem[]
// Берёт случайный шаблон из ITEMS_DATA + случайного пользователя из DEMO_USERS
// itemCounter глобальный, инкрементируется
```

**Симулятор матча:**
```typescript
simulateMatch(): DemoMatch | null
// 30% шанс вернуть матч
// Случайный оппонент + случайный товар
// Случайный статус (weighted: pending чаще)
```

---

## 7. ИНТЕРНАЦИОНАЛИЗАЦИЯ (i18n)

### 7.1. LanguageContext.tsx

**Детекция языка (каскад из 3 источников):**
1. `localStorage.getItem('barter_lang')` — если сохранён ранее
2. **Geo IP** → `ip-api.com/json/?fields=status,countryCode` (3s timeout)
3. **Telegram** → `window.Telegram.WebApp.initDataUnsafe.user.language_code`
4. **Browser** → `navigator.language`
5. Fallback: `'en'`

**23 языка:**
en, ru, uk, pl, de, fr, es, zh, ja, ko, kk, be, uz, tg, az, hy, ka, ro, ky, tk, lt, lv, et

**Функция `t(key)`:** ищет в текущем языке → fallback в English → возвращает key

**Языковой селектор:** модальное окно с 23 кнопками, сохранение в localStorage.

### 7.2. translations.ts

~3000 строк переводов. English — мастер-язык. Все остальные — переопределения.

**Ключи:** `start.*`, `feed.*`, `create.*`, `match.*`, `liked.*`, `condition.*`, `pro.*`, `payment.*`, `common.*`, `demo.*`

---

## 8. СТИЛИ И ТЕМА

### 8.1. theme.ts — Design Tokens (20 colors, 2 fonts, 5 radii, 4 shadows, 2 animations = 33 токена)

```typescript
colors: {
  bg: '#0d0d1a',                    // Основной фон
  bgCard: '#16162a',                // Фон карточек
  primary: '#667eea',               // Основной синий
  secondary: '#764ba2',             // Фиолетовый
  accent: '#ff6b9d',                // Акцент розовый (like)
  danger: '#ff4757',                // Ошибка (red)
  success: '#2ed573',               // Успех (green)
  warning: '#ffa502',               // Предупреждение (orange)
  text: '#e8e8f0',                  // Основной текст
  textSecondary: '#8888b0',         // Вторичный текст
  textMuted: '#5a5a7a',             // Третичный текст
  gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  gradientAccent: 'linear-gradient(135deg, #ff6b9d 0%, #ff4757 100%)',
  glowPurple: '0 0 20px rgba(102,126,234,0.3)',
  glowPink: '0 0 20px rgba(255,107,157,0.3)',
}
```

**Радиусы:** 8, 12, 16, 24, 999
**Тени:** sm/md/lg/glow
**Анимации:** spring (`cubic-bezier(0.34, 1.56, 0.64, 1)`), smooth (`cubic-bezier(0.4, 0, 0.2, 1)`)

### 8.2. Глобальные CSS (main.tsx)

**15 @keyframes анимаций:**
| Название | Описание |
|----------|----------|
| `spin` | Вращение 360° (спиннер) |
| `bgPulse` | Пульсация фона 0.6↔1 |
| `fadeUp` | Появление снизу (12px) |
| `heartBurst` | Разлёт сердечек (CSS vars dx/dy) |
| `shake` | Тряска (для ошибок) |
| `matchModalIn` | Scale+translate модалки |
| `fadeInOverlay` | Появление оверлея |
| `sparkleFloat` | Искры вверх |
| `hueRotate` | Hue-rotation 15° |
| `logoFloat` | Логотип вверх-вниз |
| `pulse` | Пульсация opacity |

**Глобальные стили:**
- `-webkit-tap-highlight-color: transparent` — убрать серый квадрат при тапе
- `button:active { transform: scale(0.95) }` — микро-анимация нажатия
- Scrollbar кастомный (4px, primary-color thumb)
- Selection: primary-color с 30% alpha

---

## 9. ДЕТАЛЬНАЯ ЛОГИКА СВАЙПОВ

### 9.1. Drag-свайп (основной)

```
TouchStart → запоминаем startX, startY, hasMoved=false
     │
TouchMove → вычисляем dx, dy
     │
     ├── |dx| > 15 || |dy| > 15 → hasMoved=true
     ├── |dx| > 10 → e.preventDefault() (блокируем скролл)
     │
     └── setSwipeX(dx), setSwipeY(dy * 0.3)
          │
          ├── swipeX > 50 → показать 👍 (справа)
          ├── swipeX < -50 → показать 👎 (слева)
          └── opacity = max(1 - |swipeX|/600, 0.85)
              rotation = swipeX * 0.05
              scale = min(1, 1 - |swipeY|/2000)
               transition: 'none' (плавный drag)
     │
TouchEnd → проверка
     │
     ├── hasMoved=true, swipeX > 80 → LIKE
     │    → setLeaveDir('right'), setLeaving(true)
     │    → 250ms анимация ухода вправо
     │    → onSwipeRight(item) + goNext()
     │
     ├── hasMoved=true, swipeX < -80 → SKIP
     │    → setLeaveDir('left'), setLeaving(true)
     │    → 250ms анимация ухода влево
     │    → onSwipeLeft(item) + goNext()
     │
     ├── hasMoved=true, |swipeX| ≤ 80 → возврат (SwipeX=0)
     │
     └── hasMoved=false → TAP (см. ниже)
```

### 9.2. Tap-to-skip (Instagram Stories)

```
TouchEnd (hasMoved=false)
     │
     ├── clientX >= window.innerWidth / 2
     │    → ПРАВО: goNext() (следующая карточка)
     │
     └── clientX < window.innerWidth / 2
          → ЛЕВО: goPrev() (предыдущая карточка)
```

**Особенности:**
- Тап НЕ вызывает API (onSwipeLeft/onSwipeRight) — чисто навигация
- goNext/goPrev вызывают onIndexChange(newIndex)
- Если текущий последний элемент — goNext ничего не делает
- Если первый элемент — goPrev ничего не делает
- Progress bar обновляется автоматически через items[currentIndex]

### 9.3. Анимация ухода карточки

```typescript
// leaving = true
leaveDir === 'right':
  transform: translate3d(600px, swipeY, 0) rotate(20deg) scale(0.9)
  opacity: 0
leaveDir === 'left':
  transform: translate3d(-600px, swipeY, 0) rotate(-20deg) scale(0.9)
  opacity: 0
transition: 'transform 0.25s ease-out, opacity 0.25s ease-out'
```

---

## 10. КОНФИГУРАЦИЯ

### 10.1. Vite Config (vite.config.ts)
```typescript
base: './'                    // Относительные пути для Telegram WebView
build.outDir: 'dist'
server.port: 5173
```

### 10.2. TypeScript Config (tsconfig.json)
```json
strict: true
target: ES2020
jsx: "react-jsx"
baseUrl: "."
paths: { "@/*": ["src/*"] }
noUnusedLocals: false
noUnusedParameters: false
```

### 10.3. Package.json
**Core:** react 18.3.1, react-router-dom 6.26.2, axios 1.7.7  
**Telegram:** @telegram-apps/sdk 1.1.2, @tonconnect/ui-react 2.0.7  
**TON:** ton 13.9.0  
**Build:** Vite 5.4.3, TypeScript 5.5.4  
**Test:** Vitest 2.0.5, Playwright 1.47.0, jsdom

---

## 11. ДЕПЛОЙ

### 11.1. GitHub Pages (olexandrshepitko-beep.github.io/swap-app)

**Процесс:**
```bash
# 1. Сборка
cd frontend && npm run build   # → dist/

# 2. Копирование в swap-app
cd ~/swap-app
rm -rf assets index.html
cp -r ~/barter-app/frontend/dist/* .

# 3. Коммит + пуш
git add -A
git commit -m "feat: ..."
git push origin gh-pages --force
```

**Репозитории:**
- **Source:** `github.com/XRPLedgercity/barter-app` (master)
- **Pages:** `github.com/olexandrshepitko-beep/swap-app` (gh-pages)

**Бот:** `@Swap_AppBot` (ID: 8254608681)  
**WebApp URL:** `https://olexandrshepitko-beep.github.io/swap-app/`

### 11.2. Railway (backend)
- 589 сервис: `589-production.up.railway.app`
- FastAPI backend, отдельный Dockerfile

---

## 12. ВЗАИМОСВЯЗИ И НЮАНСЫ

### 12.1. Критические зависимости файлов

```
main.tsx
  ↓ импорт (side-effect)
init.ts → window.Telegram.WebApp
  ↓
TelegramContext.Provider
  ↓ useContext
App.tsx → FeedPage, LikedPage, MatchPage, CreateItemPage
  ↓
LanguageContext.Provider
  ↓ useContext
Все страницы
```

### 12.2. Состояние в App.tsx
```typescript
const [likedItems, setLikedItems] = useState<FeedItem[]>([])
// Передаётся в:
//   FeedPage  → добавляет при like
//   LikedPage → удаляет при remove
// НЕ сохраняется между сессиями (нет localStorage/backend)
```

### 12.3. Два видео-плеера — разные реализации

**CardSwiper (FeedPage):**
- `<video>` напрямую, без обёртки
- `pointerEvents: 'none'` — тач проходит на CardSwiper
- Управление через videoRefs.useRef

**VideoPlayer (MatchPage, LikedPage):**
- Компонент-обёртка с состояниями загрузки/ошибки
- Spinner при загрузке
- Fallback при ошибке
- Autoplay с retry по тапу

### 12.4. Telegram MainButton vs обычные кнопки

- **StartPage:** MainButton "Смотреть ленту" (Telegram-native)
- **CreateItemPage:** MainButton динамически меняется (Next/Publish)
- **FeedPage:** HTML-кнопки ✕ и ✓
- **LikedPage:** HTML-кнопки
- **MatchPage:** HTML-кнопки

### 12.5. Потенциальные проблемы

1. **MainButton onClick не очищается** — при переиспользовании showMainButton может накапливать колбеки
2. **init.ts updateViewportHeight(webApp) не работает вне Telegram** — guard есть, но fallback `100vh`
3. **VideoPlayer autoplay может не сработать** — iOS Safari блокирует без user interaction
4. **MediaRecorder не поддерживается** в некоторых WebView — ошибка обрабатывается через alert
5. **lazy import tonpoker** — не в этом проекте, но в 589
6. **CardSwiper tap не сработает на кнопках** — pointerEvents: 'none' на info overlay
7. **generatePickedMe регенерируется каждый рендер** — использует useState с initial function

---

## 13. ИНДЕКС ФАЙЛОВ (QUICK REFERENCE)

| # | Путь | Строк | Функция |
|---|------|-------|---------|
| 1 | `main.tsx` | 130 | Entry + global CSS |
| 2 | `App.tsx` | 60 | Routes + likedItems state |
| 3 | `init.ts` | 131 | Telegram SDK init |
| 4 | `TelegramProvider.tsx` | 136 | React Context for TG API |
| 5 | `types.ts` | мал | TelegramUser type |
| 6 | `CardSwiper.tsx` | 334 | ⭐ Feed swiper + tap-to-skip |
| 7 | `SwipeableCard.tsx` | 279 | ⚠️ Deprecated card |
| 8 | `VideoPlayer.tsx` | 129 | Video component |
| 9 | `Icons.tsx` | 180 | 20 SVG icons |
| 10 | `StartPage.tsx` | 321 | Onboarding |
| 11 | `FeedPage.tsx` | 382 | Main feed |
| 12 | `LikedPage.tsx` | 382 | Two-tab favorites |
| 13 | `MatchPage.tsx` | 381 | Match list |
| 14 | `CreateItemPage.tsx` | 677 | 3-step creation |
| 15 | `ProPage.tsx` | — | PRO subscription |
| 16 | `PaymentPage.tsx` | — | Payment |
| 17 | `api.ts` | 251 | Axios client + 14 methods |
| 18 | `demoData.ts` | 239 | Demo items/matches |
| 19 | `useTelegram.ts` | 21 | Hook shorthand |
| 20 | `translations.ts` | 3057 | 23 languages |
| 21 | `LanguageContext.tsx` | 192 | i18n provider |
| 22 | `theme.ts` | 45 | Design tokens |

---

*Документация составлена: 02.07.2026  
Актуально для коммита 3733453 (barter-app) / 035f862 (swap-app gh-pages)*
