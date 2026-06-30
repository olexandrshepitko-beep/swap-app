import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useTelegram } from '../telegram/TelegramProvider'
import { useLanguage } from '../i18n/LanguageContext'
import { BoltIcon, CrownIcon, ChatIcon, LockIcon, StarIcon, CameraIcon } from '../components/Icons'

const StartPage: React.FC = () => {
  const navigate = useNavigate()
  const { showMainButton, hideMainButton, hapticFeedback } = useTelegram()
  const { lang, setShowLanguageSelector, t } = useLanguage()

  React.useEffect(() => {
    showMainButton(t('start.watchFeed'), () => {
      hapticFeedback('medium')
      navigate('/feed')
    })
    return () => hideMainButton()
  }, [showMainButton, hideMainButton, hapticFeedback, navigate, t])

  return (
    <div style={containerStyle}>
      {/* Top row: language button + demo badge */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        width: '100%', maxWidth: 380,
        paddingBottom: 8, zIndex: 2, position: 'relative',
      }}>
        <button
          onClick={() => setShowLanguageSelector(true)}
          style={{
            padding: '6px 10px', borderRadius: 20,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#8888b0', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          🌐
        </button>
        <div style={{
          padding: '6px 12px', borderRadius: 20,
          background: 'rgba(255,215,0,0.1)',
          border: '1px solid rgba(255,215,0,0.25)',
          color: '#FFD700', fontSize: 11, fontWeight: 600,
          fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <CrownIcon size={14} color="#FFD700" />
          <span>{t('start.demoMode')}</span>
        </div>
      </div>

      {/* Animated background pulse */}
      <div style={bgAnimationStyle} />

      <div style={contentStyle}>
        {/* Animated Logo */}
        <div style={logoContainerStyle}>
          <div style={logoSvgStyle}>
            <BoltIcon size={48} color="url(#start-gradient)" />
          </div>
        </div>
        <h1 style={titleStyle}>Barter</h1>
        <p style={subtitleStyle}>{t('start.subtitle')}</p>

        {/* Value card */}
        <div style={cardStyle}>
          <div style={iconRowStyle}>
            <div style={avatarCircleStyle}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#667eea" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div style={handshakeIconWrapper}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#764ba2" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z" />
              </svg>
            </div>
            <div style={avatarCircleStyle}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#667eea" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          </div>
          <p style={valuePropStyle}>
            {t('start.valueProp')}
          </p>
          <p style={valuePropDescStyle}>
            {t('start.valuePropDesc')}
          </p>
        </div>

        {/* Steps */}
        <div style={stepsContainerStyle}>
          <div style={stepStyle}>
            <span style={stepNumberStyle}>1</span>
            <span style={stepTextStyle}>{t('start.step1')}</span>
          </div>
          <div style={stepStyle}>
            <span style={stepNumberStyle}>2</span>
            <span style={stepTextStyle}>{t('start.step2')}</span>
          </div>
          <div style={stepStyle}>
            <span style={stepNumberStyle}>3</span>
            <span style={stepTextStyle}>{t('start.step3')}</span>
          </div>
        </div>

        {/* Privacy hint */}
        <div style={hintContainerStyle}>
          <LockIcon size={14} color="#5a5a7a" />
          <span style={hintStyle}>{t('start.privacyHint')}</span>
        </div>

        {/* CTA — завантажити річ */}
        <button
          onClick={() => {
            hapticFeedback('light')
            navigate('/create')
          }}
          style={{
            width: '100%', padding: '14px 24px', borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'transparent',
            color: '#c0c0d0', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.2s ease',
          }}
        >
          <CameraIcon size={16} color="#8888b0" />
          {t('start.uploadYourItem')}
        </button>
      </div>
    </div>
  )
}

const containerStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '16px 20px 100px',
  minHeight: '100dvh',
  position: 'relative',
  overflow: 'hidden',
  background: '#0d0d1a',
}

const bgAnimationStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0, left: 0, right: 0, bottom: 0,
  background: 'radial-gradient(ellipse at 50% 0%, rgba(102,126,234,0.08) 0%, transparent 60%)',
  animation: 'bgPulse 4s ease-in-out infinite alternate',
  pointerEvents: 'none',
}

const contentStyle: React.CSSProperties = {
  maxWidth: 380,
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 20,
  position: 'relative',
  zIndex: 1,
}

const logoContainerStyle: React.CSSProperties = {
  width: 80,
  height: 80,
  borderRadius: 24,
  background: 'linear-gradient(135deg, rgba(102,126,234,0.2) 0%, rgba(118,75,162,0.2) 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid rgba(102,126,234,0.2)',
  animation: 'logoFloat 3s ease-in-out infinite',
}

const logoSvgStyle: React.CSSProperties = {
  animation: 'hueRotate 3s linear infinite',
}

const titleStyle: React.CSSProperties = {
  fontSize: 36,
  fontWeight: 700,
  margin: 0,
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  animation: 'hueRotate 3s linear infinite',
}

const subtitleStyle: React.CSSProperties = {
  fontSize: 15,
  color: '#8888b0',
  margin: 0,
  textAlign: 'center',
  animation: 'fadeUp 0.6s ease-out',
}

const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  borderRadius: 16,
  padding: '24px 20px',
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 10,
  border: '1px solid rgba(255,255,255,0.06)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  animation: 'fadeUp 0.6s ease-out 0.1s both',
}

const iconRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
}

const avatarCircleStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: '50%',
  background: 'rgba(102,126,234,0.12)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid rgba(102,126,234,0.2)',
}

const handshakeIconWrapper: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: '50%',
  background: 'rgba(118,75,162,0.12)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid rgba(118,75,162,0.2)',
  margin: '0 4px',
}

const valuePropStyle: React.CSSProperties = {
  fontSize: 15,
  color: '#c0c0d0',
  textAlign: 'center',
  margin: 0,
  lineHeight: 1.5,
}

const valuePropDescStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#8888b0',
  textAlign: 'center',
  margin: 0,
  lineHeight: 1.4,
}

const stepsContainerStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
}

const stepStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  fontSize: 14,
  color: '#b0b0c8',
  padding: '10px 14px',
  background: 'rgba(255,255,255,0.03)',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.05)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  animation: 'fadeUp 0.5s ease-out both',
}

const stepNumberStyle: React.CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 12,
  fontWeight: 600,
  color: '#fff',
  flexShrink: 0,
}

const stepTextStyle: React.CSSProperties = {
  color: '#b0b0c8',
  fontSize: 13,
}

const hintContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
}

const hintStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#5a5a7a',
  margin: 0,
}

export default StartPage
