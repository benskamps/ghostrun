import { useEffect, useState } from 'react'
import { track } from '@vercel/analytics'
import Ghost from './Ghost.jsx'

const REPO = 'https://github.com/benskamps/ghostrun'
const BB = 'https://brokenbranch.dev'
const out = (from) => () => track('outbound', { from })

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
    const t = setInterval(() => setI((n) => (n + 1) % (SPLITS.length + 3)), 1500)
    return () => clearInterval(t)
  }, [])
  let delta = 0
  SPLITS.forEach((s, n) => { if (n < i) delta += s.you - s.pb })
  const finished = i >= SPLITS.length
  const mood = finished ? 'sulk' : delta < 0 ? 'shocked' : 'smug'
  // PB glows when winning, fades as you pull ahead.
  const pbOpacity = finished ? 0.4 : delta < 0 ? 0.48 : 0.6
  return (
    <div className="run" aria-label="Example run: kitchen reset against PB">
      <div className="run-ghost"><Ghost size={64} mood={mood} opacity={pbOpacity} /></div>
      <div className="run-head"><span>Kitchen reset</span><span className="mono">Chore% · 100%</span></div>
      {SPLITS.map((s, n) => {
        const done = n < i
        const d = s.you - s.pb
        return (
          <div key={s.name} className={`split ${done ? 'done' : ''} ${n === i ? 'live' : ''}`}>
            <span>{s.name}</span>
            <span className={`mono ${done ? (d < 0 ? 'gold' : 'behind') : ''}`}>
              {done ? `${d > 0 ? '+' : '−'}${Math.abs(d)}s` : fmt(s.pb)}
            </span>
          </div>
        )
      })}
      <div className="run-foot mono" aria-live="polite">
        {finished ? `New PB by ${Math.abs(delta)}s. PB is sulking.` : i === 0 ? 'PB is ahead. PB is always ahead at first.' : delta < 0 ? 'You’re ahead. PB is fading.' : 'PB is ahead. For now.'}
      </div>
    </div>
  )
}

const MOODS = [
  { mood: 'smug', label: 'when it’s winning' },
  { mood: 'shocked', label: 'when you split early' },
  { mood: 'sulk', label: 'beaten by a hair' },
  { mood: 'rage', label: 'when you crush it' },
]

export default function App() {
  return (
    <>
      <a className="skip" href="#problem">Skip to the story</a>
      <header className="top">
        <a className="brand" href={BB} onClick={out('header_bb')}>
          <svg className="leaf" width="16" height="16" viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden="true"><path fill="#FFAE42" d="M1 7h1V5h1V4h1V3h1V2h1V1h1v1H6v1H5v1H4v1H3v1h3v1H1z"/></svg> broken branch
        </a>
        <a className="mono" href={REPO} onClick={out('header_repo')}>GitHub ↗</a>
      </header>

      <main>
        {/* HERO: the hook, not the product */}
        <section className="hero">
          <p className="eyebrow mono">a broken branch production</p>
          <h1>Your house is <span className="ghosty">haunted.</span></h1>
          <p className="lede">
            Not by a ghost, exactly. By the chores you keep meaning to do.
            <br />
            <strong>Ghostrun</strong> is how we fight back.
          </p>
          <Ghost size={156} mood="sneaky" className="hero-ghost" />
          <a className="cta" href="#problem">Here’s the problem ↓</a>
        </section>

        {/* 01 THE PROBLEM */}
        <section id="problem" className="block">
          <p className="kicker mono"><span>01</span> The problem</p>
          <h2>Chores aren’t hard. <br />They’re boring.</h2>
          <div className="meter" aria-label="Motivation meter at 3 percent">
            <div className="meter-head mono"><span>MOTIVATION</span><span>3%</span></div>
            <div className="meter-bar"><div className="meter-fill" /></div>
            <p className="mono meter-note">low battery · do not rely on this</p>
          </div>
          <div className="cards">
            <div className="card"><span className="big">✓</span><p>You know how to do the dishes.</p></div>
            <div className="card"><span className="big">✗</span><p>The dishes are still not done.</p></div>
            <div className="card"><span className="big">☰</span><p>A to-do list just writes the problem down twice.</p></div>
            <div className="card"><span className="big">⏳</span><p>Motivation shows up late, if it shows up at all.</p></div>
          </div>
          <p className="pull">
            What kills a chore isn’t a lack of <em>ability</em>. It’s a lack of <em>interest</em>.
            Boredom is the real boss fight.
          </p>
        </section>

        {/* 02 WHY */}
        <section className="block why">
          <p className="kicker mono"><span>02</span> Why I’m building it</p>
          <h2>A timer does what willpower can’t.</h2>
          <p>
            I can do the dishes. I just don’t want to. But the second there’s a clock on it, something switches on.
            A split. A personal best. Beating yesterday’s version of me by nine seconds.
          </p>
          <p>
            Small game loops make the same work feel shorter, and it actually gets done faster. Speedrunners figured
            this out years ago. Nobody pointed it at the laundry.
          </p>
          <p className="sig">— Ben</p>
        </section>

        {/* 03 WHO */}
        <section className="block">
          <p className="kicker mono"><span>03</span> Who it’s for</p>
          <h2>Anyone haunted by the boring stuff.</h2>
          <ul className="who">
            <li><strong>The capable procrastinator.</strong> You know exactly what to do. You just don’t start.</li>
            <li><strong>Novelty-powered brains.</strong> A ticking clock beats a guilt trip, ADHD brains included.</li>
            <li><strong>Gamers and speedrunners.</strong> You’ve raced a microwave timer. Admit it.</li>
            <li><strong>Shared homes.</strong> The kitchen gets reset, and nobody has to nag.</li>
          </ul>
        </section>

        {/* 04 THE CULPRIT */}
        <section className="block culprit">
          <p className="kicker mono"><span>04</span> Meet the culprit</p>
          <h2>So we gave boredom a face.</h2>
          <p>Something has been living in your house.</p>
          <div className="culprit-row">
            <Ghost size={120} mood="taunt" />
            <ul className="crimes">
              <li>It eats one sock from every pair.</li>
              <li>It hides the remote in the fridge.</li>
              <li>It leaves one sip of milk in every jug.</li>
            </ul>
          </div>
          <p>
            Its name is <strong className="pb">PB</strong>. It’s the ghost of your fastest run, and it’s been
            winning for years. PB glows brighter when it’s ahead and fades as you pull away.
          </p>
          <div className="moods">
            {MOODS.map((m) => (
              <figure key={m.mood}>
                <Ghost size={72} mood={m.mood} float={false} opacity={0.6} />
                <figcaption className="mono">{m.label}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* 05 THE SOLUTION */}
        <section className="block">
          <p className="kicker mono"><span>05</span> How you beat it</p>
          <h2>Do the chore. Race your own best time.</h2>
          <ol className="steps">
            <li><strong>Pick a chore.</strong> Ghostrun splits it into small steps, and PB shows you the mess it made.</li>
            <li><strong>Flip to split.</strong> Phone face down while you work, pick it up to log the step. No wet-hand tapping.</li>
            <li><strong>Beat PB.</strong> Your best run races you live. Win a step and it turns gold.</li>
            <li><strong>Prove it.</strong> Motion sensors confirm you actually did it. Shaking your phone on the couch doesn’t count.</li>
          </ol>
          <DemoRun />
          <p className="tagline">You don’t need motivation. <span>You need a ghost to beat.</span></p>
        </section>

        {/* 06 HOUSE RULES */}
        <section className="block">
          <p className="kicker mono"><span>06</span> House rules</p>
          <h2>A haunting with manners.</h2>
          <div className="rules">
            <div><h3>No shame, ever.</h3><p>No streaks to break, no guilt for a missed day. A missed day is just a day.</p></div>
            <div><h3>The chore gets done. PB gets the blame.</h3><p>“PB knocked over the laundry.” Never “you left the laundry.”</p></div>
            <div><h3>PB can’t die.</h3><p>Only be outrun. Beat it and it sulks, then comes back hungrier.</p></div>
            <div><h3>No faking it.</h3><p>A run only counts when the real thing is finished. That’s the whole point.</p></div>
            <div><h3>Not a to-do list.</h3><p>No inboxes, no due dates. Everything is a run.</p></div>
            <div><h3>Your runs stay yours.</h3><p>No account. Runs and ghosts live on your phone, not on a server.</p></div>
          </div>
        </section>

        {/* MAKER */}
        <section className="block maker">
          <Ghost size={56} mood="respect" float={false} opacity={0.6} />
          <div>
            <p className="kicker mono">Who’s behind it</p>
            <h2>Built by Ben Schippers.</h2>
            <p>
              Ghostrun is a solo build for Hackyard Yard 4 (“gamify something mundane”), made in public Oct 5–9, 2026.
              Every line is open source. Ben builds 0-to-1 products under the broken branch banner, with Claude as his
              main toolchain.
            </p>
            <div className="maker-links">
              <a className="cta small" href={REPO} onClick={out('maker_repo')}>Follow the build on GitHub</a>
              <a className="ghostlink" href={BB} onClick={out('maker_bb')}>brokenbranch.dev →</a>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <p className="prod">a <a href={BB} onClick={out('footer_bb')}>broken branch</a> production</p>
        <p className="mono small">
          © 2026 Ben Schippers · <a href={REPO} onClick={out('footer_repo')}>open source, MIT</a> · no cookies, privacy-friendly analytics
        </p>
        <p className="mono small faint">No ghosts were harmed. PB is fine. PB is always fine.</p>
      </footer>
    </>
  )
}
