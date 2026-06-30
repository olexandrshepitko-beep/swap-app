import React from 'react'
import VideoPlayer from './VideoPlayer'
import type { FeedItem } from '../services/api'

interface SwipeableCardProps {
  item: FeedItem
  onLike: () => void
  onSkip: () => void
  isAnimating: boolean
  swipeDirection: 'left' | 'right' | null
}

const SwipeableCard: React.FC<SwipeableCardProps> = ({
  item,
  onLike,
  onSkip,
  isAnimating,
  swipeDirection,
}) => {
  const getConditionLabel = (condition: string): string => {
    const labels: Record<string, string> = {
      new: 'Новый',
      like_new: 'Как новый',
      good: 'Хорошее',
      fair: 'Удовлетворительное',
    }
    return labels[condition] || condition
  }

  const getCategoryEmoji = (category: string): string => {
    const emojis: Record<string, string> = {
      electronics: '📱',
      clothing: '👕',
      books: '📚',
      home: '🏠',
      sports: '⚽',
      toys: '🎲',
      other: '📦',
    }
    return emojis[category] || '📦'
  }

  // Определяем стиль анимации свайпа
  const getCardTransform = (): React.CSSProperties => {
    if (!isAnimating || !swipeDirection) return {}

    const translateX = swipeDirection === 'right' ? 500 : -500
    const rotate = swipeDirection === 'right' ? 15 : -15
    const opacity = 0

    return {
      transform: `translateX(${translateX}px) rotate(${rotate}deg)`,
      opacity,
      transition: 'transform 0.4s ease, opacity 0.4s ease',
    }
  }

  return (
    <div
      style={{
        ...cardContainerStyle,
        ...getCardTransform(),
      }}
    >
      {/* Video */}
      <div style={videoWrapperStyle}>
        <VideoPlayer
          src={item.videoUrl}
          style={videoStyle}
          autoPlay={true}
          muted={true}
          loop={true}
        />

        {/* Gradient overlay */}
        <div style={gradientOverlayStyle} />
      </div>

      {/* Info overlay */}
      <div style={infoOverlayStyle}>
        {/* Top badges */}
        <div style={topBadgesStyle}>
          {item.isPro && (
            <span style={proBadgeStyle}>⭐ PRO</span>
          )}
          <span style={categoryBadgeStyle}>
            {getCategoryEmoji(item.category)} {item.category}
          </span>
        </div>

        {/* Bottom info */}
        <div style={bottomInfoStyle}>
          <h2 style={titleStyle}>{item.title}</h2>
          <p style={descriptionStyle}>{item.description}</p>

          <div style={tagsRowStyle}>
            <span style={conditionTagStyle}>
              {getConditionLabel(item.condition)}
            </span>
            <span style={conditionTagStyle}>
              🔄 Обмен
            </span>
          </div>
        </div>
      </div>

      {/* Swipe indicators */}
      {isAnimating && swipeDirection === 'right' && (
        <div style={likeIndicatorStyle}>
          <span style={indicatorIconStyle}>❤️</span>
          <span style={indicatorTextStyle}>LIKE</span>
        </div>
      )}
      {isAnimating && swipeDirection === 'left' && (
        <div style={skipIndicatorStyle}>
          <span style={indicatorIconStyle}>❌</span>
          <span style={indicatorTextStyle}>SKIP</span>
        </div>
      )}
    </div>
  )
}

const cardContainerStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  maxWidth: '100%',
  maxHeight: '100%',
  borderRadius: 16,
  overflow: 'hidden',
  position: 'relative',
  background: '#111',
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  transition: 'transform 0.1s ease',
}

const videoWrapperStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  position: 'relative',
}

const videoStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
}

const gradientOverlayStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  height: '50%',
  background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)',
  pointerEvents: 'none',
}

const infoOverlayStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  padding: 16,
  pointerEvents: 'none',
}

const topBadgesStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  alignItems: 'flex-start',
}

const proBadgeStyle: React.CSSProperties = {
  padding: '4px 10px',
  borderRadius: 20,
  background: 'rgba(255,215,0,0.2)',
  border: '1px solid rgba(255,215,0,0.4)',
  color: '#FFD700',
  fontSize: 11,
  fontWeight: 600,
}

const categoryBadgeStyle: React.CSSProperties = {
  padding: '4px 10px',
  borderRadius: 20,
  background: 'rgba(0,0,0,0.5)',
  color: '#e0e0f0',
  fontSize: 11,
  fontWeight: 500,
  textTransform: 'capitalize',
}

const bottomInfoStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
}

const titleStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  margin: 0,
  color: '#fff',
  textShadow: '0 2px 8px rgba(0,0,0,0.5)',
}

const descriptionStyle: React.CSSProperties = {
  fontSize: 14,
  color: 'rgba(255,255,255,0.85)',
  margin: 0,
  lineHeight: 1.4,
  textShadow: '0 1px 4px rgba(0,0,0,0.5)',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
}

const tagsRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  marginTop: 4,
}

const conditionTagStyle: React.CSSProperties = {
  padding: '3px 10px',
  borderRadius: 20,
  background: 'rgba(255,255,255,0.15)',
  color: '#e0e0f0',
  fontSize: 11,
  fontWeight: 500,
  backdropFilter: 'blur(4px)',
}

// Swipe indicators
const indicatorBaseStyle: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
  padding: '12px 16px',
  borderRadius: 16,
  zIndex: 10,
}

const likeIndicatorStyle: React.CSSProperties = {
  ...indicatorBaseStyle,
  left: 20,
  background: 'rgba(76,175,80,0.25)',
  border: '2px solid rgba(76,175,80,0.6)',
}

const skipIndicatorStyle: React.CSSProperties = {
  ...indicatorBaseStyle,
  right: 20,
  background: 'rgba(244,67,54,0.25)',
  border: '2px solid rgba(244,67,54,0.6)',
}

const indicatorIconStyle: React.CSSProperties = {
  fontSize: 28,
}

const indicatorTextStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: '#fff',
  letterSpacing: 2,
}

export default SwipeableCard
