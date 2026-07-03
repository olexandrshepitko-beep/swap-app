import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTelegram } from '../telegram/TelegramProvider'
import { barterApi } from '../services/api'
import { CameraIcon, RefreshIcon, LockIcon, CheckIcon, StarIcon } from '../components/Icons'

type Step = 1 | 2 | 3

const CATEGORIES = [
  { value: 'electronics', label: 'Электроника', icon: '📱' },
  { value: 'clothing', label: 'Одежда', icon: '👕' },
  { value: 'books', label: 'Книги', icon: '📚' },
  { value: 'home', label: 'Дом и сад', icon: '🏠' },
  { value: 'sports', label: 'Спорт', icon: '⚽' },
  { value: 'toys', label: 'Игрушки', icon: '🎲' },
  { value: 'other', label: 'Другое', icon: '📦' },
]

const CONDITIONS = [
  { value: 'new', label: 'Новый', icon: '🆕' },
  { value: 'like_new', label: 'Как новый', icon: '✨' },
  { value: 'good', label: 'Хорошее', icon: '👍' },
  { value: 'fair', label: 'Удовлетворительное', icon: '👌' },
]

const CreateItemPage: React.FC = () => {
  const navigate = useNavigate()
  const { showMainButton, hideMainButton, showBackButton, hideBackButton, hapticFeedback } = useTelegram()

  const [step, setStep] = useState<Step>(1)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0].value)
  const [condition, setCondition] = useState(CONDITIONS[0].value)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const videoRef = useRef<HTMLVideoElement>(null)

  // Handle back button
  useEffect(() => {
    const handleBack = () => {
      if (step === 1) {
        navigate(-1)
      } else {
        setStep((prev) => (prev - 1) as Step)
      }
    }
    showBackButton(handleBack)
    return () => hideBackButton()
  }, [step, showBackButton, hideBackButton, navigate])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Update main button per step
  useEffect(() => {
    switch (step) {
      case 1:
        showMainButton('Далее', () => {
          if (videoUrl) {
            hapticFeedback('light')
            setStep(2)
          }
        }, videoUrl ? undefined : '#555')
        break
      case 2:
        showMainButton('Далее', () => {
          if (title.trim()) {
            hapticFeedback('light')
            setStep(3)
          }
        }, title.trim() ? undefined : '#555')
        break
      case 3:
        showMainButton(isSubmitting ? 'Публикация...' : 'Опубликовать', () => {
          if (isSubmitting) return
          hapticFeedback('medium')
          handleSubmit()
        }, isSubmitting ? '#555' : undefined)
        break
    }
    return () => hideMainButton()
  }, [step, videoUrl, title, isSubmitting])

  const fileInputRef = useRef<HTMLInputElement>(null)

  const startRecording = useCallback(async () => {
    // Сначала показываем видео-элемент, чтобы ref был зацеплен
    setIsRecording(true)
    hapticFeedback('medium')
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 720 }, height: { ideal: 1280 } },
        audio: true,
      })

      // Теперь videoRef.current указывает на новый <video>, ставим stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        // Явный play — в Telegram WebView autoPlay не всегда работает с srcObject
        videoRef.current.play().catch(() => {})
      }

      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm',
      })

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType })
        const url = URL.createObjectURL(blob)
        setVideoBlob(blob)
        setVideoUrl(url)
        chunksRef.current = []

        stream.getTracks().forEach((t) => t.stop())
        if (videoRef.current) videoRef.current.srcObject = null
        setIsRecording(false)
      }

      mediaRecorderRef.current = recorder
      recorder.start()

      // Автостоп через 15 секунд
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopRecording()
        }
      }, 15_000)
    } catch (err) {
      console.error('Camera error:', err)
      setIsRecording(false)
      alert('Не удалось получить доступ к камере. Пожалуйста, разрешите доступ.')
    }
  }, [hapticFeedback])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }, [])

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 50_000_000) {
      alert('Видео слишком большое. Пожалуйста, загрузите видео до 50MB.')
      return
    }

    const url = URL.createObjectURL(file)
    setVideoBlob(file)
    setVideoUrl(url)
    // Сброс value, чтобы можно было выбрать тот же файл повторно
    e.target.value = ''

    hapticFeedback('light')
  }, [hapticFeedback])

  const handleGalleryClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!videoBlob) {
      setSubmitError('Видео обязательно')
      return
    }
    setIsSubmitting(true)
    setSubmitError(null)
    hapticFeedback('heavy')

    try {
      await barterApi.createItem({ title, description, category, condition, videoBlob })
      navigate('/feed')
    } catch (e: any) {
      console.error('[CreateItem] Failed:', e)
      const detail = e?.response?.data?.detail
      setSubmitError(
        typeof detail === 'string' ? detail : 'Не удалось опубликовать. Попробуйте ещё раз.'
      )
      hapticFeedback('error')
    } finally {
      setIsSubmitting(false)
    }
  }, [title, description, category, condition, videoBlob, hapticFeedback, navigate])

  const retryVideo = useCallback(() => {
    setVideoUrl(null)
    setVideoBlob(null)
    chunksRef.current = []
  }, [])

  return (
    <div style={containerStyle}>
      {/* Progress bar */}
      <div style={progressContainerStyle}>
        <div style={progressBarStyle}>
          <div style={{ ...progressFillStyle, width: `${(step / 3) * 100}%` }} />
        </div>
        <span style={progressTextStyle}>{step} / 3</span>
      </div>

      {step === 1 && (
        <div style={stepContentStyle}>
          <h2 style={headingStyle}>Загрузите видео вещи</h2>
          <p style={hintStyle}>5–15 секунд, покажите вещь со всех сторон</p>

          <div style={videoContainerStyle}>
            {videoUrl ? (
              <>
                <video
                  ref={videoRef}
                  src={videoUrl}
                  style={videoStyle}
                  controls
                  playsInline
                  autoPlay
                  loop
                  muted
                />
                <button style={retryButtonStyle} onClick={retryVideo}>
                  <RefreshIcon size={14} color="#fff" />
                  <span style={{ marginLeft: 6 }}>Записать заново</span>
                </button>
              </>
            ) : (
              <div style={placeholderStyle}>
                {isRecording ? (
                  <>
                    <div style={recordingIndicatorStyle}>
                      <span style={recordingDotStyle} />
                      Запись...
                    </div>
                    <video
                      ref={videoRef}
                      style={videoStyle}
                      autoPlay
                      playsInline
                      muted
                    />
                    <button style={stopButtonStyle} onClick={stopRecording}>
                      ⏹ Остановить
                    </button>
                  </>
                ) : (
                  <div style={uploadAreaStyle}>
                    <div style={cameraIconContainerStyle}>
                      <CameraIcon size={48} color="#667eea" />
                    </div>
                    <p style={uploadTextStyle}>Нажмите, чтобы записать видео</p>
                    <p style={uploadHintStyle}>или выберите из галереи</p>
                    <div style={buttonRowStyle}>
                      <button style={recordButtonStyle} onClick={startRecording}>
                        <CameraIcon size={16} color="#fff" />
                        <span style={{ marginLeft: 6 }}>Записать</span>
                      </button>
                      <button style={uploadButtonStyle} onClick={handleGalleryClick}>
                        📁 Загрузить
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="video/*"
                        style={{ display: 'none' }}
                        onChange={handleFileUpload}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={stepContentStyle}>
          <h2 style={headingStyle}>Опишите вещь</h2>

          <div style={fieldStyle}>
            <label style={labelStyle}>Название *</label>
            <input
              style={inputStyle}
              placeholder="Например: iPhone 14 Pro"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Описание</label>
            <textarea
              style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
              placeholder="Состояние, комплектация, дефекты..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Категория</label>
            <div style={gridStyle}>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  style={{
                    ...chipStyle,
                    ...(category === cat.value ? chipActiveStyle : {}),
                  }}
                  onClick={() => setCategory(cat.value)}
                >
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Состояние</label>
            <div style={gridStyle}>
              {CONDITIONS.map((cond) => (
                <button
                  key={cond.value}
                  style={{
                    ...chipStyle,
                    ...(condition === cond.value ? chipActiveStyle : {}),
                  }}
                  onClick={() => setCondition(cond.value)}
                >
                  {cond.icon} {cond.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={stepContentStyle}>
          <div style={privacyIconContainerStyle}>
            <LockIcon size={40} color="#667eea" />
          </div>
          <h2 style={headingStyle}>Почти готово!</h2>

          {submitError && (
            <div style={{
              padding: '10px 14px', borderRadius: 12, marginBottom: 4,
              background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.25)',
              color: '#ff4757', fontSize: 13, textAlign: 'center',
            }}>
              {submitError}
            </div>
          )}

          <div style={privacyCardStyle}>
            <h3 style={privacyTitleStyle}>Ваш аккаунт скрыт</h3>
            <p style={privacyTextStyle}>
              Другие пользователи видят только вашу вещь. Ваше имя, фото и контакты
              остаются скрытыми до взаимного интереса.
            </p>
          </div>

          <div style={summaryCardStyle}>
            <p style={summaryLabelStyle}>Краткая сводка:</p>
            <p style={summaryItemStyle}>
              <strong>{title}</strong>
            </p>
            <p style={summaryItemStyle}>
              {CATEGORIES.find((c) => c.value === category)?.icon} {CATEGORIES.find((c) => c.value === category)?.label} ·{' '}
              {CONDITIONS.find((c) => c.value === condition)?.icon} {CONDITIONS.find((c) => c.value === condition)?.label}
            </p>
          </div>

          <p style={disclaimerStyle}>
            После публикации ваша вещь появится в ленте других пользователей.
          </p>
        </div>
      )}
    </div>
  )
}

// Styles
const containerStyle: React.CSSProperties = {
  flex: 1,
  padding: '20px 16px',
  display: 'flex',
  flexDirection: 'column',
  overflowY: 'auto',
  minHeight: '100vh',
  background: '#0d0d1a',
}

const progressContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  marginBottom: 24,
}

const progressBarStyle: React.CSSProperties = {
  flex: 1,
  height: 6,
  background: 'rgba(255,255,255,0.08)',
  borderRadius: 3,
  overflow: 'hidden',
}

const progressFillStyle: React.CSSProperties = {
  height: '100%',
  background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
  borderRadius: 3,
  transition: 'width 0.3s ease',
}

const progressTextStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#8888b0',
  fontWeight: 500,
}

const stepContentStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
}

const headingStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 600,
  margin: 0,
  color: '#e8e8f0',
}

const hintStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#8888b0',
  margin: 0,
}

const videoContainerStyle: React.CSSProperties = {
  borderRadius: 16,
  overflow: 'hidden',
  background: '#000',
  width: '100%',
  aspectRatio: '9/16',
  maxHeight: 500,
  position: 'relative',
}

const videoStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
}

const placeholderStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
}

const uploadAreaStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 12,
  padding: 20,
}

const cameraIconContainerStyle: React.CSSProperties = {
  width: 72,
  height: 72,
  borderRadius: '50%',
  background: 'rgba(102,126,234,0.1)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid rgba(102,126,234,0.2)',
}

const uploadTextStyle: React.CSSProperties = {
  fontSize: 14,
  color: '#c0c0d0',
  margin: 0,
  textAlign: 'center',
}

const uploadHintStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#8888b0',
  margin: 0,
}

const buttonRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  marginTop: 8,
}

const recordButtonStyle: React.CSSProperties = {
  padding: '12px 24px',
  borderRadius: 12,
  border: 'none',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: '#fff',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  fontFamily: 'inherit',
  boxShadow: '0 4px 16px rgba(102,126,234,0.25)',
}

const uploadButtonStyle: React.CSSProperties = {
  padding: '12px 24px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.15)',
  background: 'transparent',
  color: '#fff',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
}

const recordingIndicatorStyle: React.CSSProperties = {
  position: 'absolute',
  top: 12,
  left: 12,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  color: '#ff4757',
  fontSize: 12,
  fontWeight: 600,
  zIndex: 2,
}

const recordingDotStyle: React.CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: '50%',
  background: '#ff4757',
  animation: 'pulse 1s infinite',
}

const stopButtonStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 20,
  padding: '12px 24px',
  borderRadius: 12,
  border: 'none',
  background: '#ff4757',
  color: '#fff',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  zIndex: 2,
}

const retryButtonStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 12,
  left: '50%',
  transform: 'translateX(-50%)',
  padding: '8px 20px',
  borderRadius: 12,
  border: 'none',
  background: 'rgba(0,0,0,0.7)',
  color: '#fff',
  fontSize: 12,
  cursor: 'pointer',
  zIndex: 2,
  display: 'flex',
  alignItems: 'center',
  backdropFilter: 'blur(8px)',
}

const fieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
}

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: '#b0b0c8',
}

const inputStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.04)',
  color: '#fff',
  fontSize: 14,
  fontFamily: 'inherit',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s ease',
}

const gridStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
}

const chipStyle: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 20,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'transparent',
  color: '#c0c0d0',
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'all 0.15s ease',
}

const chipActiveStyle: React.CSSProperties = {
  background: 'rgba(102,126,234,0.15)',
  borderColor: '#667eea',
  color: '#667eea',
}

const privacyIconContainerStyle: React.CSSProperties = {
  width: 64,
  height: 64,
  borderRadius: '50%',
  background: 'rgba(102,126,234,0.1)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto',
  border: '1px solid rgba(102,126,234,0.2)',
}

const privacyCardStyle: React.CSSProperties = {
  background: 'rgba(102,126,234,0.06)',
  borderRadius: 16,
  padding: '20px',
  border: '1px solid rgba(102,126,234,0.15)',
}

const privacyTitleStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  margin: '0 0 8px 0',
  color: '#667eea',
}

const privacyTextStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#b0b0c8',
  margin: 0,
  lineHeight: 1.5,
}

const summaryCardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  borderRadius: 12,
  padding: '16px',
  border: '1px solid rgba(255,255,255,0.05)',
}

const summaryLabelStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#8888b0',
  margin: '0 0 8px 0',
  textTransform: 'uppercase',
  letterSpacing: 1,
}

const summaryItemStyle: React.CSSProperties = {
  fontSize: 14,
  color: '#e8e8f0',
  margin: '4px 0',
}

const disclaimerStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#5a5a7a',
  textAlign: 'center',
  margin: '8px 0 0 0',
}

export default CreateItemPage
