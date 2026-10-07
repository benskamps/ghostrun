# Ghostrun: the vision

**First published:** October 6, 2026
**Author:** Ben Schippers, for brokenbranch (https://brokenbranch.dev)
**Status:** Chore% and Errand% are playable (built during Hackyard Yard 4, Oct 5 to 9, 2026). Admin% is planned and described here so the full concept is on the public record.

Ghostrun™ and PB™ are trademarks of Ben Schippers. The code in this repository is MIT licensed; the names, the PB character and this concept description are the author's.

## The idea in one line

Ghostrun turns the boring parts of life into speedruns against a ghost of your own best time, and only counts a run when real-world proof says the task actually got done.

## The core loop

1. **Pick a run.** A run is one real task (a chore, an errand route, a piece of life admin) broken into short, ordered **splits**.
2. **Race your ghost.** Your fastest previous run is replayed live as **PB**, a pixel ghost. Every split shows whether you are ahead of or behind PB.
3. **Split without touching the screen.** Splits are triggered by the phone's own sensors: a double knock on the counter, flipping the phone face down or face up, picking it up, or arriving at a place. Tapping is the fallback.
4. **Prove it.** A run only counts when evidence says the task happened:
   - motion and accelerometer activity consistent with the work, by default;
   - location arrival at each stop, for errands;
   - a photo checked by a vision model, for 100% runs;
   - a confirmation screenshot or receipt, for admin quests.
5. **Beat PB.** A faster run becomes the new PB. Nothing is ever lost for a slower or missed run.

## PB, the ghost of your personal best

- PB is the antagonist and the scapegoat: PB made the mess, hid the remote, knocked over the laundry. Copy blames PB, never the player.
- **Opacity is the scoreboard.** PB's body is drawn between 40% and 60% opacity: it glows when it leads and fades as you pull ahead.
- PB has moods (smug, sneaky, shocked, sulking, raging, taunting, respectful) driven by the live gap.
- PB can't be killed, only outrun. Beaten, it sulks and comes back hungrier.

## The map: three categories

| Category | Where | Splits | Proof |
| --- | --- | --- | --- |
| **Chore%** | Inside the home | Steps of a chore (scrape, wash, dry, wipe) | Motion sensors; photo for 100% |
| **Errand%** | Out in the world | Each stop on a route | Arrival at each stop; receipt photo for 100% |
| **Admin%** | Paperwork and accounts | Steps of a life-admin task (find, fill, submit) | Confirmation screenshot or receipt |

Any% is time only. 100% requires proof.

### Errand% (playable)

An errand route is a run. Each leg (drive there, drop it off, drive home) is a split you tap when it ends, and your arrival at each stop is the proof, checked by location. The first run records where the stops are; later runs check you reached them and stayed a moment. The clock hides on driving legs. PB is the ghost of your fastest route and is "already parked outside". The route, the stops and the times stay on the device.

### Admin% (planned)

Life admin (renewing a license, cancelling a subscription, filing a form) becomes a quest with splits and a ghost time. Quests link only to official sites and never ask for government ID numbers, passwords or logins. Proof is the confirmation the official site gives you.

## Principles

- **No shame.** No streaks to break, no guilt for missed days, no failure screens.
- **The real task gets done.** There is no way to finish a run without doing the thing.
- **Not a to-do list.** No inboxes or due dates. Everything is a run.
- **Yours stays yours.** No accounts. Runs and ghosts live on the device.
- **Phone first.** One hand, a small screen, and a phone that may be lying face down on a counter.

## What is built today

See [`PLAN.md`](PLAN.md) for the build plan and the live site at https://ghostrun-ten.vercel.app. This document describes intent; the repository history shows what exists and when it was written.
