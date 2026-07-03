import React, { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import StartPage from './pages/StartPage'
import CreateItemPage from './pages/CreateItemPage'
import FeedPage from './pages/FeedPage'
import MatchPage from './pages/MatchPage'
import LikedPage from './pages/LikedPage'
import PaymentPage from './pages/PaymentPage'
import ProPage from './pages/ProPage'
import type { FeedItem } from './services/api'
import { barterApi } from './services/api'

type AuthState = 'loading' | 'ready' | 'error'

const App: React.FC = () => {
  const [likedItems, setLikedItems] = useState<FeedItem[]>([])
  const [authState, setAuthState] = useState<AuthState>('loading')

  // Bootstrap: без этого вызова бэкенд не создаст запись User, и ВСЕ
  // остальные запросы будут падать 401 для нового пользователя —
  // get_current_user только ищет существующего юзера, не создаёт.
  useEffect(() => {
    const initData = window.Telegram?.WebApp?.initData

    if (!initData) {
      // Открыто не из Telegram (например, в обычном браузере при разработке)
      console.warn('[Auth] Нет Telegram initData — приложение открыто не из Telegram')
      setAuthState('error')
      return
    }

    barterApi
      .authTelegram(initData)
      .then(() => setAuthState('ready'))
      .catch((e) => {
        console.error('[Auth] Bootstrap failed:', e)
        setAuthState('error')
      })
  }, [])

  const handleRemoveLiked = (item: FeedItem) => {
    setLikedItems(prev => prev.filter(i => i.id !== item.id))
  }

  if (authState === 'loading') {
    return (
      <div style={{ ...appStyle, alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Загрузка...</div>
      </div>
    )
  }

  if (authState === 'error') {
    return (
      <div style={{ ...appStyle, alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, lineHeight: 1.5 }}>
          Не удалось авторизоваться.<br />
          Откройте приложение через Telegram-бота.
        </div>
      </div>
    )
  }

  return (
    <div style={appStyle}>
      <Routes>
        <Route path="/" element={<StartPage />} />
        <Route path="/create" element={<CreateItemPage />} />
        <Route path="/feed" element={
          <FeedPage
            likedItems={likedItems}
            onLikedItemsChange={setLikedItems}
          />
        } />
        <Route path="/liked" element={
          <LikedPage
            likedItems={likedItems}
            onRemoveLiked={handleRemoveLiked}
          />
        } />
        <Route path="/matches" element={<MatchPage />} />
        <Route path="/payment/:matchId" element={<PaymentPage />} />
        <Route path="/pro" element={<ProPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

const appStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  background: '#0d0d1a',
  color: '#e8e8f0',
  overflow: 'hidden',
}

export default App
