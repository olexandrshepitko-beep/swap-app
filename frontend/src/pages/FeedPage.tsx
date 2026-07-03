import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTelegram } from '../telegram/TelegramProvider'
import { barterApi, type FeedItem, type MatchOpponentInfo } from '../services/api'
import CardSwiper from '../components/CardSwiper'
import { BoltIcon, HeartIcon } from '../components/Icons'

interface FeedPageProps {
  likedItems: FeedItem[]
  onLikedItemsChange: (items: FeedItem[]) => void
}

const FeedPage: React.FC<FeedPageProps> = ({ likedItems, onLikedItemsChange }) => {
  const navigate = useNavigate()
  const { hapticFeedback } = useTelegram()
  const [items, setItems] = useState<FeedItem[]>([])
  const [page, setPage] = useState(1)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [showMatchModal, setShowMatchModal] = useState(false)
  const [matchedOpponent, setMatchedOpponent] = useState<MatchOpponentInfo | null>(null)
  const heartCounter = useRef(0)
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([])
  const loadingRef = useRef(false)

  const loadPage = useCallback(async (pageToLoad: number) => {
    if (loadingRef.current || !hasMore) return
    loadingRef.current = true
    setIsLoadingMore(true)
    try {
      const res = await barterApi.getFeed(pageToLoad, 20)
      setItems(prev => (pageToLoad === 1 ? res.items : [...prev, ...res.items]))
      setHasMore(res.items.length === 20) // меньше полной страницы — дальше пусто
      setPage(pageToLoad)
    } catch (e) {
      console.error('[Feed] Failed to load feed:', e)
      if (pageToLoad === 1) setItems([])
    } finally {
      setIsLoadingMore(false)
      loadingRef.current = false
    }
  }, [hasMore])

  // Первая загрузка ленты
  useEffect(() => {
    loadPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) loadPage(page + 1)
  }, [loadPage, page, isLoadingMore, hasMore])

  const handleSwipeRight = useCallback(async (item: FeedItem) => {
    if (isAnimating) return
    setIsAnimating(true)
    hapticFeedback('medium')

    heartCounter.current += 1
    const id = heartCounter.current
    setHearts(prev => [...prev, { id, x: 30 + Math.random() * 40, y: 30 + Math.random() * 40 }])
    setTimeout(() => setHearts([]), 700)

    if (!likedItems.find(i => i.id === item.id)) {
      onLikedItemsChange([...likedItems, item])
    }

    try {
      const result = await barterApi.swipe(item.id, 'like')
      if (result.match_id) {
        // Подтягиваем список матчей, чтобы узнать, кто оппонент —
        // отдельного эндпоинта "матч по id" нет, но матчей обычно немного
        const matches = await barterApi.getMatches()
        const fresh = matches.find(m => m.id === result.match_id)
        setMatchedOpponent(fresh?.opponent ?? null)
        setTimeout(() => setShowMatchModal(true), 400)
      }
    } catch (e) {
      console.error('[Feed] swipe like failed:', e)
    }

    setTimeout(() => setIsAnimating(false), 300)
    if (currentIndex >= items.length - 3) loadMore()
  }, [isAnimating, currentIndex, items.length, likedItems, onLikedItemsChange, hapticFeedback, loadMore])

  const handleSwipeLeft = useCallback(async (item: FeedItem) => {
    if (isAnimating) return
    setIsAnimating(true)
    hapticFeedback('light')

    try {
      await barterApi.swipe(item.id, 'pass')
    } catch (e) {
      console.error('[Feed] swipe pass failed:', e)
    }

    setTimeout(() => setIsAnimating(false), 300)
    if (currentIndex >= items.length - 2) loadMore()
  }, [isAnimating, currentIndex, items.length, hapticFeedback, loadMore])

  const handleIndexChange = useCallback((index: number) => {
    setCurrentIndex(index)
    if (index >= items.length - 3) loadMore()
  }, [items.length, loadMore])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'linear-gradient(180deg, #0d0d1a 0%, #141428 100%)',
      color: '#e8e8f0',
      position: 'relative',
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 16px',
        paddingTop: 12,
        background: 'rgba(13,13,26,0.8)',
        backdropFilter: 'blur(12px)',
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <BoltIcon size={20} color="#667eea" />
          <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>Barter</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
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
            Мои
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
            ✨ Совпадения
          </button>
        </div>
      </div>

      {/* Card Swiper */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 8px' }}>
        {items.length === 0 && !isLoadingMore ? (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 14, padding: 24 }}>
            Пока нет новых вещей в ленте.<br />Загляните позже!
          </div>
        ) : (
          <CardSwiper
            items={items}
            currentIndex={currentIndex}
            likedCount={likedItems.length}
            onSwipeLeft={handleSwipeLeft}
            onSwipeRight={handleSwipeRight}
            onIndexChange={handleIndexChange}
          />
        )}
      </div>

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
              Это взаимно!
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, margin: '0 0 20px' }}>
              {matchedOpponent?.username || matchedOpponent?.first_name || 'Пользователь'} тоже хочет обменяться!
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
              ✨ Посмотреть совпадения
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
              Продолжить смотреть
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
