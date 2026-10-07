# Ghostrun

**You don't need motivation, you need a ghost to beat.**

Ghostrun is LiveSplit for real life: speedrun your chores against your own ghost. Your phone times every step and splits by itself when you set it face down or pick it up. A run only counts once the real chore is proven done.

Your best run becomes **PB**, a pixel poltergeist who made the mess in the first place. Beat PB and it fades. It never dies. It just sulks.

**Play it:** [ghostrun-ten.vercel.app/play](https://ghostrun-ten.vercel.app/play) (best on a phone).

- Phone-first PWA, no accounts. Runs and ghosts live on your device (IndexedDB).
- Split by tapping, knocking twice on the counter, or flipping the phone face down and picking it up.
- Sensor proof: an effort meter rejects couch shakes, impossible splits and a phone that never moved. Those runs save as Any% (time only).
- Dread Check (guess vs. real time), Ghost Links (send your ghost in a URL, no backend), PB's hum (the race is audible face down), Frankenghost (sum of best), Daily Haunt modifiers, and a Seismograph share card.
- **100% runs:** snap the finished chore and Claude checks it once (`api/proof.js`). The photo is never stored.
- **Works offline** once opened: a service worker keeps the game on the phone.

## Where things live

| Path | What |
| --- | --- |
| `src/play/` | The game at `/play`: home, ready, run, results, editor, ghost-link import |
| `src/lib/` | Framework-free logic: race math, proof, knock and flip detectors, ghost links, PB sprite, PB's hum, seismograph, storage |
| `test/` | `npm test` (Node's built-in runner, no deps) |
| `public/pb/` | PB sprite atlas and mood stills from the PB kit |

Built solo for [Hackyard Yard 4](https://hackyard.tech) ("gamify something mundane"), Oct 5 to 9, 2026.

- Vision (chores, errands, life admin): [`docs/VISION.md`](docs/VISION.md)
- Plan: [`docs/PLAN.md`](docs/PLAN.md)
- Rules for contributors and agents: [`CLAUDE.md`](CLAUDE.md), [`CONTRIBUTING.md`](CONTRIBUTING.md)

## Dev

```bash
npm install
npm run dev    # landing at /, game at /play
npm test
```

Code is MIT licensed. Ghostrun™ and PB™ are trademarks of Ben Schippers (brokenbranch); the license covers the code, not the names or character.

Fonts (self-hosted, SIL Open Font License): Pixelify Sans, Geist, Martian Mono.
