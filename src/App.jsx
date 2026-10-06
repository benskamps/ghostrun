import { useEffect, useRef, useState } from 'react'
import { track } from '@vercel/analytics'
import Ghost from './Ghost.jsx'
import RaceToy from './RaceToy.jsx'
import DemoRun from './DemoRun.jsx'
import Atmosphere from './Atmosphere.jsx'
import Brand, { BRAND, BRAND_URL } from './Brand.jsx'

const REPO = 'https://github.com/benskamps/ghostrun'
const out = (where) => () => track('outbound', { where })
const cta = (where) => () => track('cta', { where })

// Sections fade up as they enter, and PB peeks in from the edge.
function Section({ id, className = '', peek, children }) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); io.disconnect() } }, { threshold: 0.18 })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [])
  return (
    <section id={id} ref={ref} className={`block reveal ${inView ? 'in' : ''} ${className}`}>
      {peek && <div className={`peek peek-${peek.side || 'right'}`} aria-hidden="true"><Ghost size={56} mood={peek.mood} float={false} opacity={0.55} /></div>}
      {children}
    </section>
  )
}

const MOODS = [
  { mood: 'smug', label: 'winning' },
  { mood: 'shocked', label: 'you split early' },
  { mood: 'sulk', label: 'lost by a hair' },
  { mood: 'rage', label: 'got crushed' },
]

export default function App() {
  // The sticky phone CTA only appears once the hero (and its race) has scrolled away.
  const heroRef = useRef(null)
  const [pastHero, setPastHero] = useState(false)
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setPastHero(!e.isIntersecting), { threshold: 0 })
    io.observe(heroRef.current)
    return () => io.disconnect()
  }, [])

  return (
    <>
      <Atmosphere />
      <a className="skip" href="#problem">Skip to the story</a>

      <header className="top">
        <a className="brand" href={BRAND_URL} onClick={out('header_brand')}><Brand /></a>
        <nav>
          <a href="#race" onClick={cta('nav_race')}>Race PB</a>
          <a className="mono" href={REPO} onClick={out('header_repo')}>GitHub ↗</a>
        </nav>
      </header>

      <main>
       <div className="col">
        {/* HERO: hook, then what it is, then something to do */}
        <section className="hero" ref={heroRef}>
          <div className="hero-copy">
            <p className="eyebrow mono">a {BRAND} production · Hackyard Yard 4</p>
            <h1>Your house is <span className="ghosty">haunted.</span></h1>
            <p className="lede">
              <strong>Ghostrun turns chores into a speedrun against your own best time.</strong>{' '}
              The ghost of that time is PB, and PB made the mess.
            </p>
            <div className="hero-ctas">
              <a className="cta" href="#race" onClick={cta('hero_race')}>Race PB now</a>
              <a className="cta ghost-btn" href="#problem" onClick={cta('hero_why')}>Why it exists ↓</a>
            </div>
            <p className="badge mono">Building in public · Oct 5–9, 2026 · open source</p>
          </div>
          <div className="hero-play" id="race">
            <RaceToy />
          </div>
        </section>

        {/* 01 THE PROBLEM */}
        <Section id="problem" peek={{ mood: 'sneaky', side: 'right' }}>
          <p className="kicker mono"><span>01</span> The problem</p>
          <h2>Chores aren’t hard. <br />They’re boring.</h2>
          <div className="problem-grid">
            <div className="meter" aria-label="Motivation meter at 3 percent">
              <div className="meter-head mono"><span>MOTIVATION</span><span>3%</span></div>
              <div className="meter-bar"><div className="meter-fill" /></div>
              <p className="mono meter-note">low battery · do not rely on this</p>
            </div>
            <ul className="evidence">
              <li><b>✓</b> You know how to do the dishes.</li>
              <li><b>✗</b> The dishes are still not done.</li>
              <li><b>☰</b> A to-do list just writes the problem down twice.</li>
              <li><b>⏳</b> Motivation shows up late, if it shows up at all.</li>
            </ul>
          </div>
          <p className="pull">
            What kills a chore isn’t a lack of <em>ability</em>. It’s a lack of <em>interest</em>.
            Boredom is the real boss fight.
          </p>
        </Section>

        {/* 02 WHY */}
        <Section className="why" peek={{ mood: 'idle', side: 'left' }}>
          <p className="kicker mono"><span>02</span> Why I’m building it</p>
          <blockquote>
            <p className="quote">“I can do the dishes. I just don’t want to. But the second there’s a clock on it, something switches on.”</p>
            <p>
              A split. A personal best. Beating yesterday’s version of me by nine seconds. Small game loops make the
              same work feel shorter, and it actually gets done faster. Speedrunners figured this out years ago.
              Nobody pointed it at the laundry.
            </p>
            <footer className="sig">— Ben</footer>
          </blockquote>
        </Section>

        {/* 03 WHO */}
        <Section>
          <p className="kicker mono"><span>03</span> Who it’s for</p>
          <h2>Anyone haunted by the boring stuff.</h2>
          <div className="chips">
            <span>The capable procrastinator</span>
            <span>Novelty-powered brains</span>
            <span>ADHD brains</span>
            <span>Speedrunners &amp; gamers</span>
            <span>Anyone who’s raced a microwave</span>
            <span>Shared homes that hate nagging</span>
          </div>
          <p className="who-note">You know exactly what needs doing. You just don’t start. A ticking clock beats a guilt trip.</p>
        </Section>
       </div>

      {/* 04 THE CULPRIT: full-bleed haunted room */}
      <Section className="room">
        <div className="room-inner">
          <div className="doorway" aria-hidden="true"><Ghost size={150} mood="taunt" opacity={0.6} /></div>
          <div>
            <p className="kicker mono"><span>04</span> Meet the culprit</p>
            <h2>So we gave boredom a face.</h2>
            <p>Something has been living in your house.</p>
            <ul className="crimes">
              <li>It eats one sock from every pair.</li>
              <li>It hides the remote in the fridge.</li>
              <li>It leaves one sip of milk in every jug.</li>
            </ul>
            <p>
              Its name is <strong className="pb">PB</strong>. It’s the ghost of your fastest run, and it’s been
              winning for years. PB glows when it’s ahead and fades as you pull away.
            </p>
          </div>
        </div>
        <div className="moods" role="list">
          {MOODS.map((m) => (
            <figure key={m.mood} role="listitem">
              <Ghost size={76} mood={m.mood} float={false} opacity={0.6} />
              <figcaption className="mono">{m.label}</figcaption>
            </figure>
          ))}
        </div>
      </Section>

       <div className="col">
        {/* 05 THE SOLUTION */}
        <Section peek={{ mood: 'shocked', side: 'right' }}>
          <p className="kicker mono"><span>05</span> How you beat it</p>
          <h2>Do the chore. Race your own best time.</h2>
          <div className="how">
            <ol className="steps">
              <li><strong>Pick a chore.</strong> Ghostrun splits it into small steps, and PB shows you the mess it made.</li>
              <li><strong>Knock to split.</strong> Knock twice on the counter when a step is done, or flip your phone. No wet-hand tapping.</li>
              <li><strong>Beat PB.</strong> Your best run races you live. Win a step and it flashes gold.</li>
              <li><strong>Prove it.</strong> Motion sensors confirm you did the work. Shaking your phone on the couch doesn’t count.</li>
            </ol>
            <DemoRun />
          </div>
          <p className="tagline">You don’t need motivation. <span>You need a ghost to beat.</span></p>
        </Section>

        {/* 06 HOUSE RULES */}
        <Section>
          <p className="kicker mono"><span>06</span> House rules</p>
          <h2>A haunting with manners.</h2>
          <dl className="rules">
            <div><dt>No shame, ever.</dt><dd>No streaks to break, no guilt for a missed day.</dd></div>
            <div><dt>The chore gets done. PB gets the blame.</dt><dd>“PB knocked over the laundry.” Never “you left the laundry.”</dd></div>
            <div><dt>PB can’t die.</dt><dd>Only be outrun. Beat it and it sulks, then comes back hungrier.</dd></div>
            <div><dt>No faking it.</dt><dd>A run only counts when the real thing is finished.</dd></div>
            <div><dt>Not a to-do list.</dt><dd>No inboxes, no due dates. Everything is a run.</dd></div>
            <div><dt>Your runs stay yours.</dt><dd>No account. Runs and ghosts live on your phone.</dd></div>
          </dl>
        </Section>

        {/* MAKER */}
        <Section className="maker">
          <Ghost size={64} mood="respect" float={false} opacity={0.6} />
          <div>
            <p className="kicker mono">Who’s behind it</p>
            <h2>Built by Ben Schippers.</h2>
            <p>
              A solo build for Hackyard Yard 4 (“gamify something mundane”), made in public Oct 5–9, 2026. Every line
              is open source. Ben builds 0-to-1 products under the {BRAND} banner, with Claude as his main toolchain.
            </p>
            <div className="maker-links">
              <a className="cta small" href={REPO} onClick={out('maker_repo')}>Follow the build on GitHub</a>
              <a className="textlink" href={BRAND_URL} onClick={out('maker_brand')}>brokenbranch.dev →</a>
            </div>
          </div>
        </Section>
       </div>
      </main>

      <footer className="foot">
        <a className="prod" href={BRAND_URL} onClick={out('footer_brand')}>a <Brand size={20} /> production</a>
        <p className="mono small">
          © 2026 Ben Schippers · <a href={REPO} onClick={out('footer_repo')}>open source, MIT</a> · no cookies, privacy-friendly analytics
        </p>
        <p className="mono small faint">No ghosts were harmed. PB is fine. PB is always fine.</p>
      </footer>

      {/* Sticky next step on phones */}
      <div className={`sticky-cta ${pastHero ? 'show' : ''}`} inert={!pastHero}>
        <a href="#race" onClick={cta('sticky_race')}>Race PB</a>
        <a href={REPO} onClick={out('sticky_repo')}>Follow the build</a>
      </div>
    </>
  )
}
