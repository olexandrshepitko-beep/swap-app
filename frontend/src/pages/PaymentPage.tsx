import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTonConnectUI, useTonWallet, TonConnectButton } from '@tonconnect/ui-react'
import { useTelegram } from '../telegram/TelegramProvider'
import { barterApi } from '../services/api'
import { sendTonPayment } from '../services/tonPayment'
import { CheckIcon, ClockIcon, LockIcon, ChatIcon, StarIcon, WalletIcon, UserIcon } from '../components/Icons'

type PaymentMethod = 'telegram' | 'ton'

const PaymentPage: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>()
  const navigate = useNavigate()
  const { showBackButton, hideBackButton, showMainButton, hideMainButton, hapticFeedback, openInvoice } = useTelegram()
  const [tonConnectUI] = useTonConnectUI()
  const tonWallet = useTonWallet()

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('telegram')
  const [hasPaid, setHasPaid] = useState(false)
  const [opponentPaid, setOpponentPaid] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const tonVerifyPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    showBackButton(() => navigate(-1))
    return () => {
      hideBackButton()
      hideMainButton()
    }
  }, [showBackButton, hideBackButton, navigate, hideMainButton])

  useEffect(() => {
    if (hasPaid && opponentPaid && matchId) {
      showMainButton('Открыть чат в Telegram', () => {
        hapticFeedback('heavy')
        barterApi.getChatUnlock(Number(matchId)).then(res => {
          if (res.deep_link) {
            window.Telegram?.WebApp?.openTelegramLink(res.deep_link)
          }
        })
      })
    } else if (hasPaid) {
      hideMainButton()
    }
    return () => hideMainButton()
  }, [hasPaid, opponentPaid, showMainButton, hideMainButton, hapticFeedback, matchId])

  // Опрос статуса с бэкенда — единственный источник правды.
  // Реальное подтверждение приходит на бэкенд асинхронно через
  // /telegram/webhook (successful_payment), поэтому после закрытия
  // окна оплаты мы поллим статус, а не доверяем колбэку openInvoice.
  const pollStatus = useCallback(() => {
    if (!matchId) return
    if (pollRef.current) clearInterval(pollRef.current)

    pollRef.current = setInterval(async () => {
      const [status, matches] = await Promise.all([
        barterApi.getPaymentStatus(Number(matchId)),
        barterApi.getMatches(),
      ])
      if (status?.status === 'paid') {
        setHasPaid(true)
        hapticFeedback('success')
      }
      const thisMatch = matches.find(m => m.id === Number(matchId))
      if (thisMatch?.status === 'active') {
        // Матч переходит в 'active' только когда ОБЕ стороны оплатили
        // (см. payment_service._check_both_paid_and_unlock на бэкенде)
        setOpponentPaid(true)
        if (pollRef.current) clearInterval(pollRef.current)
      }
    }, 2500)
  }, [matchId, hapticFeedback])

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      if (tonVerifyPollRef.current) clearInterval(tonVerifyPollRef.current)
    }
  }, [])

  const handlePayment = useCallback(async () => {
    if (!matchId) return
    setIsProcessing(true)
    setError(null)
    hapticFeedback('medium')

    try {
      const { invoice_link } = await barterApi.initiatePayment(Number(matchId))

      openInvoice(invoice_link, (status) => {
        setIsProcessing(false)
        if (status === 'paid') {
          // Оптимистичный UI — но hasPaid по-настоящему подтвердит poll ниже
          pollStatus()
        } else if (status === 'failed' || status === 'cancelled') {
          hapticFeedback('error')
        }
      })
    } catch (e) {
      setIsProcessing(false)
      setError('Не удалось начать оплату. Попробуйте ещё раз.')
      hapticFeedback('error')
    }
  }, [matchId, hapticFeedback, openInvoice, pollStatus])

  const handleTonPayment = useCallback(async () => {
    if (!matchId || !tonWallet) return
    setIsProcessing(true)
    setError(null)
    hapticFeedback('medium')

    try {
      const info = await barterApi.getTonPaymentInfo(Number(matchId))
      await sendTonPayment(tonConnectUI, info.address, info.amount_nanoton, info.comment)

      // Транзакция подписана в кошельке, но подтверждение в блокчейне
      // занимает время — поллим верификацию на бэкенде.
      if (tonVerifyPollRef.current) clearInterval(tonVerifyPollRef.current)
      let attempts = 0
      tonVerifyPollRef.current = setInterval(async () => {
        attempts += 1
        try {
          const res = await barterApi.verifyTonPayment(Number(matchId))
          if (res.verified) {
            setHasPaid(true)
            hapticFeedback('success')
            setIsProcessing(false)
            if (tonVerifyPollRef.current) clearInterval(tonVerifyPollRef.current)
            pollStatus() // дальше следим за оплатой второй стороны как обычно
          }
        } catch { /* транзакция ещё не найдена — пробуем снова */ }

        if (attempts > 20) { // ~2 минуты
          setIsProcessing(false)
          setError('Транзакция не подтвердилась. Проверьте кошелёк и попробуйте verify ещё раз.')
          if (tonVerifyPollRef.current) clearInterval(tonVerifyPollRef.current)
        }
      }, 6000)
    } catch (e) {
      setIsProcessing(false)
      setError('Не удалось отправить транзакцию. Попробуйте ещё раз.')
      hapticFeedback('error')
    }
  }, [matchId, tonWallet, tonConnectUI, hapticFeedback, pollStatus])

  const bothPaid = hasPaid && opponentPaid

  return (
    <div style={containerStyle}>
      <div style={contentStyle}>
              <div style={{
                width: 80, height: 80, borderRadius: '50%',
                background: bothPaid ? 'rgba(46,213,115,0.1)' : 'rgba(102,126,234,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid ' + (bothPaid ? 'rgba(46,213,115,0.2)' : 'rgba(102,126,234,0.2)'),
              }}>
          {bothPaid ? (
            <CheckIcon size={48} color="#2ed573" />
          ) : (
            <LockIcon size={48} color="#667eea" />
          )}
        </div>

        <h1 style={titleStyle}>
          {bothPaid ? 'Контакт открыт!' : 'Оплата контакта'}
        </h1>

        <p style={descriptionStyle}>
          Контакт владельца откроется после оплаты обеими сторонами.
        </p>

        {/* Status cards */}
        <div style={statusCardsStyle}>
          <div style={{ ...statusCardStyle, ...(hasPaid ? statusCardActiveStyle : {}) }}>
            <span style={statusIconContainer}>
              {hasPaid ? <CheckIcon size={20} color="#2ed573" /> : <ClockIcon size={20} color="#ffa502" />}
            </span>
            <div>
              <p style={statusLabelStyle}>Вы</p>
              <p style={statusValueStyle}>
                {hasPaid ? 'Оплачено' : 'Ожидает оплаты'}
              </p>
            </div>
          </div>

          <div style={dividerStyle}>
            <span style={dividerTextStyle}>+</span>
          </div>

          <div style={{ ...statusCardStyle, ...(opponentPaid ? statusCardActiveStyle : {}) }}>
            <span style={statusIconContainer}>
              {opponentPaid ? <CheckIcon size={20} color="#2ed573" /> : <ClockIcon size={20} color="#ffa502" />}
            </span>
            <div>
              <p style={statusLabelStyle}>Владелец вещи</p>
              <p style={statusValueStyle}>
                {opponentPaid ? 'Оплачено' : 'Ожидает оплаты'}
              </p>
            </div>
          </div>
        </div>

        {/* Payment card */}
        {!bothPaid && (
          <div style={paymentCardStyle}>
            <div style={priceRowStyle}>
              <span style={priceLabelStyle}>Стоимость открытия:</span>
              <span style={priceValueStyle}>{paymentMethod === 'telegram' ? '$0.50' : '0.15 TON'}</span>
            </div>

            {!hasPaid && (
              <>
                {/* Переключатель способа оплаты */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
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
                    style={payButtonStyle}
                    onClick={handlePayment}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      'Обработка...'
                    ) : (
                      <>
                        <WalletIcon size={16} color="#fff" />
                        <span style={{ marginLeft: 8 }}>Оплатить через Telegram</span>
                      </>
                    )}
                  </button>
                ) : !tonWallet ? (
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <TonConnectButton />
                  </div>
                ) : (
                  <button
                    style={{ ...payButtonStyle, background: 'linear-gradient(135deg, #0098EA 0%, #12B5FF 100%)' }}
                    onClick={handleTonPayment}
                    disabled={isProcessing}
                  >
                    {isProcessing ? 'Ожидаем подтверждение...' : (
                      <>💎 <span style={{ marginLeft: 8 }}>Отправить 0.15 TON</span></>
                    )}
                  </button>
                )}

                {error && (
                  <p style={{ fontSize: 12, color: '#ff4757', textAlign: 'center', margin: 0 }}>{error}</p>
                )}
              </>
            )}
          </div>
        )}

        {/* Chat reveal */}
        {bothPaid && (
          <div style={chatRevealStyle}>
            <div style={avatarStyle}>
              {matchId?.[0]?.toUpperCase() || '?'}
            </div>
            <p style={usernameTextStyle}>@username_владельца</p>
            <p style={hintTextStyle}>
              Нажмите кнопку ниже, чтобы открыть чат
            </p>
          </div>
        )}

        {/* Features list */}
        <div style={featuresStyle}>
          <div style={featureItemStyle}>
            <LockIcon size={14} color="#5a5a7a" />
            <span style={featureTextStyle}>
              Ваши данные скрыты до оплаты обеими сторонами
            </span>
          </div>
          <div style={featureItemStyle}>
            <WalletIcon size={14} color="#5a5a7a" />
            <span style={featureTextStyle}>
              Средства возвращаются, если вторая сторона не оплатит
            </span>
          </div>
          <div style={featureItemStyle}>
            <StarIcon size={14} color="#5a5a7a" />
            <span style={featureTextStyle}>
              PRO пользователи платят $0.25
            </span>
          </div>
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
  alignItems: 'center',
  gap: 20,
}

// bothPaid используется внутри компонента как inline-стиль

const titleStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  margin: 0,
  textAlign: 'center',
  color: '#e8e8f0',
}

const descriptionStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#8888b0',
  textAlign: 'center',
  margin: 0,
  lineHeight: 1.5,
}

const statusCardsStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
}

const statusCardStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '12px 16px',
  borderRadius: 12,
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.06)',
  transition: 'all 0.3s ease',
}

const statusCardActiveStyle: React.CSSProperties = {
  background: 'rgba(46,213,115,0.08)',
  borderColor: 'rgba(46,213,115,0.2)',
}

const statusIconContainer: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: '50%',
  background: 'rgba(255,255,255,0.05)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
}

const statusLabelStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#8888b0',
  margin: 0,
}

const statusValueStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: '#e8e8f0',
  margin: 0,
}

const dividerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  padding: '2px 0',
}

const dividerTextStyle: React.CSSProperties = {
  fontSize: 16,
  color: '#5a5a7a',
}

const paymentCardStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(102,126,234,0.06)',
  borderRadius: 16,
  padding: 20,
  border: '1px solid rgba(102,126,234,0.15)',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
}

const priceRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}

const priceLabelStyle: React.CSSProperties = {
  fontSize: 14,
  color: '#c0c0d0',
}

const priceValueStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  color: '#fff',
}

const payButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px',
  borderRadius: 12,
  border: 'none',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: '#fff',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 4px 20px rgba(102,126,234,0.3)',
  transition: 'transform 0.15s ease',
}

const chatRevealStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 12,
  padding: 20,
  background: 'rgba(46,213,115,0.06)',
  borderRadius: 16,
  border: '1px solid rgba(46,213,115,0.2)',
}

const avatarStyle: React.CSSProperties = {
  width: 64,
  height: 64,
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 24,
  fontWeight: 700,
  color: '#fff',
}

const usernameTextStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: '#e8e8f0',
  margin: 0,
}

const hintTextStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#5a5a7a',
  margin: 0,
  textAlign: 'center',
}

const featuresStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  marginTop: 4,
}

const featureItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 8,
}

const featureTextStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#5a5a7a',
  lineHeight: 1.5,
}

export default PaymentPage
