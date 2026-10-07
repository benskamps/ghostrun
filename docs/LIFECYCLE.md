# Ghostrun: player lifecycle

Mapped Oct 7, 2026 against main at 287bc3d. What a player meets at each stage, where it leaks, and what's done about it.

| Stage | What happens today | Gap | Status |
| --- | --- | --- | --- |
| 1. Discover | Landing page, 30s trailer, OG card, Hackyard vote page | Most voters arrive on a laptop; the game needs a phone | **Fixed:** /play on a laptop shows a QR handoff, with "try it here anyway" |
| 2. First open | Home: "Your house is haunted", 10 chores + 3 errands seeded | Fine. No sign-up, no tutorial wall | Keep |
| 3. First run | "Record your ghost", no par, motion asked on the start tap | Motion denied falls back to tap, labelled "time only" | Keep |
| 4. First finish | Result, splits, seismograph, send-a-ghost | Nothing tells you the ghost could vanish | **Fixed:** "Put PB on your home screen" card after a run |
| 5. Return | Daily haunt, weekly run count, near-miss PB | Habit loop is its own thread | Not this PR |
| 6. Keep | IndexedDB on one phone, `persist()` asked | iOS Safari wipes site data after ~7 days away unless installed; new phone = no ghosts | **Fixed:** install nudge (iOS steps, Android prompt), backup file save/load |
| 7. Share | Ghost link, share line, seismograph card | Fine | Keep |
| 8. Leave | No way to clear data | A player should be able to start over | **Fixed:** "Start fresh" with a confirm step |
| 9. After Hackyard | vercel.app URL, MIT repo | Domain move would orphan installs and ghost links | Open: pick the long-term domain before posting links widely |

## Shipped in this pass

- Desktop handoff card on /play (static QR to `ghostrun-ten.vercel.app/play`; regenerate `public/play-qr.svg` if the domain changes).
- Install card after a run and on the Your ghosts screen. Chrome's prompt is held until then; iOS gets Share → Add to Home Screen.
- Your ghosts screen (Home footer): counts, backup save/load as a JSON file made on the device, start fresh.
- Manifest: `id`, Chore%, Errand% and Admin% shortcuts, categories.

## Open after Friday

- **Domain.** Ghost links and installs are tied to the origin. Moving off `ghostrun-ten.vercel.app` later means old links break and installed players start empty unless they load a backup. Decide before the vote push.
- **Backup reminder.** After N runs, nudge once to save a backup (no guilt copy, PB "packs a bag").
- **Measure the funnel.** `run_finish`, `share`, `install` and `backup` events exist; Vercel custom events need the Pro plan to show up.
