import { useState } from 'react'
import { askBreakdown } from '../lib/breakdown-client.js'
import { getMeta, setMeta } from '../lib/store.js'

const bdCache = { get: () => getMeta('breakdowns', {}), set: (v) => setMeta('breakdowns', v) }

const COPY = {
  chore: { label: 'What did PB mess up?', hint: 'the kitchen, laundry, the car…' },
  errand: { label: 'Where is PB dragging you?', hint: 'pharmacy, returns, groceries…' },
  admin: { label: 'What did PB hide?', hint: 'cancel a trial, renew a license…' },
}

// One box, one tap: a typed chore becomes a run and lands on its start line. Not a list: nothing waits here.
export default function QuickChore({ mode = 'chore', onRoute }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const c = COPY[mode] || COPY.chore
  const go = async (e) => {
    e.preventDefault()
    if (busy || text.trim().length < 2) return
    setBusy(true)
    const b = await askBreakdown({ text, kind: mode, size: 'quick' }, { cache: bdCache })
    await onRoute(b)
    setBusy(false)
    setText('')
  }
  return (
    <form className="card quick-chore" onSubmit={go}>
      <label className="mono eyebrow" htmlFor="quick-chore">{c.label}</label>
      <div className="row">
        <input id="quick-chore" value={text} maxLength={60} onChange={(e) => setText(e.target.value)} placeholder={c.hint} autoComplete="off" enterKeyHint="go" />
        <button className="chip-btn qc-go" type="submit" disabled={busy || text.trim().length < 2}>{busy ? 'PB is looking…' : 'Race it →'}</button>
      </div>
    </form>
  )
}
