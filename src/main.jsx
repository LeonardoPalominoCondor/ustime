
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { startForegroundPush } from './foreground.js'
import './styles.css'

createRoot(document.getElementById('root')).render(<App />)

if (
  'serviceWorker' in navigator &&
  import.meta.env.PROD &&
  import.meta.env.VITE_TEST_MODE !== 'true'
) {
  navigator.serviceWorker.register('/sw.js')
    .then(() => startForegroundPush())
    .catch((error) => console.error('[UsTime] Error al iniciar notificaciones:', error))
}
