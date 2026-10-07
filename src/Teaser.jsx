import { useEffect, useRef, useState } from 'react'
import { track } from '@vercel/analytics'

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// PB's 30s trailer: muted and looping while it's on screen, sound on tap. Self-hosted for the CSP.
export default function Teaser() {
  const ref = useRef(null)
  const [muted, setMuted] = useState(true)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    const v = ref.current
    if (reduced()) return // no autoplay; the play button is right there
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) v.play().catch(() => {})
      else v.pause()
    }, { threshold: 0.4 })
    io.observe(v)
    return () => io.disconnect()
  }, [])

  const toggleSound = () => {
    const v = ref.current
    v.muted = !v.muted
    setMuted(v.muted)
    if (!v.muted) { v.currentTime = 0; v.play().catch(() => {}); track('teaser', { action: 'sound_on' }) }
  }
  const togglePlay = () => {
    const v = ref.current
    if (v.paused) { v.play().catch(() => {}); track('teaser', { action: 'play' }) } else v.pause()
  }

  return (
    <div className="teaser">
      <video
        ref={ref}
        poster="/media/pb-teaser-poster.jpg"
        muted loop playsInline preload="metadata"
        width="720" height="720"
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onClick={togglePlay}
        aria-label="Ghostrun trailer: PB haunts a house, then loses a race to you"
      >
        <source src="/media/pb-teaser.webm" type="video/webm" />
        <source src="/media/pb-teaser.mp4" type="video/mp4" />
      </video>
      <div className="teaser-ui">
        <button className="teaser-btn mono" onClick={togglePlay}>{playing ? 'Pause' : '▶ Play'}</button>
        <button className="teaser-btn mono" onClick={toggleSound} aria-pressed={!muted}>{muted ? 'Sound on' : 'Mute'}</button>
      </div>
    </div>
  )
}
