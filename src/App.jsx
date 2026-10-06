import { useEffect, useState } from 'react'
import { track } from '@vercel/analytics'
import Ghost from './Ghost.jsx'

const REPO = 'https://github.com/benskamps/ghostrun'
const SPLITS = [
  { name: 'Clear counters', pb: 62, you: 55 },
  { name: 'Dishes', pb: 241, you: 200 },
  { name: 'Wipe down', pb: 48, you: 51 },
  { name: 'Floor', pb: 95, you: 81 },
]
const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

function DemoRun() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % (SPLITS.length + 2)), 1400)
    return () => clearInterval(t)
  }, [])
  let delta = 0
  return (
    <div className="run" aria-label="Example run against your ghost">
      <div className="run-head"><span>Kitchen reset</span><span className="mono">Chore% · 100%</span></div>
      {SPLITS.map((s, n) => {
        const done = n < i
        if (done) delta += s.you - s.pb
        const gold = done && s.you < s.pb
        return (
          <div key={s.name} className={`split ${done ? 'done' : ''} ${n === i ? 'live' : ''}`}>
            <span>{s.name}</span>
            <span className={`mono ${gold ? 'gold' : done ? 'behind' : ''}`}>
              {done ? `${s.you - s.pb > 0 ? '+' : '−'}${Math.abs(s.you - s.pb)}s` : fmt(s.pb)}
            </span>
          </div>
        )
      })}
      <div className="run-foot mono">
        {i > SPLITS.length - 1 ? `PB by ${Math.abs(delta)} seconds. PB is sulking.` : 'PB is ahead. For now.'}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <main>
      <section className="hero">
        <Ghost size={168} />
        <h1>Ghostrun</h1>
        <p className="tag">You don't need motivation,<br />you need a ghost to beat.</p>
        <p className="sub">
          Speedrun your chores against your own best run. Set your phone face down, do the step, pick it up to split.
          The run only counts when the chore is actually done.
        </p>
        <a className="cta" href={REPO} onClick={() => track('repo_click', { from: 'hero' })}>
          Follow the build on GitHub
        </a>
        <p className="badge mono">Building in public · Hackyard Yard 4 · Oct 5–9</p>
      </section>

      <section className="demo"><DemoRun /></section>

      <section className="how">
        <div><h2>Flip to split</h2><p>Face down to work, pick it up to log the split. No tapping with wet hands.</p></div>
        <div><h2>Meet PB</h2><p>Your personal-best ghost. PB made the mess. Beat PB and it fades. It never dies, it just sulks.</p></div>
        <div><h2>No faking it</h2><p>Motion proves the work. Shaking your phone on the couch doesn't count. A photo locks in a 100% run.</p></div>
      </section>

      <footer className="mono">
        <a href={REPO} onClick={() => track('repo_click', { from: 'footer' })}>github.com/benskamps/ghostrun</a> · MIT
      </footer>
    </main>
  )
}
