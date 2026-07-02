import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTelegram } from '../telegram/TelegramProvider'
import { useLanguage } from '../i18n/LanguageContext'
// TonConnect temporarily disabled
// import { TonConnectButton, useTonWallet } from '@tonconnect/ui-react'
import { CrownIcon, StarIcon, WalletIcon, ChatIcon, BoltIcon, SparklesIcon, CheckIcon, LockIcon } from '../components/Icons'

const PRO_FEATURES_DATA = [
  {
    icon: <WalletIcon size={22} color="#FFD700" />,
    titleKey: 'pro.feat1Title' as const,
    descKey: 'pro.feat1Desc' as const,
  },
  {
    icon: <BoltIcon size={22} color="#FFD700" />,
    titleKey: 'pro.feat2Title' as const,
    descKey: 'pro.feat2Desc' as const,
  },
  {
    icon: <SparklesIcon size={22} color="#FFD700" />,
    titleKey: 'pro.feat3Title' as const,
    descKey: 'pro.feat3Desc' as const,
  },
  {
    icon: <ChatIcon size={22} color="#FFD700" />,
    titleKey: 'pro.feat4Title' as const,
    descKey: 'pro.feat4Desc' as const,
  },
  {
    icon: <StarIcon size={22} color="#FFD700" />,
    titleKey: 'pro.feat5Title' as const,
    descKey: 'pro.feat5Desc' as const,
  },
]

const ProPage: React.FC = () => {
  const navigate = useNavigate()
  const { showBackButton, hideBackButton, showMainButton, hideMainButton, hapticFeedback } = useTelegram()
  const { t } = useLanguage()
  const [isSubscribing, setIsSubscribing] = useState(false)
  const [isPro, setIsPro] = useState(false)

  useEffect(() => {
    showBackButton(() => navigate(-1))
    return () => {
      hideBackButton()
      hideMainButton()
    }
  }, [showBackButton, hideBackButton, navigate, hideMainButton])

  const handleSubscribe = useCallback(() => {
    setIsSubscribing(true)
    hapticFeedback('medium')

    setTimeout(() => {
      setIsPro(true)
      setIsSubscribing(false)
      hapticFeedback('success')
    }, 2000)
  }, [hapticFeedback])

  return (
    <div style={containerStyle}>
      <div style={contentStyle}>
        {/* Hero */}
        <div style={heroStyle}>
          <div style={proBadgeContainerStyle}>
            <CrownIcon size={44} color="#FFD700" />
          </div>
          <h1 style={titleStyle}>{t('pro.title')}</h1>
          <p style={subtitleStyle}>
            {t('pro.subtitle')}
          </p>
        </div>

        {/* Price */}
        <div style={priceCardStyle}>
          <div style={priceRowStyle}>
            <span style={priceAmountStyle}>$10</span>
            <span style={pricePeriodStyle}>{t('pro.perMonth')}</span>
          </div>
          <p style={priceHintStyle}>
            {t('pro.cancelAnytime')}
          </p>
        </div>

        {/* Features */}
        <div style={featuresStyle}>
          <h2 style={featuresTitleStyle}>{t('pro.features')}:</h2>
          {PRO_FEATURES_DATA.map((feature, index) => (
            <div key={index} style={featureCardStyle}>
              <div style={featureIconContainerStyle}>
                {feature.icon}
              </div>
              <div style={featureTextStyle}>
                <p style={featureTitleStyle}>{t(feature.titleKey)}</p>
                <p style={featureDescStyle}>{t(feature.descKey)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Subscribe */}
        <div style={actionAreaStyle}>
          {isPro ? (
            <div style={successStyle}>
              <CheckIcon size={32} color="#2ed573" />
              <p style={successTextStyle}>{t('pro.success')}</p>
            </div>
          ) : (
            <button
              style={subscribeButtonStyle}
              onClick={handleSubscribe}
              disabled={isSubscribing}
            >
              {isSubscribing ? (
                t('pro.processing')
              ) : (
                <>
                  <CrownIcon size={18} color="#1a1a2e" />
                  <span style={{ marginLeft: 8 }}>{t('pro.subscribePrice')}</span>
                </>
              )}
            </button>
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
  minHeight: 'var(--app-height, 100vh)',
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
