import { useState } from 'react'
import { isDesktop } from '../lib/install.js'

// Most people meet Ghostrun on a laptop (a vote page, a link). The game wants a phone in a pocket.
export default function Handoff() {
  const [show, setShow] = useState(() => {
    try { return isDesktop() && !sessionStorage.getItem('handoff') } catch { return isDesktop() }
  })
  if (!show) return null
  const close = () => { try { sessionStorage.setItem('handoff', '1') } catch { /* fine */ } setShow(false) }
  return (
    <section className="card handoff" aria-labelledby="handoff-h">
      <img className="qr" src="/play-qr.svg" width="128" height="128" alt="QR code that opens ghostrun-ten.vercel.app/play" />
      <div className="handoff-copy">
        <p className="eyebrow mono">Made for your phone</p>
        <p id="handoff-h" className="handoff-head">PB lives in your pocket.</p>
        <p className="muted small">Your phone’s motion sensors split the run and prove the chore got done. Scan to play there. Your laptop can still race with taps; those runs count as time only.</p>
        <button className="textbtn" onClick={close}>Try it here anyway</button>
      </div>
    </section>
  )
}
