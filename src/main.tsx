import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import { captureBeforeInstallPrompt } from './pwa/installPromptCapture'

/** Register before React so `beforeinstallprompt` is not lost if it fires early. */
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  captureBeforeInstallPrompt(e as BeforeInstallPromptEvent)
})

registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
