import { useRef, useState, useCallback } from 'react'
import type { FeedItem } from '../services/api'
import { resolveMediaUrl } from '../services/api'

interface CardSwiperProps {
  items: FeedItem[]
  currentIndex: number
  likedCount: number
  onSwipeLeft: (item: FeedItem) => void
  onSwipeRight: (item: FeedItem) => void
  onIndexChange: (index: number) => void
}

export default function CardSwiper({ items, currentIndex, likedCount, onSwipeLeft, onSwipeRight, onIndexChange }: CardSwiperProps) {
  const [swipeX, setSwipeX] = useState(0)
  const [swipeY, setSwipeY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [leaveDir, setLeaveDir] = useState<'left' | 'right' | null>(null)

  const startX = useRef(0)
  const startY = useRef(0)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])

  const currentItem = items[currentIndex]

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!currentItem) return
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    setIsDragging(true)
    setLeaveDir(null)
  }, [currentItem])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || !currentItem) return
    const dx = e.touches[0].clientX - startX.current
    const dy = e.touches[0].clientY - startY.current

    // Resist vertical scroll once horizontal swipe is detected
    if (Math.abs(dx) > 10) {
      e.preventDefault()
    }

    setSwipeX(dx)
    setSwipeY(dy * 0.3)
  }, [isDragging, currentItem])

  const handleTouchEnd = useCallback(() => {
    if (!currentItem) return
    setIsDragging(false)
    const threshold = 80

    if (swipeX > threshold) {
      setLeaveDir('right')
      setLeaving(true)
      setTimeout(() => {
        onSwipeRight(currentItem)
        goNext()
      }, 250)
    } else if (swipeX < -threshold) {
      setLeaveDir('left')
      setLeaving(true)
      setTimeout(() => {
        onSwipeLeft(currentItem)
        goNext()
      }, 250)
    } else {
      setSwipeX(0)
      setSwipeY(0)
    }
  }, [swipeX, currentItem])

  const goNext = () => {
    setLeaving(false)
    setLeaveDir(null)
    setSwipeX(0)
    setSwipeY(0)
    const next = currentIndex + 1
    if (next < items.length) {
      onIndexChange(next)
    }
  }

  const getCardStyle = (): React.CSSProperties => {
    if (leaving) {
      const tx = leaveDir === 'right' ? 600 : -600
      return {
        transform: `translate3d(${tx}px, ${swipeY}px, 0) rotate(${leaveDir === 'right' ? 20 : -20}deg) scale(0.9)`,
        opacity: 0,
        transition: 'transform 0.25s ease-out, opacity 0.25s ease-out',
      }
    }

    const rotation = swipeX * 0.05
    const opacity = Math.max(1 - Math.abs(swipeX) / 600, 0.85)
    const scale = Math.min(1, 1 - Math.abs(swipeY) / 2000)

    return {
      transform: `translate3d(${swipeX}px, ${swipeY}px, 0) rotate(${rotation}deg) scale(${scale})`,
      opacity,
      transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28), opacity 0.3s ease',
    }
  }

  const setVideoRef = useCallback((el: HTMLVideoElement | null, index: number) => {
    if (el) {
      videoRefs.current[index] = el
      el.play().catch(() => {})
    }
  }, [])

  const getConditionLabel = (c: string) => {
    const labels: Record<string, string> = { new: 'Новый', like_new: 'Как новый', good: 'Хорошее', fair: 'Удовлетворительное' }
    return labels[c] || c
  }

  const getCategoryEmoji = (c: string) => {
    const emojis: Record<string, string> = { electronics: '📱', clothing: '👕', books: '📚', home: '🏠', sports: '⚽', toys: '🎲', other: '📦' }
    return emojis[c] || '📦'
  }

  if (!currentItem) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48, color: '#fff', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
        <h2 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px' }}>Вещи закончились</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Загляните позже — появятся новые предложения</p>
      </div>
    )
  }

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      maxWidth: 420,
      margin: '0 auto',
      touchAction: 'pan-y',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
    }}>
      {/* Swipeable card */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '9/16',
          maxHeight: '68vh',
          borderRadius: 16,
          overflow: 'hidden',
          backgroundColor: '#1a1a2e',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          willChange: 'transform',
          cursor: 'grab',
          ...getCardStyle(),
        }}
      >
        {/* Video */}
        <video
          ref={el => setVideoRef(el, currentIndex)}
          src={resolveMediaUrl(currentItem.video_url)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
          loop muted playsInline preload="auto" autoPlay
        />

        {/* Gradient overlay */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%',
          background: 'linear-gradient(transparent 20%, rgba(0,0,0,0.85))',
          pointerEvents: 'none',
        }} />

        {/* Top badges */}
        <div style={{ position: 'absolute', top: 12, left: 12, right: 12, display: 'flex', gap: 6, pointerEvents: 'none' }}>
          <span style={{ padding: '3px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', color: '#fff', fontSize: 11, fontWeight: 500 }}>
            {getCategoryEmoji(currentItem.category || 'other')} {currentItem.category || 'Разное'}
          </span>
        </div>

        {/* Bottom info */}
        <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16, color: '#fff', pointerEvents: 'none' }}>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>{currentItem.title}</h3>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.8)', textShadow: '0 1px 4px rgba(0,0,0,0.5)', lineHeight: 1.4 }}>{currentItem.description}</p>
          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            <span style={{ padding: '3px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', fontSize: 11, fontWeight: 500 }}>{getConditionLabel(currentItem.condition)}</span>
            <span style={{ padding: '3px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', fontSize: 11, fontWeight: 500 }}>🔄 Обмен</span>
          </div>
        </div>

        {/* Swipe indicators */}
        {swipeX > 50 && (
          <div style={{ position: 'absolute', top: '30%', right: 20, pointerEvents: 'none', transform: 'rotate(15deg)' }}>
            <div style={{ padding: '8px 16px', border: '3px solid #4CAF50', borderRadius: 12, color: '#4CAF50', fontSize: 28, fontWeight: 800, textShadow: '0 2px 8px rgba(0,0,0,0.5)', background: 'rgba(0,0,0,0.2)' }}>👍</div>
          </div>
        )}
        {swipeX < -50 && (
          <div style={{ position: 'absolute', top: '30%', left: 20, pointerEvents: 'none', transform: 'rotate(-15deg)' }}>
            <div style={{ padding: '8px 16px', border: '3px solid #f44336', borderRadius: 12, color: '#f44336', fontSize: 28, fontWeight: 800, textShadow: '0 2px 8px rgba(0,0,0,0.5)', background: 'rgba(0,0,0,0.2)' }}>👎</div>
          </div>
        )}

        {/* Progress bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', gap: 3, padding: '6px 8px', pointerEvents: 'none' }}>
          {items.slice(0, Math.min(items.length, 8)).map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 3, borderRadius: 2,
              backgroundColor: i === currentIndex ? '#fff' : 'rgba(255,255,255,0.25)',
              transition: 'all 0.2s ease',
            }} />
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 28, marginTop: 16, paddingBottom: 12 }}>
        <button
          onClick={() => {
            if (!currentItem) return
            setLeaveDir('left')
            setLeaving(true)
            setTimeout(() => { onSwipeLeft(currentItem); goNext() }, 250)
          }}
          style={{
            width: 56, height: 56, borderRadius: '50%',
            border: '2px solid #f44336', background: 'rgba(244,67,54,0.12)',
            color: '#f44336', fontSize: 24, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s ease', backdropFilter: 'blur(8px)',
          }}
          aria-label="Пропустить"
        >
          ✕
        </button>

        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, textAlign: 'center', flex: 1 }}>
          Свайпни → для обмена
        </div>

        <button
          onClick={() => {
            if (!currentItem) return
            setLeaveDir('right')
            setLeaving(true)
            setTimeout(() => { onSwipeRight(currentItem); goNext() }, 250)
          }}
          style={{
            width: 56, height: 56, borderRadius: '50%',
            border: '2px solid #4CAF50', background: 'rgba(76,175,80,0.12)',
            color: '#4CAF50', fontSize: 28, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s ease', backdropFilter: 'blur(8px)',
            position: 'relative',
          }}
          aria-label="Нравится"
        >
          ✓
          {likedCount > 0 && (
            <span style={{
              position: 'absolute', top: -4, right: -4,
              background: '#4CAF50', color: '#fff',
              fontSize: 10, fontWeight: 700,
              minWidth: 18, height: 18, borderRadius: 9,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid #141428',
            }}>
              {likedCount}
            </span>
          )}
        </button>
      </div>

      {/* Counter */}
      <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 12, marginBottom: 4 }}>
        {currentIndex + 1} / {items.length}
      </div>
    </div>
  )
}
