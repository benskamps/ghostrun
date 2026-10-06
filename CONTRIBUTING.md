# Contributing to Ghostrun

Thanks for poking at the ghost. Before you open a PR:

1. Read [`CLAUDE.md`](CLAUDE.md). It holds the product rules (no shame copy, PB takes the blame, the real task must get done) and the scope guardrails. PRs that break them get closed.
2. Read [`docs/PLAN.md`](docs/PLAN.md) for what's core and what's stretch.
3. Never commit secrets. API keys live in Vercel environment variables.

## Run it locally

```bash
npm install
npm run dev
```

Motion sensors need HTTPS on iOS, so test flip-to-split on the Vercel preview URL from your phone.

During Hackyard build week (Oct 5 to 9, 2026) this is a solo entry, so outside PRs are welcome after Oct 11.
