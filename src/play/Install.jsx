import { useEffect, useState } from 'react'
import { track } from '@vercel/analytics'
import { canPrompt, isInstalled, isIOS, onInstallChange, promptInstall } from '../lib/install.js'
import { getMeta, setMeta } from '../lib/store.js'

// After a ghost exists, it's worth keeping. Installing is how a phone keeps it.
// `always` shows it even after "Not now" (the Your ghosts screen).
export default function Install({ always = false }) {
  const [, bump] = useState(0)
  const [later, setLater] = useState(null)
  useEffect(() => onInstallChange(() => bump((n) => n + 1)), [])
  useEffect(() => { getMeta('installLater', false).then(setLater) }, [])

  if (isInstalled() || later === null || (later && !always)) return null
  const ios = isIOS()
  if (!ios && !canPrompt()) return null

  const add = async () => {
    const r = await promptInstall()
    track('install', { how: r })
    bump((n) => n + 1)
  }
  const notNow = () => { setMeta('installLater', true); setLater(true) }

  return (
    <section className="card install" aria-labelledby="install-h">
      <p className="mono eyebrow">Keep your ghost</p>
      <p id="install-h" className="handoff-head">Put PB on your home screen.</p>
      {ios
        ? <p className="muted small">Safari clears a website’s data after about a week away. On your home screen, your ghosts stay put. Tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>.</p>
        : <p className="muted small">One tap to your next race, and it plays offline in the laundry room.</p>}
      <div className="row">
        {!ios && <button className="chip-btn" onClick={add}>Add to home screen</button>}
        {!always && <button className="textbtn" onClick={notNow}>Not now</button>}
      </div>
    </section>
  )
}
