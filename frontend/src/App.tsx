import React, { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { LanguageProvider } from './i18n/LanguageContext'
import StartPage from './pages/StartPage'
import CreateItemPage from './pages/CreateItemPage'
import FeedPage from './pages/FeedPage'
import MatchPage from './pages/MatchPage'
import LikedPage from './pages/LikedPage'
import PaymentPage from './pages/PaymentPage'
import ProPage from './pages/ProPage'
import type { FeedItem } from './services/api'

const App: React.FC = () => {
  const [likedItems, setLikedItems] = useState<FeedItem[]>([])

  const handleRemoveLiked = (item: FeedItem) => {
    setLikedItems(prev => prev.filter(i => i.id !== item.id))
  }

  return (
    <div style={appStyle}>
      <LanguageProvider>
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
      </LanguageProvider>
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
