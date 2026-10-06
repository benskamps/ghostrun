# Security

Ghostrun is open source, so the code is public by design. Secrets never are.

## Reporting a vulnerability

Please use GitHub's **Report a vulnerability** button on the Security tab of this repo (private advisory). Don't open a public issue for security problems.

## How the project is locked down

- **No secrets in the repo, ever.** The Claude API key lives only in Vercel environment variables and is read by the serverless proof route. Nothing secret uses the `VITE_` prefix, so nothing secret reaches the browser bundle.
- **Secret scanning on every push.** CI runs gitleaks across full history on every push and PR. A local pre-push hook (`npm run hooks` to enable) runs the same scan before anything leaves your machine. GitHub secret scanning is on for this public repo.
- **Dependencies.** Dependabot opens weekly update PRs for npm and GitHub Actions; CI fails on high-severity `npm audit` findings.
- **Security headers** (see `vercel.json`): strict Content-Security-Policy (everything from this origin only: scripts, styles, self-hosted fonts; no inline scripts, no framing), HSTS, nosniff, `X-Frame-Options: DENY`, strict referrer policy, and a Permissions-Policy that allows only the sensors the game needs (motion, camera for proof photos, location, wake lock) on this origin.
- **No accounts, minimal data.** Runs and ghosts live in IndexedDB on your device. Proof photos are sent to the proof route for a single check and not stored. Analytics are Vercel Web Analytics: no cookies, no cross-site tracking.
- **Proof route hardening** (when it ships): POST only, size-limited image input, same-origin only, rate-limited, and never echoes the key or raw model errors.

## Ready for a traffic spike

The site is static: built once, served from Vercel's CDN, with long-lived immutable caching on hashed assets and fonts. There is no server, database, or third-party origin to overload, so a front-page moment costs bandwidth, not uptime.

Before the proof route ships (the only thing that spends money per request), all of these must be true:

1. **Spend caps:** a monthly spend limit on the Anthropic API key, and Vercel Spend Management turned on with a hard cap.
2. **Rate limit:** a Vercel Firewall rate-limit rule on `/api/*` (per IP), plus a per-device daily cap in the route.
3. **Request limits:** POST only, `Content-Type: image/jpeg|png|webp`, body under 1.5 MB, images downscaled on the phone before upload.
4. **Origin check:** reject requests whose `Origin` isn't the production domain.
5. **Fail closed:** if the proof check errors or the cap is hit, the run saves as Any% (time only) and never exposes the error or the key.
6. **Under attack:** Vercel Attack Challenge Mode can be flipped on from the Firewall tab.
