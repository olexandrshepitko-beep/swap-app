import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useTelegram } from '../telegram/TelegramProvider'
import { barterApi, resolveMediaUrl, type FeedItem, type ReceivedLike } from '../services/api'
import { SparklesIcon, HeartIcon, StarIcon } from '../components/Icons'

interface LikedPageProps {
  likedItems: FeedItem[]
  onRemoveLiked: (item: FeedItem) => void
}

type Tab = 'i_picked' | 'picked_me'

const CATEGORY_EMOJIS: Record<string, string> = {
  electronics: '📱', clothing: '👕', books: '📚', home: '🏠',
  sports: '⚽', toys: '🎲', other: '📦',
}

const LikedPage: React.FC<LikedPageProps> = ({ likedItems, onRemoveLiked }) => {
  const navigate = useNavigate()
  const { showBackButton, hideBackButton, hapticFeedback } = useTelegram()
  const [tab, setTab] = React.useState<Tab>('i_picked')
  const [pickedMe, setPickedMe] = React.useState<ReceivedLike[]>([])
  const [loadingPickedMe, setLoadingPickedMe] = React.useState(false)
  const [selectedForTrade, setSelectedForTrade] = React.useState<number | null>(null)

  React.useEffect(() => {
    showBackButton(() => navigate('/feed'))
    return () => hideBackButton()
  }, [showBackButton, hideBackButton, navigate])

  React.useEffect(() => {
    if (tab !== 'picked_me') return
    setLoadingPickedMe(true)
    barterApi.getReceivedLikes()
      .then(setPickedMe)
      .catch((e) => {
        console.error('[Liked] Failed to load received likes:', e)
        setPickedMe([])
      })
      .finally(() => setLoadingPickedMe(false))
  }, [tab])

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
          Обмен
          {(tab === 'i_picked' && likedItems.length > 0) && (
            <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>
              {likedItems.length} шт.
            </span>
          )}
          {(tab === 'picked_me' && pickedMe.length > 0) && (
            <span style={{ fontSize: 14, fontWeight: 600, color: '#ff6b9d' }}>
              {pickedMe.length} → мне
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
            Я выбрал {likedItems.length > 0 && `(${likedItems.length})`}
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
            Меня выбрали {pickedMe.length > 0 && `(${pickedMe.length})`}
          </button>
        </div>
      </div>

      {/* Tab: Я выбрал */}
      {tab === 'i_picked' && (
        likedItems.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>💔</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>Вы ещё ничего не выбрали</h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: 0, lineHeight: 1.5 }}>
              Свайпайте вправо на понравившиеся вещи<br />и они появятся здесь
            </p>
            <button
              onClick={() => navigate('/feed')}
              style={{
                marginTop: 24, padding: '12px 32px', borderRadius: 14,
                background: 'linear-gradient(135deg, #6C5CE7, #a29bfe)',
                border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
              }}
            >
              🔄 Смотреть ленту
            </button>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {likedItems.map((item) => {
                const isSelected = selectedForTrade === item.id
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
                      src={resolveMediaUrl(item.video_url)}
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
                        {CATEGORY_EMOJIS[item.category || 'other'] || '📦'} {item.category || 'Разное'}
                      </span>
                      {/* Selected badge */}
                      {isSelected && (
                        <span style={{
                          position: 'absolute', top: 6, right: 6,
                          padding: '2px 8px', borderRadius: 8,
                          background: 'rgba(108,92,231,0.8)',
                          fontSize: 10, fontWeight: 700, color: '#fff',
                        }}>
                          ✓ Меняю
                        </span>
                      )}
                    </div>
                    {/* Item info */}
                    <div style={{ padding: '8px 10px 10px' }}>
                      <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0, lineHeight: 1.3 }}>{item.title}</h3>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '4px 0 0', lineHeight: 1.3 }}>
                        {(item.description || '').slice(0, 60)}
                      </p>
                      <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (isSelected) {
                              setSelectedForTrade(null)
                            } else {
                              setSelectedForTrade(item.id)
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
                          {isSelected ? '✓ Меняю на это' : 'Хочу отдать'}
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
                          aria-label="Убрать"
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
                  Выбрана вещь для обмена. Теперь найдите что хотите получить взамен.
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
                Посмотреть совпадения
              </button>
            </div>
          </div>
        )
      )}

      {/* Tab: Меня выбрали */}
      {tab === 'picked_me' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', margin: '0 4px 12px', lineHeight: 1.4 }}>
            Кто-то лайкнул вашу вещь! Личность откроется, когда вы лайкнете в ответ — тогда это станет взаимным совпадением.
          </p>

          {loadingPickedMe && (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13, padding: 24 }}>
              Загрузка...
            </div>
          )}

          {!loadingPickedMe && pickedMe.map((entry, i) => (
            <div
              key={i}
              style={{
                borderRadius: 16, overflow: 'hidden', marginBottom: 12,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {/* Anonymous liker badge — личность скрыта до взаимного матча */}
              <div style={{
                padding: '10px 12px',
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'rgba(255,255,255,0.02)',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  flexShrink: 0,
                  border: '1px solid rgba(102,126,234,0.3)',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14,
                }}>
                  ❔
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#e8e8f0' }}>
                    Кто-то заинтересован
                  </span>
                </div>
                <button
                  onClick={() => {
                    hapticFeedback('medium')
                    navigate('/feed')
                  }}
                  style={{
                    padding: '6px 12px', borderRadius: 8,
                    background: 'linear-gradient(135deg, #6C5CE7, #a29bfe)',
                    border: 'none', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Лайкнуть в ответ
                </button>
              </div>

              {/* Which of your items they liked */}
              <div style={{ display: 'flex', gap: 10, padding: '10px 12px' }}>
                <div style={{
                  width: 80, height: 80, borderRadius: 10, overflow: 'hidden',
                  background: '#1a1a2e', flexShrink: 0,
                }}>
                  <video
                    src={resolveMediaUrl(entry.liked_item.video_url)}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    muted loop playsInline autoPlay
                  />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Лайкнули вашу вещь:</span>
                  <h4 style={{ fontSize: 14, fontWeight: 700, margin: '2px 0 0' }}>{entry.liked_item.title}</h4>
                  <span style={{ fontSize: 11, color: '#5a5a7a', marginTop: 4 }}>
                    {CATEGORY_EMOJIS[entry.liked_item.category || 'other'] || '📦'} {entry.liked_item.category || 'Разное'}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* Empty state if no one picked you */}
          {!loadingPickedMe && pickedMe.length === 0 && (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: 60, textAlign: 'center',
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>Вас пока никто не выбрал</h2>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                Загрузите свою вещь в ленту<br />и другие пользователи смогут выбрать вас
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default LikedPage
