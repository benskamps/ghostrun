import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import App from './App.jsx'
import './fonts.css'
import './styles.css'

// /play is the game; everything else is the landing page. The game loads as its own chunk.
const Play = lazy(() => import('./play/Play.jsx'))
const isPlay = /^\/play\/?$/.test(location.pathname)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isPlay ? <Suspense fallback={null}><Play /></Suspense> : <App />}
    <Analytics />
  </StrictMode>
)
