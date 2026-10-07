// Ghost Link: pack a ghost (route + split times) into a URL-safe string, no backend.
// Format v1: "1." + base64url( utf8( name \x1f step1 \x1f step2 ... \x1e varints ) )
// Split times are cumulative ms, stored as varint deltas in centiseconds.

const US = "\x1f", RS = "\x1e";

function toVarints(nums) {
  const out = [];
  for (let n of nums) {
    do { let b = n & 0x7f; n >>>= 7; if (n) b |= 0x80; out.push(b); } while (n);
  }
  return out;
}

function fromVarints(bytes, start) {
  const nums = []; let n = 0, shift = 0;
  for (let i = start; i < bytes.length; i++) {
    n |= (bytes[i] & 0x7f) << shift; shift += 7;
    if (!(bytes[i] & 0x80)) { nums.push(n >>> 0); n = 0; shift = 0; }
  }
  return nums;
}

function b64url(bytes) {
  let s = ""; for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function unb64url(str) {
  const s = atob(str.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, c => c.charCodeAt(0));
}

/** ghost = { route: "Kitchen reset", steps: ["Clear", ...], splits: [cumulative ms, ...], by?: "Ben" } */
export function encodeGhost(ghost) {
  const { route, steps, splits, by = "" } = ghost;
  if (steps.length !== splits.length) throw new Error("steps and splits must match");
  const text = [by, route, ...steps].map(s => s.replaceAll(US, " ").replaceAll(RS, " ")).join(US);
  const cs = splits.map(ms => Math.round(ms / 10));
  const deltas = cs.map((c, i) => c - (i ? cs[i - 1] : 0));
  if (deltas.some(d => d < 0)) throw new Error("splits must be cumulative and increasing");
  const head = new TextEncoder().encode(text + RS);
  return "1." + b64url([...head, ...toVarints(deltas)]);
}

export function decodeGhost(code) {
  const [ver, body] = code.split(".");
  if (ver !== "1" || !body) throw new Error("not a ghost link");
  const bytes = unb64url(body);
  const sep = bytes.indexOf(RS.charCodeAt(0));
  const [by, route, ...steps] = new TextDecoder().decode(bytes.slice(0, sep)).split(US);
  let acc = 0;
  const splits = fromVarints(bytes, sep + 1).map(d => (acc += d) * 10);
  return { by, route, steps, splits };
}

/** Build/read a share URL. Uses the hash so nothing hits a server log. */
export const ghostUrl = (origin, ghost) => `${origin}/play#g=${encodeGhost(ghost)}`;
export const ghostFromLocation = (loc = location) => {
  const m = /[#&]g=([\w.-]+)/.exec(loc.hash);
  return m ? decodeGhost(m[1]) : null;
};

/** Untrusted input from a URL: decode, then bound every field. Returns null if anything is off. */
export function readGhost(code) {
  if (typeof code !== "string" || code.length > 2000) return null;
  try {
    const g = decodeGhost(code);
    const ok = g.steps.length >= 1 && g.steps.length <= 12 && g.splits.length === g.steps.length &&
      g.splits.every((c, i) => Number.isFinite(c) && c > (i ? g.splits[i - 1] : 0) && c < 24 * 3600 * 1000) &&
      [g.by, g.route, ...g.steps].every(s => typeof s === "string" && s.length <= 60) && g.route.trim();
    return ok ? { by: g.by.trim().slice(0, 24), route: g.route.trim(), steps: g.steps.map(s => s.trim() || "Step"), splits: g.splits } : null;
  } catch { return null; }
}
