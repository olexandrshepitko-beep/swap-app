import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTelegram } from '../telegram/TelegramProvider'
import { barterApi } from '../services/api'
import { sendTonPayment } from '../services/tonPayment'
import { TonConnectButton, useTonWallet, useTonConnectUI } from '@tonconnect/ui-react'
import { CrownIcon, StarIcon, WalletIcon, ChatIcon, BoltIcon, SparklesIcon, CheckIcon, LockIcon } from '../components/Icons'

type PaymentMethod = 'telegram' | 'ton'

const PRO_FEATURES = [
  {
    icon: <WalletIcon size={22} color="#FFD700" />,
    title: 'Скидка на открытие контакта',
    description: 'Платите $0.25 вместо $0.5 за каждый открытый контакт',
  },
  {
    icon: <BoltIcon size={22} color="#FFD700" />,
    title: 'Приоритет в ленте',
    description: 'Ваши вещи показываются в первую очередь другим пользователям',
  },
  {
    icon: <SparklesIcon size={22} color="#FFD700" />,
    title: 'Расширенная статистика',
    description: 'Просмотры, лайки, конверсия по каждой вашей вещи',
  },
  {
    icon: <ChatIcon size={22} color="#FFD700" />,
    title: 'Обсуждать доплату',
    description: 'Возможность обсуждать денежную доплату к обмену',
  },
  {
    icon: <StarIcon size={22} color="#FFD700" />,
    title: 'Безлимитные объявления',
    description: 'Публикуйте сколько угодно вещей без ограничений',
  },
]

const ProPage: React.FC = () => {
  const navigate = useNavigate()
  const tonWallet = useTonWallet()
  const [tonConnectUI] = useTonConnectUI()
  const { showBackButton, hideBackButton, showMainButton, hideMainButton, hapticFeedback, openInvoice } = useTelegram()
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('telegram')
  const [isSubscribing, setIsSubscribing] = useState(false)
  const [isPro, setIsPro] = useState(false)
  const [tonError, setTonError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    showBackButton(() => navigate(-1))
    barterApi.getProStatus().then(s => setIsPro(s.active)).catch(() => {})
    return () => {
      hideBackButton()
      hideMainButton()
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [showBackButton, hideBackButton, navigate, hideMainButton])

  const handleSubscribe = useCallback(async () => {
    setIsSubscribing(true)
    hapticFeedback('medium')

    try {
      const { invoice_link } = await barterApi.subscribePro()

      openInvoice(invoice_link, (status) => {
        if (status !== 'paid') {
          setIsSubscribing(false)
          if (status === 'failed' || status === 'cancelled') hapticFeedback('error')
          return
        }
        // Подтверждение приходит асинхронно через /telegram/webhook — поллим статус
        pollRef.current = setInterval(async () => {
          const s = await barterApi.getProStatus()
          if (s.active) {
            setIsPro(true)
            setIsSubscribing(false)
            hapticFeedback('success')
            if (pollRef.current) clearInterval(pollRef.current)
          }
        }, 2500)
      })
    } catch (e) {
      console.error('[Pro] subscribe failed:', e)
      setIsSubscribing(false)
      hapticFeedback('error')
    }
  }, [hapticFeedback, openInvoice])

  const handleTonSubscribe = useCallback(async () => {
    if (!tonWallet) return
    setIsSubscribing(true)
    setTonError(null)
    hapticFeedback('medium')

    try {
      const info = await barterApi.getSubscriptionTonInfo()
      await sendTonPayment(tonConnectUI, info.address, info.amount_nanoton, info.comment)

      let attempts = 0
      const interval = setInterval(async () => {
        attempts += 1
        try {
          const res = await barterApi.verifySubscriptionTonPayment(info.subscription_id)
          if (res.verified) {
            setIsPro(true)
            setIsSubscribing(false)
            hapticFeedback('success')
            clearInterval(interval)
          }
        } catch { /* транзакция ещё не найдена */ }

        if (attempts > 20) {
          setIsSubscribing(false)
          setTonError('Транзакция не подтвердилась. Попробуйте снова через пару минут.')
          clearInterval(interval)
        }
      }, 6000)
    } catch (e) {
      console.error('[Pro] TON subscribe failed:', e)
      setIsSubscribing(false)
      setTonError('Не удалось отправить транзакцию.')
      hapticFeedback('error')
    }
  }, [tonWallet, tonConnectUI, hapticFeedback])

  return (
    <div style={containerStyle}>
      <div style={contentStyle}>
        {/* Hero */}
        <div style={heroStyle}>
          <div style={proBadgeContainerStyle}>
            <CrownIcon size={44} color="#FFD700" />
          </div>
          <h1 style={titleStyle}>Подписка PRO</h1>
          <p style={subtitleStyle}>
            Получите максимум от бартер-маркетплейса
          </p>
        </div>

        {/* Price */}
        <div style={priceCardStyle}>
          <div style={priceRowStyle}>
            <span style={priceAmountStyle}>$10</span>
            <span style={pricePeriodStyle}>/месяц</span>
          </div>
          <p style={priceHintStyle}>
            Отмените в любой момент
          </p>
        </div>

        {/* Features */}
        <div style={featuresStyle}>
          <h2 style={featuresTitleStyle}>Преимущества:</h2>
          {PRO_FEATURES.map((feature, index) => (
            <div key={index} style={featureCardStyle}>
              <div style={featureIconContainerStyle}>
                {feature.icon}
              </div>
              <div style={featureTextStyle}>
                <p style={featureTitleStyle}>{feature.title}</p>
                <p style={featureDescStyle}>{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Subscribe */}
        <div style={actionAreaStyle}>
          {isPro ? (
            <div style={successStyle}>
              <CheckIcon size={32} color="#2ed573" />
              <p style={successTextStyle}>Вы PRO! Спасибо за поддержку!</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10, width: '100%' }}>
                <button
                  onClick={() => setPaymentMethod('telegram')}
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: 10,
                    border: paymentMethod === 'telegram' ? '1px solid rgba(102,126,234,0.5)' : '1px solid rgba(255,255,255,0.1)',
                    background: paymentMethod === 'telegram' ? 'rgba(102,126,234,0.15)' : 'transparent',
                    color: paymentMethod === 'telegram' ? '#a29bfe' : 'rgba(255,255,255,0.4)',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Telegram
                </button>
                <button
                  onClick={() => setPaymentMethod('ton')}
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: 10,
                    border: paymentMethod === 'ton' ? '1px solid rgba(0,152,234,0.5)' : '1px solid rgba(255,255,255,0.1)',
                    background: paymentMethod === 'ton' ? 'rgba(0,152,234,0.15)' : 'transparent',
                    color: paymentMethod === 'ton' ? '#0098EA' : 'rgba(255,255,255,0.4)',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  💎 TON
                </button>
              </div>

              {paymentMethod === 'telegram' ? (
                <button
                  style={subscribeButtonStyle}
                  onClick={handleSubscribe}
                  disabled={isSubscribing}
                >
                  {isSubscribing ? (
                    'Оформление...'
                  ) : (
                    <>
                      <CrownIcon size={18} color="#1a1a2e" />
                      <span style={{ marginLeft: 8 }}>Стать PRO за $10/мес</span>
                    </>
                  )}
                </button>
              ) : !tonWallet ? (
                <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                  <TonConnectButton />
                </div>
              ) : (
                <button
                  style={{ ...subscribeButtonStyle, background: 'linear-gradient(135deg, #0098EA 0%, #12B5FF 100%)', color: '#fff' }}
                  onClick={handleTonSubscribe}
                  disabled={isSubscribing}
                >
                  {isSubscribing ? 'Ожидаем подтверждение...' : (
                    <>💎 <span style={{ marginLeft: 8 }}>Оплатить 3 TON/мес</span></>
                  )}
                </button>
              )}

              {tonError && (
                <p style={{ fontSize: 12, color: '#ff4757', textAlign: 'center', margin: '8px 0 0' }}>{tonError}</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const containerStyle: React.CSSProperties = {
  flex: 1,
  padding: '24px 20px',
  paddingTop: 'calc(env(safe-area-inset-top, 0px) + 24px)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  minHeight: '100vh',
  overflowY: 'auto',
  background: '#0d0d1a',
}

const contentStyle: React.CSSProperties = {
  maxWidth: 400,
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
}

const heroStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 8,
}

const proBadgeContainerStyle: React.CSSProperties = {
  width: 72,
  height: 72,
  borderRadius: '50%',
  background: 'rgba(255,215,0,0.1)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid rgba(255,215,0,0.2)',
}

const titleStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 700,
  margin: 0,
  background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
}

const subtitleStyle: React.CSSProperties = {
  fontSize: 14,
  color: '#8888b0',
  margin: 0,
  textAlign: 'center',
}

const priceCardStyle: React.CSSProperties = {
  background: 'rgba(255,215,0,0.06)',
  borderRadius: 16,
  padding: '20px',
  border: '1px solid rgba(255,215,0,0.15)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
}

const priceRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: 4,
}

const priceAmountStyle: React.CSSProperties = {
  fontSize: 36,
  fontWeight: 700,
  color: '#FFD700',
}

const pricePeriodStyle: React.CSSProperties = {
  fontSize: 16,
  color: '#8888b0',
}

const priceHintStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#5a5a7a',
  margin: 0,
}

const featuresStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
}

const featuresTitleStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  margin: 0,
  color: '#e8e8f0',
}

const featureCardStyle: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  padding: '12px 16px',
  background: 'rgba(255,255,255,0.03)',
  borderRadius: 12,
  alignItems: 'flex-start',
  border: '1px solid rgba(255,255,255,0.05)',
  transition: 'transform 0.15s ease',
}

const featureIconContainerStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 10,
  background: 'rgba(255,215,0,0.08)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
}

const featureTextStyle: React.CSSProperties = {
  flex: 1,
}

const featureTitleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: '#e8e8f0',
  margin: '0 0 4px 0',
}

const featureDescStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#8888b0',
  margin: 0,
  lineHeight: 1.4,
}

const actionAreaStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
}

const walletRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  padding: '8px 12px',
  background: 'rgba(255,255,255,0.03)',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.05)',
}

const walletLabelStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#8888b0',
}

const subscribeButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '16px',
  borderRadius: 12,
  border: 'none',
  background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
  color: '#1a1a2e',
  fontSize: 15,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 4px 20px rgba(255,215,0,0.3)',
  transition: 'transform 0.15s ease',
}

const successStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 8,
  padding: 20,
  background: 'rgba(46,213,115,0.08)',
  borderRadius: 16,
  border: '1px solid rgba(46,213,115,0.2)',
}

const successTextStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: '#2ed573',
  margin: 0,
  textAlign: 'center',
}

const promptStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#5a5a7a',
  textAlign: 'center',
  margin: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

export default ProPage
