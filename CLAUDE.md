# Ghostrun: rules for anyone (human or agent) working in this repo

Read `docs/PLAN.md` first. These rules win when something is unclear.

## Product rules

1. **No shame copy.** Never guilt the player. No "you missed a day", no broken-streak warnings, no red "failure" screens. A missed day is just a day.
2. **PB takes the blame.** The ghost made the mess. Copy says "PB knocked over the laundry", never "you left the laundry".
3. **PB can't be killed, only outrun.** Winning makes PB fade (opacity toward 40%), sulk, or show respect. PB never dies or disappears.
4. **The real task gets done.** A run only counts as finished with proof: sensor activity by default, a photo for 100% runs. Don't add ways to finish a run without doing the chore.
5. **First run is "Record your ghost."** No par time, no red bar, nothing to lose.
6. **Not a to-do list app.** No task inboxes, due dates, or checklists for their own sake. Everything is a run.

## Scope guardrails

- Core is Chore%. Errand% is built (Ben made it the goal line on Oct 7): tap splits, location proof on the phone only, no ticking clock on driving legs. Admin% is stretch.
- Phone first. Design for one hand, a ~390px screen, and a phone lying face down.
- No accounts, no backend database. Runs and ghosts live in IndexedDB on the device.
- One serverless route only, for the Claude vision proof check. API keys live in Vercel env vars, never in client code or the repo.
- Cut list for the hackathon: native app, push notifications, online leaderboards.
- Any% is time only; 100% needs proof.

## Security (top to bottom, see SECURITY.md)

- Never commit keys, tokens, emails, or personal info. `.env*` stays gitignored; `.env.example` holds names only.
- Secrets live in Vercel env vars and are read server-side only. Never use the `VITE_` prefix for anything secret.
- Run a secret scan before every push (`npm run hooks` once enables the gitleaks pre-push hook). CI scans every push too.
- Keep the CSP in `vercel.json` strict: no inline scripts, no new third-party origins without a reason in the PR.
- New dependencies need a reason; `npm audit --audit-level=high` must pass.
- Any new serverless route: POST only, input size limits, same-origin, rate limit, no raw errors or keys in responses.
- Proof photos are sent to the proof route and not stored server-side.
- Admin% quests (stretch) link only to official sites and never ask for SSNs or logins.

## Visual language

- Dark house: void `#100D17`. PB: cold lilac `#CFC4FF`. Player: warm ember `#FFAE42`.
- PB body at 40 to 60% opacity; the opacity is the scoreboard.
- Fonts: Pixelify Sans (display), Geist (UI), Martian Mono (timers).

## Hackathon rules

- Hackyard Yard 4: all code written during build week (Oct 5 to 9, 2026), solo, AI allowed, open source (MIT).
- Ship deadline: Fri Oct 9, 18:00 UTC.
