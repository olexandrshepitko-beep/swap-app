import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useTelegram } from '../telegram/TelegramProvider'
import { useLanguage } from '../i18n/LanguageContext'
import { type FeedItem } from '../services/api'
import { SparklesIcon, HeartIcon, ChatIcon, StarIcon } from '../components/Icons'

// Demo users who "selected me"
import { DEMO_USERS, DEMO_ITEMS } from '../services/demoData'

interface LikedPageProps {
  likedItems: FeedItem[]
  onRemoveLiked: (item: FeedItem) => void
}

type Tab = 'i_picked' | 'picked_me'

const CATEGORY_EMOJIS: Record<string, string> = {
  electronics: '📱', clothing: '👕', books: '📚', home: '🏠',
  sports: '⚽', toys: '🎲', other: '📦',
}

// Generate "who picked me" demo data
function generatePickedMe() {
  const count = 3 + Math.floor(Math.random() * 4) // 3-6 people
  const result: {
    user: { username: string; avatarUrl: string; isPro: boolean }
    item: FeedItem
  }[] = []

  const usedUsers = new Set<string>()

  for (let i = 0; i < count; i++) {
    let userIdx = Math.floor(Math.random() * DEMO_USERS.length)
    let tries = 0
    while (usedUsers.has(DEMO_USERS[userIdx].username) && tries < 10) {
      userIdx = (userIdx + 1) % DEMO_USERS.length
      tries++
    }
    const user = DEMO_USERS[userIdx]
    usedUsers.add(user.username)

    const item = DEMO_ITEMS[Math.floor(Math.random() * DEMO_ITEMS.length)]

    result.push({ user, item })
  }

  return result
}

const LikedPage: React.FC<LikedPageProps> = ({ likedItems, onRemoveLiked }) => {
  const navigate = useNavigate()
  const { showBackButton, hideBackButton, hapticFeedback } = useTelegram()
  const { t } = useLanguage()
  const [tab, setTab] = React.useState<Tab>('i_picked')
  const [pickedMe] = React.useState(generatePickedMe)

  React.useEffect(() => {
    showBackButton(() => navigate('/feed'))
    return () => hideBackButton()
  }, [showBackButton, hideBackButton, navigate])

  const [selectedForTrade, setSelectedForTrade] = React.useState<string | null>(null)

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: '#0d0d1a', color: '#e8e8f0',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 16px 0',
        background: 'rgba(13,13,26,0.8)', backdropFilter: 'blur(12px)',
      }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          {t('liked.title')}
          {(tab === 'i_picked' && likedItems.length > 0) && (
            <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>
              {likedItems.length} {t('liked.itemsCount')}
            </span>
          )}
          {(tab === 'picked_me' && pickedMe.length > 0) && (
            <span style={{ fontSize: 14, fontWeight: 600, color: '#ff6b9d' }}>
              {pickedMe.length} {t('liked.chosenBy')}
            </span>
          )}
        </h1>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, marginTop: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={() => setTab('i_picked')}
            style={{
              flex: 1, padding: '10px 0', border: 'none',
              background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 13, fontWeight: 600, color: tab === 'i_picked' ? '#ff6b9d' : 'rgba(255,255,255,0.3)',
              borderBottom: tab === 'i_picked' ? '2px solid #ff6b9d' : '2px solid transparent',
              transition: 'all 0.2s ease',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <HeartIcon size={14} color={tab === 'i_picked' ? '#ff6b9d' : 'rgba(255,255,255,0.3)'} />
            {t('liked.iPicked')} {likedItems.length > 0 && `(${likedItems.length})`}
          </button>
          <button
            onClick={() => setTab('picked_me')}
            style={{
              flex: 1, padding: '10px 0', border: 'none',
              background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 13, fontWeight: 600, color: tab === 'picked_me' ? '#6C5CE7' : 'rgba(255,255,255,0.3)',
              borderBottom: tab === 'picked_me' ? '2px solid #6C5CE7' : '2px solid transparent',
              transition: 'all 0.2s ease',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <StarIcon size={14} color={tab === 'picked_me' ? '#6C5CE7' : 'rgba(255,255,255,0.3)'} />
            {t('liked.pickedMe')} {pickedMe.length > 0 && `(${pickedMe.length})`}
          </button>
        </div>
      </div>

      {/* Tab: Я выбрал */}
      {tab === 'i_picked' && (
        likedItems.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>💔</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>{t('liked.emptyTitle')}</h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: 0, lineHeight: 1.5 }}>
              {t('liked.emptyDesc')}
            </p>
            <button
              onClick={() => navigate('/feed')}
              style={{
                marginTop: 24, padding: '12px 32px', borderRadius: 14,
                background: 'linear-gradient(135deg, #6C5CE7, #a29bfe)',
                border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
              }}
            >
              🔄 {t('liked.backToFeed')}
            </button>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {likedItems.map((item) => {
                const isSelected = String(selectedForTrade) === String(item.id)
                return (
                  <div
                    key={item.id}
                    style={{
                      borderRadius: 14, overflow: 'hidden',
                      background: 'rgba(255,255,255,0.04)',
                      border: isSelected ? '2px solid #6C5CE7' : '1px solid rgba(255,255,255,0.08)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {/* Video thumbnail */}
                    <div style={{
                      width: '100%', aspectRatio: '9/16',
                      background: '#1a1a2e', position: 'relative',
                      overflow: 'hidden',
                    }}>
                    <video
                      src={item.videoUrl}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      muted loop playsInline autoPlay
                      onMouseOver={e => (e.target as HTMLVideoElement).play()}
                      onMouseOut={e => (e.target as HTMLVideoElement).pause()}
                      onClick={e => {
                        const vid = e.target as HTMLVideoElement
                        vid.paused ? vid.play() : vid.pause()
                      }}
                    />
                      {/* Category badge */}
                      <span style={{
                        position: 'absolute', top: 6, left: 6,
                        padding: '2px 8px', borderRadius: 8,
                        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
                        fontSize: 10, fontWeight: 600,
                      }}>
                        {CATEGORY_EMOJIS[item.category] || '📦'} {item.category}
                      </span>
                      {/* Selected badge */}
                      {isSelected && (
                        <span style={{
                          position: 'absolute', top: 6, right: 6,
                          padding: '2px 8px', borderRadius: 8,
                          background: 'rgba(108,92,231,0.8)',
                          fontSize: 10, fontWeight: 700, color: '#fff',
                        }}>
                          ✓ {t('liked.selectedForTrade')}
                        </span>
                      )}
                    </div>
                    {/* Item info */}
                    <div style={{ padding: '8px 10px 10px' }}>
                      <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0, lineHeight: 1.3 }}>{item.title}</h3>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '4px 0 0', lineHeight: 1.3 }}>
                        {item.description.slice(0, 60)}...
                      </p>
                      <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (isSelected) {
                              setSelectedForTrade(null)
                            } else {
                              setSelectedForTrade(String(item.id))
                              hapticFeedback('light')
                            }
                          }}
                          style={{
                            flex: 1, padding: '4px 0', borderRadius: 8,
                            background: isSelected ? 'rgba(108,92,231,0.2)' : 'rgba(255,255,255,0.06)',
                            border: isSelected ? '1px solid rgba(108,92,231,0.4)' : '1px solid rgba(255,255,255,0.1)',
                            color: isSelected ? '#6C5CE7' : 'rgba(255,255,255,0.6)',
                            fontSize: 10, fontWeight: 600, cursor: 'pointer',
                            fontFamily: 'inherit',
                          }}
                        >
                          {isSelected ? `${t('liked.selectedForTrade')}` : t('liked.wantToGive')}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onRemoveLiked(item)
                            hapticFeedback('light')
                          }}
                          style={{
                            width: 28, height: 28, borderRadius: 8,
                            background: 'rgba(255,71,87,0.1)',
                            border: '1px solid rgba(255,71,87,0.2)',
                            color: '#ff4757', fontSize: 12, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: 'inherit',
                          }}
                          aria-label={t('liked.remove')}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Bottom actions */}
            <div style={{ marginTop: 16, marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selectedForTrade && (
                <div style={{
                  padding: '10px 14px', borderRadius: 12,
                  background: 'rgba(108,92,231,0.1)',
                  border: '1px solid rgba(108,92,231,0.2)',
                  fontSize: 12, color: 'rgba(255,255,255,0.6)',
                  textAlign: 'center',
                }}>
                  {t('liked.selectedHint')}
                </div>
              )}
              <button
                onClick={() => navigate('/matches')}
                style={{
                  width: '100%', padding: '14px', borderRadius: 14,
                  background: 'linear-gradient(135deg, #6C5CE7, #a29bfe)',
                  border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  fontFamily: 'inherit',
                }}
              >
                <SparklesIcon size={16} color="#fff" />
                {t('liked.viewMatches')}
              </button>
            </div>
          </div>
        )
      )}

      {/* Tab: Меня выбрали */}
      {tab === 'picked_me' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', margin: '0 4px 12px', lineHeight: 1.4 }}>
            {t('liked.tradingDesc')}
          </p>

          {pickedMe.map((entry, i) => (
            <div
              key={i}
              style={{
                borderRadius: 16, overflow: 'hidden', marginBottom: 12,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {/* User info */}
              <div style={{
                padding: '10px 12px',
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'rgba(255,255,255,0.02)',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  overflow: 'hidden', flexShrink: 0,
                  border: '1px solid rgba(102,126,234,0.3)',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700, color: '#fff',
                }}>
                  {entry.user.username[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#e8e8f0' }}>
                    @{entry.user.username}
                  </span>
                  {entry.user.isPro && (
                    <span style={{ marginLeft: 6, fontSize: 10, color: '#FFD700' }}>⭐ {t('pro.title')}</span>
                  )}
                </div>
                <button
                  onClick={() => {
                    hapticFeedback('medium')
                    navigate(`/matches`)
                  }}
                  style={{
                    padding: '6px 12px', borderRadius: 8,
                    background: 'linear-gradient(135deg, #6C5CE7, #a29bfe)',
                    border: 'none', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  <ChatIcon size={11} color="#fff" />
                  <span style={{ marginLeft: 4 }}>{t('liked.want')}</span>
                </button>
              </div>

              {/* What they offer */}
              <div style={{ display: 'flex', gap: 10, padding: '10px 12px' }}>
                <div style={{
                  width: 80, height: 80, borderRadius: 10, overflow: 'hidden',
                  background: '#1a1a2e', flexShrink: 0,
                }}>
                  <video
                    src={entry.item.videoUrl}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    muted loop playsInline autoPlay
                  />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{entry.item.title}</h4>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '4px 0 0', lineHeight: 1.3 }}>
                    {entry.item.description.slice(0, 80)}...
                  </p>
                  <span style={{ fontSize: 11, color: '#5a5a7a', marginTop: 4 }}>
                    {CATEGORY_EMOJIS[entry.item.category] || '📦'} {entry.item.category}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* Empty state if no one picked you */}
          {pickedMe.length === 0 && (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: 60, textAlign: 'center',
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>{t('liked.noOnePicked')}</h2>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                {t('liked.noOnePickedHint')}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default LikedPage
