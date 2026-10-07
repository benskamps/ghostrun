import { useCallback, useEffect, useRef, useState } from 'react'
import { getAll, put, del, setMeta, getMeta, uid, persist, wipe } from '../lib/store.js'
import { TEMPLATES, ERRAND_TEMPLATES, ADMIN_TEMPLATES, CUSTOM_MESSES, MODES, sameSteps, kindOf } from '../lib/routes.js'
import { readGhost } from '../lib/ghost-link.js'
import Home from './Home.jsx'
import Ready from './Ready.jsx'
import Run from './Run.jsx'
import Done from './Done.jsx'
import Edit from './Edit.jsx'
import Import from './Import.jsx'
import Ghosts from './Ghosts.jsx'
import './play.css'

const DEFAULT_PREFS = { sound: true, voice: true, knock: true, flip: true, name: '', mode: 'chore' }

const plant = (list, offset) => Promise.all(list.map((t, i) => put('routes', { ...t, id: t.id, template: t.id, order: offset + i, createdAt: Date.now() })))

async function seed() {
  if (!(await getMeta('seeded'))) { await plant(TEMPLATES, 0); await setMeta('seeded', true) }
  if (!(await getMeta('seededErrands'))) { await plant(ERRAND_TEMPLATES, 100); await setMeta('seededErrands', true) }
  if (!(await getMeta('seededAdmin'))) { await plant(ADMIN_TEMPLATES, 200); await setMeta('seededAdmin', true) }
}

// /play?mode=errand or ?mode=admin from the landing page. Read once, before the back-button guard rewrites the URL.
const asked = new URLSearchParams(location.search).get('mode')
// /play?run=<route id> from a "Haunt me" calendar invite: straight to that run's start line.
const invited = new URLSearchParams(location.search).get('run')

function ghostFromHash() {
  const m = /[#&]g=([\w.-]+)/.exec(location.hash)
  return m ? readGhost(m[1]) : null
}

export default function Play() {
  const [data, setData] = useState(null) // { routes, runs }
  const [prefs, setPrefs] = useState(DEFAULT_PREFS)
  const [screen, setScreen] = useState({ name: 'home' })

  const reload = useCallback(async () => {
    const [routes, runs] = await Promise.all([getAll('routes'), getAll('runs')])
    setData({ routes, runs })
    return { routes, runs }
  }, [])

  useEffect(() => {
    document.title = 'Ghostrun · Play'
    ;(async () => {
      await seed()
      const saved = { ...DEFAULT_PREFS, ...(await getMeta('prefs', {})) }
      setPrefs(MODES.includes(asked) ? { ...saved, mode: asked } : saved)
      const { routes } = await reload()
      const g = ghostFromHash()
      const inv = invited && routes.find((r) => r.id === invited)
      if (g) setScreen({ name: 'import', ghost: g })
      else if (inv) { setPrefs((p) => ({ ...p, mode: kindOf(inv) })); setScreen({ name: 'ready', routeId: inv.id }) }
      else if (location.hash.includes('g=')) setScreen({ name: 'home', note: 'That ghost link looks broken. Ask for a fresh one.' })
    })()
  }, [reload])

  // A ghost link opened while the app is already open only changes the hash.
  useEffect(() => {
    const onHash = () => { const g = ghostFromHash(); if (g) setScreen({ name: 'import', ghost: g }) }
    addEventListener('hashchange', onHash)
    return () => removeEventListener('hashchange', onHash)
  }, [])

  // Phone back gesture: step back a screen instead of leaving the app. Mid-run it does nothing.
  const screenRef = useRef(screen)
  screenRef.current = screen
  useEffect(() => {
    const onPop = () => {
      const s = screenRef.current
      if (location.hash.includes('g=')) return // a ghost link; hashchange takes it from here
      history.pushState(null, '', location.pathname)
      if (s.name === 'run') return
      if (s.name === 'done' || s.name === 'edit') setScreen(s.routeId ? { name: 'ready', routeId: s.routeId } : { name: 'home' })
      else setScreen({ name: 'home' })
    }
    history.pushState(null, '', location.pathname + location.hash)
    addEventListener('popstate', onPop)
    return () => removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => { window.scrollTo(0, 0) }, [screen.name])

  const savePrefs = (p) => { const next = { ...prefs, ...p }; setPrefs(next); setMeta('prefs', next) }

  const saveRoute = async (route) => {
    const existing = route.id && data.routes.find((r) => r.id === route.id)
    const next = existing
      ? { ...existing, ...route }
      : { ...route, id: uid(), order: data.routes.length, createdAt: Date.now(), mess: CUSTOM_MESSES[data.routes.length % CUSTOM_MESSES.length], mood: 'sneaky' }
    if (existing && !sameSteps(existing.steps, next.steps)) delete next.places // new legs, new stops
    await put('routes', next)
    await reload()
    setScreen({ name: 'ready', routeId: next.id })
  }

  const deleteRoute = async (id) => {
    await Promise.all(data.runs.filter((r) => r.routeId === id).map((r) => del('runs', r.id)))
    await del('routes', id)
    await reload()
    setScreen({ name: 'home' })
  }

  const acceptGhost = async (g) => {
    let route = data.routes.find((r) => r.name === g.route && sameSteps(r.steps, g.steps))
    const rival = { by: g.by, steps: g.steps, splits: g.splits, at: Date.now() }
    if (route) route = { ...route, rival }
    else {
      const who = g.by || 'Someone'
      route = { id: uid(), name: g.route, steps: g.steps, order: -1, createdAt: Date.now(), mood: 'taunt', mess: `${who}’s ghost moved in. It is very smug about its time.`, rival }
    }
    await put('routes', route)
    if (prefs.mode !== 'chore') savePrefs({ mode: 'chore' }) // ghost links are chores
    history.replaceState(null, '', '/play')
    await reload()
    setScreen({ name: 'ready', routeId: route.id, opponent: 'rival' })
  }

  const finishRun = async (run, view) => {
    await put('runs', run)
    // An errand's first verified run teaches the route where its stops are.
    const route = data.routes.find((r) => r.id === run.routeId)
    if (route && view.places && !route.places?.some(Boolean) && run.verified) await put('routes', { ...route, places: view.places })
    persist()
    await reload()
    setScreen({ name: 'done', routeId: run.routeId, run, view })
  }

  const updateRun = async (run) => {
    await put('runs', run)
    await reload()
    setScreen((s) => (s.name === 'done' ? { ...s, run } : s))
  }

  // A backup from another phone. Same ids overwrite, so loading twice is harmless.
  const importBackup = async ({ routes, runs, name }) => {
    for (const r of routes) await put('routes', r)
    for (const r of runs) await put('runs', r)
    if (name && !prefs.name) savePrefs({ name })
    persist()
    await reload()
  }

  const startFresh = async () => {
    await wipe()
    location.replace('/play')
  }

  if (!data) return <div className="play loading"><p className="mono">PB is setting up…</p></div>
  const route = screen.routeId && data.routes.find((r) => r.id === screen.routeId)

  return (
    <div className={`play screen-${screen.name}`}>
      {screen.name === 'home' && (
        <Home data={data} prefs={prefs} note={screen.note} onPrefs={savePrefs}
          onPick={(id) => setScreen({ name: 'ready', routeId: id })}
          onNew={() => setScreen({ name: 'edit', kind: prefs.mode })}
          onGhosts={() => setScreen({ name: 'ghosts' })} />
      )}
      {screen.name === 'ghosts' && (
        <Ghosts data={data} prefs={prefs} onBack={() => setScreen({ name: 'home' })} onImport={importBackup} onWipe={startFresh} />
      )}
      {screen.name === 'import' && (
        <Import ghost={screen.ghost} onAccept={() => acceptGhost(screen.ghost)}
          onSkip={() => { history.replaceState(null, '', '/play'); setScreen({ name: 'home' }) }} />
      )}
      {screen.name === 'edit' && (
        <Edit route={route} kind={screen.kind} onSave={saveRoute} onDelete={deleteRoute}
          onBack={() => setScreen(route ? { name: 'ready', routeId: route.id } : { name: 'home' })} />
      )}
      {screen.name === 'ready' && route && (
        <Ready route={route} runs={data.runs} prefs={prefs} onPrefs={savePrefs} initialOpponent={screen.opponent}
          onBack={() => setScreen({ name: 'home' })}
          onEdit={() => setScreen({ name: 'edit', routeId: route.id })}
          onStart={(setup) => setScreen({ name: 'run', routeId: route.id, setup })} />
      )}
      {screen.name === 'run' && route && (
        <Run route={route} runs={data.runs} setup={screen.setup} prefs={prefs}
          onFinish={finishRun}
          onAbandon={() => setScreen({ name: 'ready', routeId: route.id })} />
      )}
      {screen.name === 'done' && route && (
        <Done route={route} runs={data.runs} run={screen.run} view={screen.view} prefs={prefs} onPrefs={savePrefs} onRunUpdate={updateRun}
          onAgain={() => setScreen({ name: 'ready', routeId: route.id })}
          onHome={() => setScreen({ name: 'home' })} />
      )}
    </div>
  )
}
