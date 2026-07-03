import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import VideoPlayer from '../components/VideoPlayer'
import { barterApi, resolveMediaUrl, type MatchResponse } from '../services/api'
import { useTelegram } from '../telegram/TelegramProvider'
import { ChatIcon, SparklesIcon, RefreshIcon, ClockIcon, CheckIcon, CrownIcon } from '../components/Icons'

const MatchPage: React.FC = () => {
  const navigate = useNavigate()
  const { showBackButton, hideBackButton, hapticFeedback } = useTelegram()
  const [matches, setMatches] = useState<MatchResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    showBackButton(() => navigate('/feed'))
    return () => hideBackButton()
  }, [showBackButton, hideBackButton, navigate])

  useEffect(() => {
    barterApi.getMatches()
      .then(setMatches)
      .catch((e) => {
        console.error('[Matches] Failed to load:', e)
        setMatches([])
      })
      .finally(() => setIsLoading(false))
  }, [])

  const handleOpenChat = useCallback((match: MatchResponse) => {
    hapticFeedback('medium')

    if (match.status === 'active') {
      if (match.opponent.username) {
        window.Telegram?.WebApp?.openTelegramLink(`https://t.me/${match.opponent.username}`)
      }
    } else {
      navigate(`/payment/${match.id}`)
    }
  }, [navigate, hapticFeedback])

  // Бэкенд знает только два реальных статуса матча: pending (ждём оплату
  // хотя бы одной стороны) и active (обе оплатили, чат открыт).
  const getStatusLabel = (status: string): string =>
    status === 'active' ? 'Контакт открыт' : 'Ожидает оплаты'

  const getStatusColor = (status: string): string =>
    status === 'active' ? '#2ed573' : '#ffa502'

  const getStatusIcon = (status: string) =>
    status === 'active'
      ? <CheckIcon size={12} color="#2ed573" />
      : <ClockIcon size={12} color="#ffa502" />

  if (isLoading) {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: 'center', color: '#5a5a7a', fontSize: 14, marginTop: '30vh' }}>
          Загрузка...
        </div>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <h1 style={titleStyle}>
        <SparklesIcon size={22} color="#667eea" />
        <span style={{ marginLeft: 10 }}>Мои совпадения</span>
      </h1>

      {matches.length === 0 ? (
        <div style={emptyStyle}>
          <SparklesIcon size={48} color="#5a5a7a" />
          <p style={emptyTextStyle}>Пока нет совпадений</p>
          <p style={emptyHintStyle}>
            Листайте ленту, чтобы найти интересные вещи для обмена
          </p>
          <button
            style={backToFeedButtonStyle}
            onClick={() => navigate('/feed')}
          >
            <RefreshIcon size={14} color="#fff" />
            <span style={{ marginLeft: 8 }}>К ленте</span>
          </button>
        </div>
      ) : (
        <div style={matchesListStyle}>
          {matches.map((match) => (
            <div key={match.id} style={matchCardStyle}>
              <div style={matchVideoContainerStyle}>
                <VideoPlayer
                  src={resolveMediaUrl(match.their_item.video_url)}
                  style={matchVideoStyle}
                  autoPlay={true}
                  muted={true}
                  loop={true}
                />
                <div style={matchCardOverlay} />
              </div>

              <div style={matchInfoStyle}>
                <h3 style={matchTitleStyle}>{match.their_item.title}</h3>
                <p style={matchDescStyle}>{match.their_item.description}</p>
                <p style={matchConditionStyle}>
                  <span style={{ textTransform: 'capitalize' }}>{match.their_item.category}</span>
                  <span style={{ margin: '0 6px', color: '#5a5a7a' }}>·</span>
                  {match.their_item.condition === 'like_new' ? 'Как новый' :
                   match.their_item.condition === 'good' ? 'Хорошее' :
                   match.their_item.condition === 'fair' ? 'Удовлетворительное' :
                   match.their_item.condition === 'new' ? 'Новый' : match.their_item.condition}
                </p>

                <div style={statusRowStyle}>
                  <span
                    style={{
                      ...statusBadgeStyle,
                      color: getStatusColor(match.status),
                      borderColor: getStatusColor(match.status),
                    }}
                  >
                    {getStatusIcon(match.status)}
                    <span style={{ marginLeft: 5 }}>{getStatusLabel(match.status)}</span>
                  </span>
                </div>

                <button
                  style={chatButtonStyle}
                  onClick={() => handleOpenChat(match)}
                >
                  <ChatIcon size={14} color="#fff" />
                  <span style={{ marginLeft: 8 }}>
                    {match.status === 'active'
                      ? 'Открыть чат'
                      : 'Открыть чат — оплатить'}
                  </span>
                </button>

                {match.opponent.username && match.status === 'active' && (
                  <div style={contactInfoStyle}>
                    <div style={contactAvatarContainerStyle}>
                      <img
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${match.opponent.username}`}
                        alt={match.opponent.username}
                        style={contactAvatarStyle}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    </div>
                    <div style={contactTextStyle}>
                      <span style={contactLabelStyle}>Владелец</span>
                      <span style={usernameStyle}>@{match.opponent.username}</span>
                    </div>
                    <CrownIcon size={14} color="#FFD700" style={{ marginLeft: 'auto', opacity: 0.5 }} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const containerStyle: React.CSSProperties = {
  flex: 1,
  padding: '20px 16px',
  paddingTop: 'calc(env(safe-area-inset-top, 0px) + 20px)',
  minHeight: '100vh',
  overflowY: 'auto',
  background: '#0d0d1a',
}

const titleStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  margin: '0 0 20px 0',
  color: '#e8e8f0',
  display: 'flex',
  alignItems: 'center',
}

const emptyStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 12,
  marginTop: '30vh',
}

const emptyTextStyle: React.CSSProperties = {
  fontSize: 17,
  color: '#8888b0',
  margin: 0,
  fontWeight: 500,
}

const emptyHintStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#5a5a7a',
  textAlign: 'center',
  margin: 0,
  maxWidth: 280,
  lineHeight: 1.5,
}

const backToFeedButtonStyle: React.CSSProperties = {
  padding: '12px 24px',
  borderRadius: 12,
  border: 'none',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: '#fff',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  marginTop: 8,
  display: 'flex',
  alignItems: 'center',
  boxShadow: '0 4px 20px rgba(102,126,234,0.3)',
  transition: 'transform 0.15s ease',
}

const matchesListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
}

const matchCardStyle: React.CSSProperties = {
  background: '#16162a',
  borderRadius: 16,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  border: '1px solid rgba(255,255,255,0.06)',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
}

const matchVideoContainerStyle: React.CSSProperties = {
  width: '100%',
  aspectRatio: '16/9',
  background: '#000',
  overflow: 'hidden',
  position: 'relative',
}

const matchVideoStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
}

const matchCardOverlay: React.CSSProperties = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  height: '40%',
  background: 'linear-gradient(to top, #16162a 0%, transparent 100%)',
  pointerEvents: 'none',
}

const matchInfoStyle: React.CSSProperties = {
  padding: 16,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
}

const matchTitleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  margin: 0,
  color: '#e8e8f0',
}

const matchDescStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#8888b0',
  margin: 0,
  lineHeight: 1.4,
}

const matchConditionStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#5a5a7a',
  margin: 0,
}

const statusRowStyle: React.CSSProperties = {
  marginTop: 2,
}

const statusBadgeStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  padding: '3px 10px',
  borderRadius: 20,
  border: '1px solid',
  display: 'inline-flex',
  alignItems: 'center',
}

const chatButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px',
  borderRadius: 12,
  border: 'none',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: '#fff',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  marginTop: 2,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 4px 16px rgba(102,126,234,0.25)',
  transition: 'transform 0.15s ease',
}

const contactInfoStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '8px 12px',
  background: 'rgba(255,255,255,0.03)',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.05)',
}

const contactAvatarContainerStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: '50%',
  border: '1px solid rgba(102,126,234,0.3)',
  overflow: 'hidden',
  flexShrink: 0,
}

const contactAvatarStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
}

const contactTextStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
}

const contactLabelStyle: React.CSSProperties = {
  fontSize: 10,
  color: '#5a5a7a',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
}

const usernameStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#e8e8f0',
  fontWeight: 500,
}

export default MatchPage
