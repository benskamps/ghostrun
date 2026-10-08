import { useState } from 'react'
import PB from './PB.jsx'
import { routeStats, opponents, todaysHex } from './model.js'
import { clock, segs } from '../lib/race.js'
import { askMotion } from '../lib/flip-split.js'
import { PBWhisper } from '../lib/pb-whisper.js'
import { TRACKS, trackById } from '../lib/ghost-tracks.js'
import { PBVoice } from '../lib/pb-voice.js'
import { askGeo } from '../lib/geo.js'
import { kindOf } from '../lib/routes.js'

const GUESSES = [5, 10, 15, 20, 30, 45]

export default function Ready({ route, runs, prefs, onPrefs, initialOpponent, onBack, onEdit, onStart }) {
  const stats = routeStats(route, runs)
  const opps = opponents(route, stats)
  const [oppId, setOppId] = useState(() => (opps.find((o) => o.id === initialOpponent) || opps[0])?.id || null)
  const opp = opps.find((o) => o.id === oppId) || null
  const [guess, setGuess] = useState(null)
  const hex = todaysHex()
  const [useHex, setUseHex] = useState(false)
  const [starting, setStarting] = useState(false)
  const recording = !opp
  const kind = kindOf(route)
  const errand = kind === 'errand', admin = kind === 'admin'
  const backLabel = errand ? 'Back to all errands' : admin ? 'Back to all quests' : 'Back to all chores'
  const ghostSegs = opp ? segs(opp.splits) : null

  // Race beat rides on sound: turning it on turns sound on too.
  const beatOn = prefs.sound && prefs.beat !== false
  // The track chip cycles Shuffle -> each song -> Shuffle. Shuffle picks a new song every run.
  const track = trackById(prefs.track)
  const nextTrack = () => onPrefs({ track: TRACKS[TRACKS.indexOf(track) + 1]?.id || 'shuffle' })
  const beatChip = (
    <>
      <button className="chip-btn" aria-pressed={beatOn} onClick={() => onPrefs(beatOn ? { beat: false } : { beat: true, sound: true })}>Race beat</button>
      {beatOn && <button className="chip-btn" onClick={nextTrack} aria-label={`Song: ${track ? track.name : 'Shuffle'}. Tap for the next one.`}>♪ {track ? track.name : 'Shuffle'}</button>}
    </>
  )

  // Everything the browser only allows from a tap happens here: motion permission (iOS) and audio.
  const start = async () => {
    if (starting) return
    setStarting(true)
    // Chores prove themselves with motion, errands with location, admin with the confirmation (no prompt).
    const motion = errand ? askGeo() : admin ? Promise.resolve('none') : askMotion()
    let whisper = null
    const silent = useHex && hex.id === 'silent'
    if (prefs.sound && !silent) {
      // Don't wait on resume(): some browsers never settle it, and the run must start anyway.
      try { whisper = new PBWhisper({ beat: beatOn && (prefs.track || 'shuffle') }); whisper.start().catch(() => {}) } catch { whisper = null }
    }
    let voice = null
    if (prefs.voice && !silent && PBVoice.ok) {
      try { voice = new PBVoice(); voice.unlock() } catch { voice = null }
    }
    const perm = await motion
    onStart({ opponent: opp, guessMs: guess ? guess * 60000 : null, hex: useHex ? hex : null, whisper, voice, motion: perm, priorBest: stats.best })
  }

  return (
    <>
      <header className="bar">
        <button className="back" onClick={onBack} aria-label={backLabel}>←</button>
        <span className="bar-title">{route.name}</span>
        <button className="chip-btn" onClick={onEdit}>Edit</button>
      </header>

      <section className="ready-hero">
        <PB mood={recording ? 'sneaky' : route.mood || 'smug'} scale={7} trail stitched={opp?.stitched} />
        <p className="mess">{route.mess}</p>
      </section>

      {recording ? (
        <div className="ready-head">
          <p className="eyebrow mono">First run</p>
          <h1 className="h-display">Record your ghost.</h1>
          <p className="muted">{errand
            ? 'No par time, nothing to lose. Run the errand and split as each leg ends. PB remembers where your stops are, so next time it races you there.'
            : admin
              ? 'No par time, nothing to lose. Do it on the official site and split as each step ends. Next time, this run races you.'
              : 'No par time, nothing to lose. Just do the chore and split as you finish each step. Next time, this run races you.'}</p>
        </div>
      ) : (
        <div className="ready-head">
          <p className="eyebrow mono">Race</p>
          <h1 className="h-display">Beat {opp.name === 'PB' ? 'PB' : opp.name}: <span className="mono ember">{clock(opp.splits.at(-1))}</span></h1>
          {opps.length > 1 && (
            <div className="seg-ctl" role="radiogroup" aria-label="Which ghost to race">
              {opps.map((o) => (
                <button key={o.id} role="radio" aria-checked={o.id === oppId} onClick={() => setOppId(o.id)}>
                  {o.id === 'pb' ? 'PB' : o.id === 'franken' ? 'Frankenghost' : o.name}
                  <span className="mono">{clock(o.splits.at(-1))}</span>
                </button>
              ))}
            </div>
          )}
          {opp.id === 'franken' && <p className="muted small">Frankenghost is your best time on every step, stitched together. Nobody has run this, including you.</p>}
        </div>
      )}

      <ol className="steps-preview">
        {route.steps.map((s, i) => (
          <li key={i}><span>{errand && route.drive?.[i] && <span className="drive-tag" aria-label="drive">🚗</span>}{s}</span><span className="mono faint">{ghostSegs ? clock(ghostSegs[i]) : '—'}</span></li>
        ))}
      </ol>

      <fieldset className="card">
        <legend className="mono">Dread check <span className="faint">(optional)</span></legend>
        <p className="muted small">Gut feeling: how long will this take?</p>
        <div className="chips">
          {GUESSES.map((m) => (
            <button key={m} className="chip-btn" aria-pressed={guess === m} onClick={() => setGuess(guess === m ? null : m)}>{m} min</button>
          ))}
        </div>
      </fieldset>

      {admin ? (
      <fieldset className="card">
        <legend className="mono">How Admin% works</legend>
        <p className="muted small">Tap Split as each step ends. Doing it on this phone? Switch to the site; the clock keeps running and PB catches up when you come back.</p>
        <div className="chips">
          <button className="chip-btn" aria-pressed={prefs.sound} onClick={() => onPrefs({ sound: !prefs.sound })}>PB’s hum</button>
          {beatChip}
        </div>
        <p className="faint small">At the finish, show PB the confirmation: a screenshot or the reference number. It’s checked on this phone and never saved. Use the official site only. Ghostrun never asks for ID numbers, passwords or logins.</p>
      </fieldset>
      ) : errand ? (
      <fieldset className="card">
        <legend className="mono">How Errand% works</legend>
        <p className="muted small">Tap the big button as each leg ends. On driving legs the clock hides. Split once you’re parked, never while moving.</p>
        <div className="chips">
          <button className="chip-btn" aria-pressed={prefs.sound} onClick={() => onPrefs({ sound: !prefs.sound })}>PB’s hum</button>
          <button className="chip-btn" aria-pressed={prefs.voice} onClick={() => onPrefs({ voice: !prefs.voice })}>PB calls splits</button>
          {beatChip}
        </div>
        <p className="faint small">Your phone checks you reached your stops. Switching to your maps app is fine; PB catches up when you come back. Locations stay on this phone.</p>
      </fieldset>
      ) : (
      <fieldset className="card">
        <legend className="mono">How you split</legend>
        <p className="muted small">Tap the big button, or keep your hands busy:</p>
        <div className="chips">
          <button className="chip-btn" aria-pressed={prefs.knock} onClick={() => onPrefs({ knock: !prefs.knock })}>Knock twice</button>
          <button className="chip-btn" aria-pressed={prefs.flip} onClick={() => onPrefs({ flip: !prefs.flip })}>Flip</button>
          <button className="chip-btn" aria-pressed={prefs.sound} onClick={() => onPrefs({ sound: !prefs.sound })}>PB’s hum</button>
          <button className="chip-btn" aria-pressed={prefs.voice} onClick={() => onPrefs({ voice: !prefs.voice })}>PB calls splits</button>
          {beatChip}
        </div>
        <p className="faint small">Knock: lay the phone down and knock twice on the counter beside it. Flip: rest it face down while you work, pick it up when a step is done.</p>
      </fieldset>
      )}

      <button className={`card hex-card ${useHex ? 'on' : ''}`} aria-pressed={useHex} onClick={() => setUseHex(!useHex)}>
        <span className="mono haunt-tag">Today’s haunt</span>
        <strong>{hex.name}</strong>
        <span className="muted small">{hex.rule}</span>
        <span className="hex-take mono">{useHex ? 'Taken ✓' : 'Take it?'}</span>
      </button>

      <div className="start-wrap">
        <button className="big-btn" onClick={start} disabled={starting}>
          {starting ? 'Waking PB…' : recording ? 'Start recording' : 'Start the race'}
        </button>
        <p className="faint small center">{errand ? 'Location checks you actually went. Nothing leaves your phone.' : admin ? 'The confirmation is the proof. Nothing leaves your phone.' : 'The screen stays on during a run. Motion sensors check the work is real.'}</p>
      </div>
    </>
  )
}
