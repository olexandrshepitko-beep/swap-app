import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { TelegramProvider } from './telegram/TelegramProvider'
import './telegram/init'

// Global styles
const style = document.createElement('style')
style.textContent = `
  * {
    -webkit-tap-highlight-color: transparent;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  html, body, #root {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #0d0d1a;
    color: #e8e8f0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif;
  }

  ::-webkit-scrollbar {
    width: 4px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    background: rgba(102,126,234,0.3);
    border-radius: 2px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: rgba(102,126,234,0.5);
  }

  ::selection {
    background: rgba(102,126,234,0.3);
    color: #fff;
  }

  input, textarea, button {
    font-family: inherit;
  }

  button:active {
    transform: scale(0.95) !important;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @keyframes bgPulse {
    0% { opacity: 0.6; }
    100% { opacity: 1; }
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes heartBurst {
    0% { opacity: 1; transform: translate(0, 0) scale(1); }
    50% { opacity: 0.8; transform: translate(var(--dx, -20px), var(--dy, -30px)) scale(1.3); }
    100% { opacity: 0; transform: translate(var(--dx, -30px), var(--dy, -50px)) scale(0.5); }
  }

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-8px) rotate(-2deg); }
    40% { transform: translateX(8px) rotate(2deg); }
    60% { transform: translateX(-5px) rotate(-1deg); }
    80% { transform: translateX(5px) rotate(1deg); }
  }

  @keyframes matchModalIn {
    from { opacity: 0; transform: scale(0.5) translateY(20px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }

  @keyframes fadeInOverlay {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes sparkleFloat {
    0% { opacity: 0; transform: scale(0) translateY(0); }
    50% { opacity: 1; transform: scale(1) translateY(-20px); }
    100% { opacity: 0; transform: scale(0) translateY(-40px); }
  }

  @keyframes hueRotate {
    0% { filter: hue-rotate(0deg); }
    50% { filter: hue-rotate(15deg); }
    100% { filter: hue-rotate(0deg); }
  }

  @keyframes logoFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`
document.head.appendChild(style)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <TelegramProvider>
        <App />
      </TelegramProvider>
    </HashRouter>
  </React.StrictMode>
)
