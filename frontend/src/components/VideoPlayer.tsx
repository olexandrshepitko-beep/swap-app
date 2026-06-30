import React, { useRef, useEffect, useState } from 'react'
import { VideoIcon } from './Icons'

interface VideoPlayerProps {
  src: string
  style?: React.CSSProperties
  autoPlay?: boolean
  muted?: boolean
  loop?: boolean
  controls?: boolean
  poster?: string
  className?: string
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  style,
  autoPlay = true,
  muted = true,
  loop = true,
  controls = false,
  poster,
  className,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  // Explicit play after load — критично для Telegram WebView
  useEffect(() => {
    const video = videoRef.current
    if (!video || !isLoaded || !autoPlay) return

    const tryPlay = () => {
      video.play().catch((err) => {
        // На Android WebView первый play может блокироваться — повторяем по тапу
        console.debug('[VideoPlayer] Autoplay blocked:', err.message)
      })
    }

    // Пробуем сразу
    tryPlay()

    // И повторяем при первой же пользовательской активности
    const onUserInteraction = () => {
      tryPlay()
      document.removeEventListener('touchstart', onUserInteraction)
      document.removeEventListener('click', onUserInteraction)
    }
    document.addEventListener('touchstart', onUserInteraction, { once: true })
    document.addEventListener('click', onUserInteraction, { once: true })

    return () => {
      document.removeEventListener('touchstart', onUserInteraction)
      document.removeEventListener('click', onUserInteraction)
    }
  }, [isLoaded, autoPlay])

  return (
    <div
      style={{
        position: 'relative',
        background: '#000',
        overflow: 'hidden',
        width: '100%',
        height: '100%',
        ...style,
      }}
      className={className}
    >
      {hasError ? (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: '#111', gap: 8,
        }}>
          <VideoIcon size={28} color="#555" />
          <p style={{ fontSize: 11, color: '#666', margin: 0 }}>Не удалось загрузить видео</p>
        </div>
      ) : (
        <>
          {!isLoaded && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 2,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.3)',
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'conic-gradient(from 0deg, transparent 30%, #667eea 80%, #764ba2 100%)',
                animation: 'spin 0.8s linear infinite',
                WebkitMask: 'radial-gradient(circle closest-side, transparent 70%, black 71%)',
                mask: 'radial-gradient(circle closest-side, transparent 70%, black 71%)',
              }} />
            </div>
          )}

          <video
            ref={videoRef}
            src={src}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              opacity: isLoaded ? 1 : 0,
              transition: 'opacity 0.3s ease',
            }}
            muted={muted}
            loop={loop}
            controls={controls}
            playsInline
            autoPlay={autoPlay}
            preload="auto"
            poster={poster}
            onLoadedData={() => setIsLoaded(true)}
            onError={() => {
              console.error(`[VideoPlayer] Failed to load video: ${src}`)
              setHasError(true)
            }}
          />
        </>
      )}
    </div>
  )
}

export default VideoPlayer
