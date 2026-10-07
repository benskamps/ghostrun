import { useCallback, useEffect, useRef, useState } from 'react'
import { getAll, put, del, setMeta, getMeta, uid, persist } from '../lib/store.js'
import { TEMPLATES, CUSTOM_MESSES, sameSteps } from '../lib/routes.js'
import { readGhost } from '../lib/ghost-link.js'
import Home from './Home.jsx'
import Ready from './Ready.jsx'
import Run from './Run.jsx'
import Done from './Done.jsx'
import Edit from './Edit.jsx'
import Import from './Import.jsx'
import './play.css'

const DEFAULT_PREFS = { sound: true, knock: true, flip: true, name: '' }

async function seed() {
  if (await getMeta('seeded')) return
  await Promise.all(TEMPLATES.map((t, i) => put('routes', { ...t, id: t.id, template: t.id, order: i, createdAt: Date.now() })))
  await setMeta('seeded', true)
}

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
      setPrefs({ ...DEFAULT_PREFS, ...(await getMeta('prefs', {})) })
      await reload()
      const g = ghostFromHash()
      if (g) setScreen({ name: 'import', ghost: g })
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
    history.replaceState(null, '', '/play')
    await reload()
    setScreen({ name: 'ready', routeId: route.id, opponent: 'rival' })
  }

  const finishRun = async (run, view) => {
    await put('runs', run)
    persist()
    await reload()
    setScreen({ name: 'done', routeId: run.routeId, run, view })
  }

  if (!data) return <div className="play loading"><p className="mono">PB is setting up…</p></div>
  const route = screen.routeId && data.routes.find((r) => r.id === screen.routeId)

  return (
    <div className={`play screen-${screen.name}`}>
      {screen.name === 'home' && (
        <Home data={data} prefs={prefs} note={screen.note} onPrefs={savePrefs}
          onPick={(id) => setScreen({ name: 'ready', routeId: id })}
          onNew={() => setScreen({ name: 'edit' })} />
      )}
      {screen.name === 'import' && (
        <Import ghost={screen.ghost} onAccept={() => acceptGhost(screen.ghost)}
          onSkip={() => { history.replaceState(null, '', '/play'); setScreen({ name: 'home' }) }} />
      )}
      {screen.name === 'edit' && (
        <Edit route={route} onSave={saveRoute} onDelete={deleteRoute}
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
        <Done route={route} runs={data.runs} run={screen.run} view={screen.view} prefs={prefs} onPrefs={savePrefs}
          onAgain={() => setScreen({ name: 'ready', routeId: route.id })}
          onHome={() => setScreen({ name: 'home' })} />
      )}
    </div>
  )
}
