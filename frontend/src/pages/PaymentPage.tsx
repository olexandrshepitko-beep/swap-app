import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTelegram } from '../telegram/TelegramProvider'
import { useLanguage } from '../i18n/LanguageContext'
import { CheckIcon, ClockIcon, LockIcon, ChatIcon, StarIcon, WalletIcon, UserIcon } from '../components/Icons'

const PaymentPage: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>()
  const navigate = useNavigate()
  const { showBackButton, hideBackButton, showMainButton, hideMainButton, hapticFeedback } = useTelegram()
  const { t } = useLanguage()

  const [hasPaid, setHasPaid] = useState(false)
  const [opponentPaid, setOpponentPaid] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    showBackButton(() => navigate(-1))
    return () => {
      hideBackButton()
      hideMainButton()
    }
  }, [showBackButton, hideBackButton, navigate, hideMainButton])

  useEffect(() => {
    if (hasPaid && opponentPaid) {
      showMainButton(t('payment.openChat'), () => {
        hapticFeedback('heavy')
        window.Telegram?.WebApp?.openTelegramLink('https://t.me/BarterMarketBot?start=chat_' + matchId)
      })
    } else if (hasPaid) {
      hideMainButton()
    }
    return () => hideMainButton()
  }, [hasPaid, opponentPaid, showMainButton, hideMainButton, hapticFeedback, matchId])

  const handlePayment = useCallback(() => {
    setIsProcessing(true)
    hapticFeedback('medium')

    setTimeout(() => {
      setHasPaid(true)
      setIsProcessing(false)
      hapticFeedback('success')

      setTimeout(() => {
        setOpponentPaid(true)
      }, 2000)
    }, 1500)
  }, [hapticFeedback])

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
          {bothPaid ? t('payment.contactOpen') : t('payment.payForContact')}
        </h1>

        <p style={descriptionStyle}>
          {t('payment.desc')}
        </p>

        {/* Status cards */}
        <div style={statusCardsStyle}>
          <div style={{ ...statusCardStyle, ...(hasPaid ? statusCardActiveStyle : {}) }}>
            <span style={statusIconContainer}>
              {hasPaid ? <CheckIcon size={20} color="#2ed573" /> : <ClockIcon size={20} color="#ffa502" />}
            </span>
            <div>
              <p style={statusLabelStyle}>{t('payment.you')}</p>
              <p style={statusValueStyle}>
                {hasPaid ? t('payment.paid') : t('payment.waiting')}
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
              <p style={statusLabelStyle}>{t('payment.owner')}</p>
              <p style={statusValueStyle}>
                {opponentPaid ? t('payment.paid') : t('payment.waiting')}
              </p>
            </div>
          </div>
        </div>

        {/* Payment card */}
        {!bothPaid && (
          <div style={paymentCardStyle}>
            <div style={priceRowStyle}>
              <span style={priceLabelStyle}>{t('payment.cost')}</span>
              <span style={priceValueStyle}>$0.50</span>
            </div>

            {!hasPaid && (
              <button
                style={payButtonStyle}
                onClick={handlePayment}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  t('payment.processing')
                ) : (
                  <>
                    <WalletIcon size={16} color="#fff" />
                    <span style={{ marginLeft: 8 }}>{t('payment.payViaTelegram')}</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Chat reveal */}
        {bothPaid && (
          <div style={chatRevealStyle}>
            <div style={avatarStyle}>
              {matchId?.[0]?.toUpperCase() || '?'}
            </div>
            <p style={usernameTextStyle}>@username_власника</p>
            <p style={hintTextStyle}>
              {t('payment.chatHint')}
            </p>
          </div>
        )}

        {/* Features list */}
        <div style={featuresStyle}>
          <div style={featureItemStyle}>
            <LockIcon size={14} color="#5a5a7a" />
            <span style={featureTextStyle}>
              {t('payment.feature1')}
            </span>
          </div>
          <div style={featureItemStyle}>
            <WalletIcon size={14} color="#5a5a7a" />
            <span style={featureTextStyle}>
              {t('payment.feature2')}
            </span>
          </div>
          <div style={featureItemStyle}>
            <StarIcon size={14} color="#5a5a7a" />
            <span style={featureTextStyle}>
              {t('payment.feature3')}
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
  minHeight: 'var(--app-height, 100vh)',
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
