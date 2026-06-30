import React, { useState, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTelegram } from '../telegram/TelegramProvider'
import { useLanguage } from '../i18n/LanguageContext'
import { barterApi, type FeedItem } from '../services/api'
import { DEMO_ITEMS, generateMoreItems, simulateMatch } from '../services/demoData'
import CardSwiper from '../components/CardSwiper'
import { CrownIcon, BoltIcon, HeartIcon, SparklesIcon, ArrowLeftIcon } from '../components/Icons'

interface FeedPageProps {
  likedItems: FeedItem[]
  onLikedItemsChange: (items: FeedItem[]) => void
}

// Categories for filtering
const CATEGORIES = [
  { value: '', label: 'feed.all', icon: '🔥' },
  { value: 'electronics', label: 'feed.electronics', icon: '📱' },
  { value: 'clothing', label: 'feed.clothing', icon: '👕' },
  { value: 'books', label: 'feed.books', icon: '📚' },
  { value: 'home', label: 'feed.home', icon: '🏠' },
  { value: 'sports', label: 'feed.sports', icon: '⚽' },
  { value: 'toys', label: 'feed.toys', icon: '🎲' },
  { value: 'other', label: 'feed.other', icon: '📦' },
]

const FeedPage: React.FC<FeedPageProps> = ({ likedItems, onLikedItemsChange }) => {
  const navigate = useNavigate()
  const { hapticFeedback, showBackButton, hideBackButton } = useTelegram()
  const { t, setShowLanguageSelector } = useLanguage()
  const [allItems, setAllItems] = useState<FeedItem[]>(DEMO_ITEMS)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [showMatchModal, setShowMatchModal] = useState(false)
  const [matchedOpponent, setMatchedOpponent] = useState<{ username: string; avatarUrl: string } | null>(null)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [showCategories, setShowCategories] = useState(false)
  const heartCounter = useRef(0)
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([])

  // Кнопка "Назад" для повернення в головне меню
  React.useEffect(() => {
    showBackButton(() => navigate('/'))
    return () => hideBackButton()
  }, [showBackButton, hideBackButton, navigate])

  // Фільтрація за категорією
  const items = useMemo(() => {
    if (!selectedCategory) return allItems
    return allItems.filter(item => item.category === selectedCategory)
  }, [allItems, selectedCategory])

  const loadMore = useCallback(() => {
    const newItems = generateMoreItems(5)
    setAllItems(prev => [...prev, ...newItems])
  }, [])

  const handleSwipeRight = useCallback(async (item: FeedItem) => {
    if (isAnimating) return
    setIsAnimating(true)
    hapticFeedback('medium')

    // Hearts burst
    heartCounter.current += 1
    const id = heartCounter.current
    setHearts(prev => [...prev, { id, x: 30 + Math.random() * 40, y: 30 + Math.random() * 40 }])
    setTimeout(() => setHearts([]), 700)

    // Додаємо до вподобаних
    if (!likedItems.find(i => i.id === item.id)) {
      onLikedItemsChange([...likedItems, item])
    }

    // Спроба реального API, fallback на демо
    try {
      const result = await barterApi.likeItem(item.id).catch(() => ({ match_id: null }))
      if (result?.match_id) {
        setTimeout(() => setShowMatchModal(true), 400)
      } else {
        const demoMatch = simulateMatch()
        if (demoMatch) {
          setMatchedOpponent({
            username: demoMatch.opponentUsername || 'unknown',
            avatarUrl: demoMatch.opponentAvatarUrl || '',
          })
          setTimeout(() => setShowMatchModal(true), 400)
        }
      }
    } catch {
      const demoMatch = simulateMatch()
      if (demoMatch) {
        setMatchedOpponent({
          username: demoMatch.opponentUsername || 'unknown',
          avatarUrl: demoMatch.opponentAvatarUrl || '',
        })
        setTimeout(() => setShowMatchModal(true), 400)
      }
    }

    setTimeout(() => setIsAnimating(false), 300)
    if (currentIndex >= items.length - 3) loadMore()
  }, [isAnimating, currentIndex, items.length, likedItems, onLikedItemsChange, hapticFeedback])

  const handleSwipeLeft = useCallback(async (item: FeedItem) => {
    if (isAnimating) return
    setIsAnimating(true)
    hapticFeedback('light')

    try {
      await barterApi.skipItem(item.id)
    } catch { /* mock */ }

    setTimeout(() => setIsAnimating(false), 300)
    if (currentIndex >= items.length - 2) loadMore()
  }, [isAnimating, currentIndex, items.length, hapticFeedback])

  const handleIndexChange = useCallback((index: number) => {
    setCurrentIndex(index)
    if (index >= items.length - 3) loadMore()
  }, [items.length, loadMore])

  const handleCategorySelect = useCallback((cat: string) => {
    setSelectedCategory(cat)
    setCurrentIndex(0)
    setShowCategories(false)
    hapticFeedback('light')
  }, [hapticFeedback])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'linear-gradient(180deg, #0d0d1a 0%, #141428 100%)',
      color: '#e8e8f0',
      position: 'relative',
    }}>
      {/* Верхня панель з категоріями */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(13,13,26,0.8)',
        backdropFilter: 'blur(12px)',
        zIndex: 10,
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 16px',
          paddingTop: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <BoltIcon size={20} color="#667eea" />
            <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>Barter</span>
            {selectedCategory && (
              <span style={{ fontSize: 12, color: '#8888b0', marginLeft: 4 }}>
                · {t(CATEGORIES.find(c => c.value === selectedCategory)?.label || selectedCategory)}
              </span>
            )}
            <button
              onClick={() => setShowLanguageSelector(true)}
              style={{
                marginLeft: 4, padding: '2px 6px', borderRadius: 8,
                background: 'transparent', border: 'none',
                color: '#5a5a7a', fontSize: 14, cursor: 'pointer',
              }}
            >
              🌐
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setShowCategories(prev => !prev)}
              style={{
                padding: '6px 12px', borderRadius: 10,
                background: selectedCategory ? 'rgba(102,126,234,0.15)' : 'rgba(255,255,255,0.08)',
                border: selectedCategory ? '1px solid rgba(102,126,234,0.3)' : '1px solid rgba(255,255,255,0.1)',
                color: selectedCategory ? '#667eea' : '#fff',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              📋 {t('feed.categories')}
            </button>
            <button
              onClick={() => navigate('/liked')}
              style={{
                padding: '6px 12px', borderRadius: 10,
                background: likedItems.length > 0 ? 'rgba(255,107,157,0.15)' : 'rgba(255,255,255,0.08)',
                border: likedItems.length > 0 ? '1px solid rgba(255,107,157,0.3)' : '1px solid rgba(255,255,255,0.1)',
                color: likedItems.length > 0 ? '#ff6b9d' : '#fff',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
                position: 'relative',
              }}
            >
              <HeartIcon size={12} color={likedItems.length > 0 ? '#ff6b9d' : '#fff'} />
              {t('feed.my')}
              {likedItems.length > 0 && (
                <span style={{
                  position: 'absolute', top: -6, right: -6,
                  background: '#ff6b9d', color: '#fff',
                  fontSize: 10, fontWeight: 700,
                  minWidth: 18, height: 18, borderRadius: 9,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 4px',
                }}>
                  {likedItems.length}
                </span>
              )}
            </button>
            <button
              onClick={() => navigate('/matches')}
              style={{
                padding: '6px 12px', borderRadius: 10,
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              ✨ {t('feed.matches')}
            </button>
          </div>
        </div>

        {/* Випадаюча панель категорій */}
        {showCategories && (
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 6,
            padding: '8px 16px 12px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                onClick={() => handleCategorySelect(cat.value)}
                style={{
                  padding: '6px 14px', borderRadius: 20,
                  background: selectedCategory === cat.value
                    ? 'linear-gradient(135deg, #667eea, #764ba2)'
                    : 'rgba(255,255,255,0.06)',
                  border: selectedCategory === cat.value
                    ? 'none'
                    : '1px solid rgba(255,255,255,0.1)',
                  color: selectedCategory === cat.value ? '#fff' : '#b0b0c8',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s ease',
                }}
              >
                {cat.icon} {t(cat.label)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Повідомлення якщо немає товарів у категорії */}
      {items.length === 0 ? (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 12,
          padding: 24,
        }}>
          <span style={{ fontSize: 48 }}>📭</span>
          <p style={{ color: '#8888b0', fontSize: 14, textAlign: 'center' }}>
            {t('feed.emptyTitle')}
          </p>
          <button
            onClick={() => handleCategorySelect('')}
            style={{
              padding: '10px 24px', borderRadius: 12,
              background: 'rgba(102,126,234,0.15)',
              border: '1px solid rgba(102,126,234,0.3)',
              color: '#667eea', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            🔥 {t('feed.showAll')}
          </button>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 8px' }}>
          <CardSwiper
            items={items}
            currentIndex={currentIndex}
            likedCount={likedItems.length}
            onSwipeLeft={handleSwipeLeft}
            onSwipeRight={handleSwipeRight}
            onIndexChange={handleIndexChange}
          />
        </div>
      )}

      {/* Hearts burst overlay */}
      {hearts.map(h => (
        <div key={h.id} style={{
          position: 'fixed', left: `${h.x}%`, top: `${h.y}%`,
          fontSize: 28, pointerEvents: 'none', zIndex: 100,
          animation: 'heartFloat 0.7s ease-out forwards',
        }}>
          ❤️
        </div>
      ))}

      {/* Match Modal */}
      {showMatchModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            animation: 'fadeIn 0.3s ease',
          }}
          onClick={() => setShowMatchModal(false)}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #1a1a3e 0%, #2a1a4e 100%)',
              borderRadius: 20, padding: 32, textAlign: 'center',
              maxWidth: 320, width: '90%',
              border: '1px solid rgba(255,255,255,0.1)',
              animation: 'modalPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 4px', background: 'linear-gradient(135deg, #6C5CE7, #a29bfe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {t('feed.itsAMatch')}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, margin: '0 0 20px' }}>
              {matchedOpponent?.username || t('feed.matchDesc')}
            </p>
            <button
              onClick={() => {
                setShowMatchModal(false)
                navigate('/matches')
              }}
              style={{
                width: '100%', padding: '14px 24px', borderRadius: 14,
                background: 'linear-gradient(135deg, #6C5CE7, #a29bfe)',
                border: 'none', color: '#fff', fontSize: 16, fontWeight: 700,
                cursor: 'pointer', marginBottom: 8,
              }}
            >
              ✨ {t('feed.viewMatches')}
            </button>
            <button
              onClick={() => setShowMatchModal(false)}
              style={{
                padding: '10px 24px', borderRadius: 14,
                background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.5)', fontSize: 14, cursor: 'pointer',
                width: '100%',
              }}
            >
              {t('feed.continueBrowsing')}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes heartFloat {
          0% { transform: scale(0.5) translateY(0); opacity: 1; }
          100% { transform: scale(1.5) translateY(-80px); opacity: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalPop {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

export default FeedPage
