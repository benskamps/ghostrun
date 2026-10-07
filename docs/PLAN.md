# Ghostrun: build plan

> Hackyard Yard 4 entry. Theme: gamify something mundane, and the real task has to actually get done.
> Build week: Mon Oct 5 to Fri Oct 9, 2026. All code in this repo was written during build week.

## Pitch

**Tagline:** "You don't need motivation, you need a ghost to beat."
Backup: "Chores aren't hard, they're boring. Ghostrun makes them a speedrun."

**Problem:** what kills chores is lack of interest, not lack of ability. Small game loops make the same work feel shorter and get it done faster: a timer, a split, beating yesterday's you.

**Ghostrun is LiveSplit for real life.** Speedrun your chores against your own ghost. Your phone times every step and splits by itself when you put it down or pick it up. A run only counts once the real task is proven done.

- **Before:** chores are an endless list with no finish line and no feedback.
- **After:** each one is a run with splits and a personal best to beat. The ghost of last Tuesday's you is 40 seconds ahead on the dishes.

## The ghost: PB

PB (short for personal best) is a pixel poltergeist who makes the mess in your house. PB *is* your best run.

- Body renders at 40 to 60% opacity, and the opacity is the scoreboard: ~60% when PB is winning, fading toward 40% as you pull ahead.
- Palette: dark house (void `#100D17`), PB in cold lilac `#CFC4FF`, you in warm ember `#FFAE42`.
- 11 moods: smug, taunt, giggle, sneaky, shocked, dizzy, rage, sulk, proud, sleepy, respect.
- PB can't be killed, only outrun.

## How it plays

A **route** is an ordered list of splits. A **run** times the route. Your best run becomes the **ghost** you race next time.

1. Pick or build a route from a template, or type your steps (AI can suggest them).
2. Hit start. The timer runs and splits advance with motion or a tap.
3. Finish. Sensors mark the splits (see Proof below).
4. See your splits against your best, with gold on every step you improved.

**First run: "Record your ghost."** No par and no red bar. You flip or tap to split, and Ghostrun asks only for motion permission. The run ends with "Ghost saved. Come beat it tomorrow."

## Signature tricks

- **Flip-to-split.** Set the phone face down to work, pick it up to log the split. Accelerometer and orientation catch both moves; a buzz confirms.
- **Ghost bar.** A thin bar shows where past-you was at this exact second.
- **Golden splits.** A chime when any single step beats its best. "Sum of best" shows your theoretical perfect run.
- **Any% vs 100%.** Any% is time only. 100% needs proof at the finish.
- **Run commentary.** One AI line at the finish in speedrun-caster voice: "Massive time save on the dishes, PB by 41 seconds."

## Proof (phone-first)

Sensors are the default proof; a photo only shows up for a 100% run.

| Run type | Default proof (no taps) | Optional 100% proof |
| --- | --- | --- |
| Indoor chore | Effort meter: accelerometer activity over each split | One photo at the finish |
| Outdoor chore | Leaving the door (GPS) plus the effort meter | One photo at the finish |
| Errand (stretch) | One location check when you tap to split at each stop | Receipt photo |

Pocket mode keeps the screen on (Wake Lock) behind a touch shield; a long press unlocks it.

## Chore breakdown

Type "clean the kitchen" and AI returns a prep list plus ordered steps, each with a par time. Each step is a split. After your first run, your ghost replaces the AI's guess.

## Habit loop

The loop is **always a few seconds from a personal best**. The near miss brings you back, not a streak you're afraid to break.

| Stage | What Ghostrun does |
| --- | --- |
| Trigger | A Daily Run slot: one run of 10 minutes or less waiting when you open the app. "Haunt me" books a calendar slot with a link straight back to the run, in place of push notifications |
| Action | One tap to start. The first split is tiny ("grab the trash bag") |
| Variable reward | Golden split chimes, the caster line, daily modifiers (One-Song%, No-Backtrack%, Lefty%). After a quiet stretch PB is caught napping, never "you missed a day" |
| Investment | Every run sharpens your ghost. "Time on the table" (PB minus sum of best) names tomorrow's target; "taken back from PB" only ever goes up |

## Tech stack

| Piece | Choice | Why |
| --- | --- | --- |
| App | Vite + React PWA, installable to the home screen | One codebase, no app store review |
| Runs and ghosts | IndexedDB on the device | No backend or login. Ghosts are stored split arrays |
| Motion splits | DeviceMotion and DeviceOrientation events | Flip-to-split with no extra hardware |
| Proof check | One serverless route calling Claude vision | Keeps the API key off the phone |
| Hosting | Vercel, repo public on GitHub | Free tier, auto deploys |
| Analytics | Vercel Web Analytics | Privacy-friendly page views, no cookies |

**Known browser limits to test on day one:**

- iOS only allows motion sensors after a tap on a permission prompt, and only over HTTPS. Put that tap in the start-run button.
- Browsers stop motion and location while the screen is off or the app is backgrounded. Keep the screen on with Wake Lock during a run.
- Fallback: if motion fails, a big tap-anywhere split button keeps the game playable.

**Cut line:** native app, push reminders (need a server job), and any online leaderboard come after the hackathon.

## Scope

- **Core:** Chore% runs (route, timer, flip/tap splits, ghost, golden splits, proof).
- **Stretch:** light Errand% (tap-to-split with one location check), Admin% life-admin quests.

## Build week

| Day | Layer | Gate |
| --- | --- | --- |
| Mon | PWA shell, timer, tap splits, motion permission | Flip-to-split works on a real phone |
| Tue | Routes, IndexedDB runs, ghost bar | Race your saved ghost end to end |
| Wed | PB sprite + moods, golden splits, AI chore breakdown | First run feels like a game |
| Thu | Proof route (Claude vision), effort meter, share card | A fake gets rejected |
| Fri | Polish, demo video, ship by 18:00 UTC | Submitted |

If the motion gate fails Monday, the tap-anywhere split ships as the main control and flip-to-split becomes a bonus.

## Demo video (90 s, one Chore% run)

1. **0:00 to 0:10, hook.** Phone face down by the sink. "My ghost does dishes faster than me."
2. **0:10 to 0:35, race.** Pick the phone up: buzz, gold split, ghost bar flips.
3. **0:35 to 0:50, honesty beat.** Shake the phone on the couch; Ghostrun refuses to count it.
4. **0:50 to 1:10, finish.** Run verifies, caster says "PB by 41 seconds", share card pops.
5. **1:10 to 1:30, close.** Sum of best shrinking over a week, tagline, repo link.
