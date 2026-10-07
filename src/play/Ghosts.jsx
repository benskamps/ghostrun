import { useRef, useState } from 'react'
import { track } from '@vercel/analytics'
import PB from './PB.jsx'
import Install from './Install.jsx'
import { pack, unpack, fileName } from '../lib/backup.js'

// Your data, in your hands: carry ghosts to a new phone, or start fresh. Nothing here talks to a server.
export default function Ghosts({ data, prefs, onBack, onImport, onWipe }) {
  const [msg, setMsg] = useState('')
  const [confirm, setConfirm] = useState(false)
  const file = useRef(null)
  const ghosts = data.routes.filter((r) => data.runs.some((x) => x.routeId === r.id)).length
  const first = data.runs.reduce((m, r) => Math.min(m, r.endedAt), Infinity)

  const save = () => {
    const blob = new Blob([JSON.stringify(pack({ ...data, prefs }))], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = fileName()
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 4000)
    setMsg('Backup saved to your downloads. Keep it somewhere safe.')
    track('backup', { what: 'save' })
  }

  const load = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    const got = unpack(await f.text())
    if (got.error) { setMsg(got.error); return }
    await onImport(got)
    setMsg(`PB remembers ${got.routes.length} ${got.routes.length === 1 ? 'route' : 'routes'} and ${got.runs.length} ${got.runs.length === 1 ? 'run' : 'runs'}.`)
    track('backup', { what: 'load' })
  }

  return (
    <>
      <header className="bar">
        <button className="back" onClick={onBack} aria-label="Back to your runs">←</button>
        <span className="bar-title">Your ghosts</span>
        <span />
      </header>

      <section className="ready-hero">
        <PB mood="proud" scale={6} trail />
        <p className="mess">{data.runs.length
          ? `${data.runs.length} ${data.runs.length === 1 ? 'run' : 'runs'}, ${ghosts} ${ghosts === 1 ? 'ghost' : 'ghosts'}, since ${new Date(first).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}.`
          : 'No ghosts yet. Your first run makes one.'}</p>
      </section>

      <p className="muted small center">Everything lives on this phone: no account, no server. That also means it’s yours to carry.</p>

      <Install always />

      <section className="card">
        <p className="mono eyebrow">Backup</p>
        <p className="muted small">Save your routes, runs and ghosts as one small file. Load it on a new phone, or after clearing your browser, and PB picks up where you left off.</p>
        <div className="row">
          <button className="chip-btn" onClick={save} disabled={!data.runs.length}>Save backup</button>
          <button className="chip-btn" onClick={() => file.current?.click()}>Load a backup</button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={load} />
        </div>
        <p className="faint small" role="status">{msg}</p>
      </section>

      <section className="card">
        <p className="mono eyebrow">Start fresh</p>
        {!confirm
          ? <>
            <p className="muted small">Clear every route, run and ghost from this phone. PB will start the haunting over.</p>
            <div className="row"><button className="chip-btn" onClick={() => setConfirm(true)}>Start fresh…</button></div>
          </>
          : <>
            <p className="muted small">This can’t be undone. {data.runs.length ? 'Save a backup first if you might want them back.' : ''}</p>
            <div className="row">
              <button className="chip-btn warn" onClick={onWipe}>Forget everything</button>
              <button className="textbtn" onClick={() => setConfirm(false)}>Keep my ghosts</button>
            </div>
          </>}
      </section>
    </>
  )
}
