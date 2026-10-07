// POST /api/proof: the one serverless route. A finished-chore photo goes in, a verdict comes out.
// The photo is passed to Claude once and never stored. Any failure fails closed: the run keeps
// whatever proof it already had and the player never sees an error or a key.
import Anthropic from '@anthropic-ai/sdk'
import { MAX_BYTES, TYPES, sameOrigin, sniff, cleanLabel, cleanSteps, makeLimiter, makeBudget, HOURLY_CAP, VERDICT_SCHEMA, system, userText, readVerdict } from './_proof-core.js'

const allow = makeLimiter()
const budget = makeBudget(Number(process.env.PROOF_HOURLY_CAP) || HOURLY_CAP)
let client = null

const reply = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
})
const closed = (status) => reply(status, { verdict: 'unavailable' })

export async function POST(request) {
  const h = request.headers
  if (!sameOrigin(h.get('origin'), h.get('host'))) return closed(403)

  const type = (h.get('content-type') || '').split(';')[0].trim().toLowerCase()
  if (!TYPES.includes(type)) return closed(415)
  if (Number(h.get('content-length') || 0) > MAX_BYTES) return closed(413)

  const ip = (h.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown'
  if (!allow(ip)) return closed(429)

  let buf
  try { buf = new Uint8Array(await request.arrayBuffer()) } catch { return closed(400) }
  if (!buf.length || buf.length > MAX_BYTES) return closed(413)
  const media = sniff(buf)
  if (media !== type) return closed(415)
  if (!process.env.ANTHROPIC_API_KEY || process.env.PROOF_OFF === '1') return closed(503)
  if (!budget()) return closed(429)

  const url = new URL(request.url)
  const chore = cleanLabel(url.searchParams.get('chore'))
  const steps = cleanSteps(url.searchParams.get('steps'))

  client ??= new Anthropic({ timeout: 25_000, maxRetries: 1 })
  try {
    const msg = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 1024,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema: VERDICT_SCHEMA } },
      system: system(),
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: media, data: Buffer.from(buf).toString('base64') } },
          { type: 'text', text: userText(chore, steps) },
        ],
      }],
    })
    if (msg.stop_reason === 'refusal' || msg.stop_reason === 'max_tokens') return reply(200, { verdict: 'unclear', seen: '' })
    const text = msg.content.find((b) => b.type === 'text')?.text
    return reply(200, text ? readVerdict(text) : { verdict: 'unclear', seen: '' })
  } catch (err) {
    // Log the kind of failure for us, never the body or the key, and tell the phone nothing.
    console.error('proof check failed:', err instanceof Anthropic.APIError ? `${err.status} ${err.name}` : err?.name)
    return closed(err instanceof Anthropic.RateLimitError ? 429 : 503)
  }
}
