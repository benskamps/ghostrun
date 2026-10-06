import { useEffect, useState } from 'react'
import { track } from '@vercel/analytics'
import Ghost from './Ghost.jsx'

const REPO = 'https://github.com/benskamps/ghostrun'
const BB = 'https://brokenbranch.dev'
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

const out = (from) => () => track('outbound', { from })

export default function App() {
  return (
    <>
      <header className="top">
        <a className="brand mono" href={BB} onClick={out('header_bb')}>brokenbranch</a>
        <a className="mono" href={REPO} onClick={out('header_repo')}>GitHub</a>
      </header>

      <main>
        <section className="hero">
          <Ghost size={168} />
          <h1>Ghostrun</h1>
          <p className="tag">You don't need motivation,<br />you need a ghost to beat.</p>
          <p className="sub">
            Speedrun your chores against your own best run. Set your phone face down, do the step, pick it up to
            split. The run only counts when the chore is actually done.
          </p>
          <a className="cta" href={REPO} onClick={out('hero_repo')}>Follow the build on GitHub</a>
          <p className="badge mono">Building in public · Hackyard Yard 4 · Oct 5–9, 2026</p>
        </section>

        <section className="demo"><DemoRun /></section>

        <section className="block">
          <p className="kicker mono">Why I'm building it</p>
          <h2>Chores aren't hard. They're boring.</h2>
          <p>
            What kills a chore is lack of interest, not lack of ability. I can do the dishes. I just don't want to.
            But put a timer on it and something switches on. A split, a personal best, beating yesterday's version
            of me. Small game loops make the same work feel shorter, and it actually gets done faster.
          </p>
          <p>
            So Ghostrun skips the motivation speech and hands you a ghost and a clock. No streaks to break, no guilt
            when you miss a day. Just a few seconds between you and a personal best.
          </p>
        </section>

        <section className="block">
          <p className="kicker mono">Who it's for</p>
          <h2>Anyone who puts things off because they're dull.</h2>
          <ul>
            <li>People who know exactly what needs doing and still don't start.</li>
            <li>Brains that run on novelty and a ticking clock, ADHD brains included.</li>
            <li>Speedrunners, gamers, and anyone who's ever raced a microwave timer.</li>
            <li>Households that want the kitchen reset without the nagging.</li>
          </ul>
        </section>

        <section className="how">
          <div><h3>Flip to split</h3><p>Face down to work, pick it up to log the split. No tapping with wet hands.</p></div>
          <div><h3>Meet PB</h3><p>Your personal-best ghost. PB made the mess. Beat PB and it fades. It never dies, it just sulks.</p></div>
          <div><h3>No faking it</h3><p>Motion proves the work. Shaking your phone on the couch doesn't count. A photo locks in a 100% run.</p></div>
          <div><h3>Yours stays yours</h3><p>No account. Your runs and ghosts live on your phone, not on a server.</p></div>
        </section>

        <section className="block maker">
          <p className="kicker mono">Who's behind it</p>
          <h2>Built by Ben Schippers.</h2>
          <p>
            Ghostrun is a solo build by Ben, a product builder who ships 0-to-1 ideas with Claude as his main
            toolchain. Every line is open source, written during Hackyard build week.
          </p>
          <a className="ghostlink" href={BB} onClick={out('maker_bb')}>More from brokenbranch.dev →</a>
        </section>
      </main>

      <footer>
        <p className="prod">a <a href={BB} onClick={out('footer_bb')}>broken branch</a> production</p>
        <p className="mono small">
          © 2026 Ben Schippers · <a href={REPO} onClick={out('footer_repo')}>open source, MIT</a> · no cookies, privacy-friendly analytics
        </p>
      </footer>
    </>
  )
}
