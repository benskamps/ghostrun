import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import App from './App.jsx'
import { catchInstall } from './lib/install.js'
import './fonts.css'
import './styles.css'

// /play is the game; everything else is the landing page. The game loads as its own chunk.
const Play = lazy(() => import('./play/Play.jsx'))
const isPlay = /^\/play\/?$/.test(location.pathname)

// Chrome offers the install prompt once, early; hold it for after the first ghost.
catchInstall()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isPlay ? <Suspense fallback={null}><Play /></Suspense> : <App />}
    <Analytics />
  </StrictMode>
)

// Offline install. Only in production builds, so dev reloads stay honest.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('/sw.js')
      const sw = (await navigator.serviceWorker.ready).active
      const urls = performance.getEntriesByType('resource').map((r) => r.name).filter((u) => u.startsWith(location.origin))
      sw?.postMessage({ type: 'warm', urls: [location.pathname, ...urls] })
    } catch { /* the game works fine online without it */ }
  })
}
