import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { initTelegramWebApp, lockKeyboardViewportJump } from './telegram'
import './styles.css'

initTelegramWebApp()
lockKeyboardViewportJump()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
