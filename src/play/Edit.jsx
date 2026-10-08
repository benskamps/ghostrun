import { useState } from 'react'
import { cleanRoute, kindOf, LIMITS } from '../lib/routes.js'
import { askBreakdown, askChop, SOURCE_COPY } from '../lib/breakdown-client.js'
import { parTotal, aboutTime } from '../lib/breakdown.js'
import { getMeta, setMeta } from '../lib/store.js'

const bdCache = { get: () => getMeta('breakdowns', {}), set: (v) => setMeta('breakdowns', v) }

// Build or tweak a route. Changing the steps starts a fresh ghost, so we say so.
export default function Edit({ route, kind, onSave, onDelete, onBack }) {
  const k = route ? kindOf(route) : kind || 'chore'
  const errand = k === 'errand', admin = k === 'admin'
  const [name, setName] = useState(route?.name || '')
  const [steps, setSteps] = useState(route?.steps?.length ? [...route.steps] : errand ? ['Out the door', '', '', ''] : admin ? ['Find the official page', '', 'Get the confirmation'] : ['', '', ''])
  const [drive, setDrive] = useState(route?.drive ? [...route.drive] : steps.map(() => false))
  // PB's par guesses ride along with the steps they belong to; a new or retyped step has no guess.
  const [par, setPar] = useState(route?.par && route.par.length === route.steps.length ? [...route.par] : steps.map(() => null))
  const [extras, setExtras] = useState(route ? { prep: route.prep } : { prep: [] })
  const [size, setSize] = useState('quick')
  const [busy, setBusy] = useState(false)
  const [said, setSaid] = useState('')
  const [sure, setSure] = useState(false)
  const clean = cleanRoute({ name, steps, kind: k === 'chore' ? undefined : k, drive })
  const changed = route && clean && (clean.steps.join('\u0000') !== route.steps.join('\u0000'))

  const setStep = (i, v) => { setSteps(steps.map((s, j) => (j === i ? v : s))); setPar(par.map((p, j) => (j === i ? null : p))) }
  const swap = (arr, i, j) => { const next = [...arr]; [next[i], next[j]] = [next[j], next[i]]; return next }
  const move = (i, d) => {
    const j = i + d
    if (j < 0 || j >= steps.length) return
    setSteps(swap(steps, i, j)); setDrive(swap(drive, i, j)); setPar(swap(par, i, j))
  }
  const remove = (i) => { setSteps(steps.filter((_, j) => j !== i)); setDrive(drive.filter((_, j) => j !== i)); setPar(par.filter((_, j) => j !== i)) }
  const add = () => { setSteps([...steps, '']); setDrive([...drive, false]); setPar([...par, null]) }

  // "Let PB break it down": the typed name becomes prep plus steps with par guesses.
  const breakDown = async (want = size) => {
    if (busy || name.trim().length < 2) return
    setBusy(true); setSize(want)
    const b = await askBreakdown({ text: name, kind: k, size: want }, { cache: bdCache })
    setBusy(false)
    if (!route) setName(b.name)
    setSteps(b.steps); setPar(b.par); setDrive(b.drive || b.steps.map(() => false))
    setExtras({ prep: b.prep, ...(route ? {} : { mess: b.mess, mood: b.mood }) })
    setSaid(b.source === 'pb' ? SOURCE_COPY.pb : b.match ? SOURCE_COPY.notes : SOURCE_COPY.generic)
  }
  // "Too big? Split it": one step becomes 2 to 4 smaller splits, each with its share of PB's guess.
  const [chopping, setChopping] = useState(-1)
  const lastAdmin = (i) => admin && i === steps.length - 1
  const canChop = (i) => !errand && !lastAdmin(i) && steps[i].trim().length > 1 && steps.length < LIMITS.maxSteps && chopping < 0
  const chop = async (i) => {
    if (!canChop(i)) return
    setChopping(i)
    const b = await askChop({ part: name, step: steps[i], kind: k, par: par[i] })
    setChopping(-1)
    const room = LIMITS.maxSteps - steps.length + 1
    const bits = b.steps.slice(0, room), bitPar = par[i] == null ? bits.map(() => null) : b.par.slice(0, room)
    const at = (arr, fill) => [...arr.slice(0, i), ...fill, ...arr.slice(i + 1)]
    setSteps(at(steps, bits)); setPar(at(par, bitPar)); setDrive(at(drive, bits.map(() => false)))
    setSaid(SOURCE_COPY.chop(bits.length))
  }
  const guess = parTotal(par, steps.length)
  const save = () => {
    if (!clean) return
    const keep = steps.map((s, i) => [s.trim(), par[i]]).filter(([s]) => s).map(([, p]) => p)
    const p = parTotal(keep, clean.steps.length) ? keep : undefined
    onSave({ ...(route ? { id: route.id } : {}), ...clean, ...(extras.prep ? { prep: extras.prep } : {}), par: p, ...(extras.mess ? { mess: extras.mess, mood: extras.mood } : {}) })
  }

  return (
    <>
      <header className="bar">
        <button className="back" onClick={onBack} aria-label="Back">←</button>
        <span className="bar-title">{route ? 'Edit run' : errand ? 'New errand' : admin ? 'New quest' : 'New run'}</span>
        <span />
      </header>

      <form className="edit" onSubmit={(e) => { e.preventDefault(); save() }}>
        <label className="field">
          <span className="mono eyebrow">{errand ? 'Errand' : admin ? 'Quest' : 'Chore'}</span>
          <input value={name} maxLength={LIMITS.name} onChange={(e) => setName(e.target.value)} placeholder={errand ? 'Library returns' : admin ? 'Update my address' : 'Clean the car'} required />
        </label>

        {!route?.template && (
          <div className="breakdown" aria-live="polite">
            <div className="row">
              <button type="button" className="chip-btn bd-go" onClick={() => breakDown()} disabled={busy || name.trim().length < 2}>
                {busy ? 'PB is casing the place…' : 'Let PB break it down'}
              </button>
              <div className="seg-ctl bd-size" role="radiogroup" aria-label="How long a run">
                {['quick', 'full'].map((z) => (
                  <button key={z} type="button" role="radio" aria-checked={size === z} onClick={() => (said ? breakDown(z) : setSize(z))} disabled={busy}>{z === 'quick' ? 'Quick' : 'Full'}</button>
                ))}
              </div>
            </div>
            {said && <p className="faint small">{said}</p>}
            {extras.prep?.length > 0 && (
              <p className="loadout"><span className="mono eyebrow">Grab first</span> {extras.prep.map((p, i) => (
                <button key={p} type="button" className="chip-btn small-chip" onClick={() => setExtras({ ...extras, prep: extras.prep.filter((_, j) => j !== i) })} aria-label={`Drop ${p}`}>{p} ×</button>
              ))}</p>
            )}
            {guess && <p className="muted small">PB guesses {aboutTime(guess)}. Your first run replaces the guess with your ghost.</p>}
          </div>
        )}

        <fieldset className="field">
          <legend className="mono eyebrow">{errand ? 'Legs · each one is a split' : 'Steps · each one is a split'}</legend>
          <p className="faint small">{errand
            ? 'Split where each leg ends: parked, at the counter, back home. Mark the driving legs and the clock hides while you drive.'
            : admin
              ? 'End on the confirmation: that’s the proof. Use the official site, and never type ID numbers or passwords into anything but it.'
              : 'Make the first step tiny (“grab the bucket”). Starting is the hard part.'}</p>
          <ol className="edit-steps">
            {steps.map((s, i) => (
              <li key={i}>
                <input value={s} maxLength={LIMITS.step} onChange={(e) => setStep(i, e.target.value)} placeholder={`Step ${i + 1}`} aria-label={`Step ${i + 1}`} />
                {!errand && <button type="button" className="icon chop" onClick={() => chop(i)} disabled={!canChop(i)} aria-label={`Split step ${i + 1} into smaller steps`} title="Too big? Split it">{chopping === i ? '…' : '✂'}</button>}
                {errand && <button type="button" className={`icon drive ${drive[i] ? 'on' : ''}`} aria-pressed={!!drive[i]} onClick={() => setDrive(drive.map((d, j) => (j === i ? !d : d)))} aria-label={`Leg ${i + 1} is a drive`}>🚗</button>}
                <button type="button" className="icon" onClick={() => move(i, -1)} disabled={!i} aria-label="Move up">↑</button>
                <button type="button" className="icon" onClick={() => remove(i)} disabled={steps.length <= 1} aria-label="Remove step">×</button>
              </li>
            ))}
          </ol>
          {steps.length < LIMITS.maxSteps && (
            <button type="button" className="chip-btn" onClick={add}>{errand ? '+ Add a leg' : '+ Add a step'}</button>
          )}
        </fieldset>

        {changed && <p className="note">New {errand ? 'legs' : 'steps'} mean a new ghost. Your old runs stay saved, but this route starts fresh.</p>}

        <button className="big-btn" type="submit" disabled={!clean}>Save</button>

        {route && !route.template && (
          sure
            ? <div className="row"><button type="button" className="chip-btn" onClick={() => setSure(false)}>Keep it</button>
                <button type="button" className="chip-btn warn" onClick={() => onDelete(route.id)}>Delete run and its ghosts</button></div>
            : <button type="button" className="textbtn" onClick={() => setSure(true)}>Delete this run</button>
        )}
      </form>
    </>
  )
}
