/* PB sprite engine, from the PB kit (dash/pb-assets/pb-sprite.js), as an ES module.
   PBSprite.draw(canvas, mood, timeMs, {alpha, trail, scale, still})  animated, in place
   PBSprite.drawFrame(ctx, mood, frame, scale, x, y, alpha)            one static frame
   Grid: 28x26 cells per sprite. Body 20x18 at offset (4,5). */
const GW = 28, GH = 26, OX = 4, OY = 5;
const C = { line: "#6f63a8", body: "#e8e2ff", shade: "#b6a9e8", hi: "#ffffff", k: "#1a1430", w: "#ffffff",
  p: "#ff9ec4", r: "#ff5d7a", rage: "#ffc2cf", rageShade: "#e8a0b4" };

const FACES = {
  smug:    { arms: "hip", rows: { 6: "...kkk....kkk...", 7: "....kk....kk....", 9: "..pp.......kpp..", 10: ".......kkkk....." } },
  taunt:   { arms: "up", rows: { 6: "....wk..........", 7: "....kk...kkk....", 8: "....kk..........", 10: "......kkkk......", 11: ".......rr.......", 12: ".......rr......." } },
  giggle:  { arms: "down", particle: "note", rows: { 6: ".....k....k.....", 7: "....k.k..k.k....", 8: "..pp........pp..", 9: "......kkkk......", 10: "......krrk......", 11: ".......kk......." } },
  sneaky:  { arms: "out", particle: "sweat", slide: true, rows: { 6: "...wk....wk.....", 7: "...kk....kk.....", 8: "...kk....kk.....", 10: "......kkk......." } },
  shocked: { arms: "up", particle: "bang", jump: true, rows: { 5: "...kkk....kkk...", 6: "...kwk....kwk...", 7: "...kkk....kkk...", 9: ".......kk.......", 10: "......k..k......", 11: ".......kk......." } },
  dizzy:   { arms: "down", particle: "swirl", sway: true, rows: { 6: "....k.k..k.k....", 7: ".....k....k.....", 8: "....k.k..k.k....", 10: "......kk.kk.....", 11: ".....k..k..k...." } },
  rage:    { arms: "up", particle: "vein", tint: true, shake: true, rows: { 5: "...k........k...", 6: "....k......k....", 7: "....kk....kk....", 8: "....kk....kk....", 10: ".....kkkkkk.....", 11: ".....kwwwwk.....", 12: ".....kkkkkk....." } },
  sulk:    { arms: "down", droop: true, rows: { 5: "......k..k......", 6: "....kk....kk....", 7: "....kk....kk....", 8: "....w...........", 9: "....w...........", 10: "......kkkk......", 11: ".....k....k....." } },
  proud:   { arms: "up", particle: "spark", rows: { 6: ".....k....k.....", 7: "....k.k..k.k....", 9: ".....kkkkkk.....", 10: ".....kwwwwk.....", 11: "......kkkk......" } },
  sleepy:  { arms: "down", particle: "z", slow: true, rows: { 7: "....kk....kk....", 10: ".......kk......." } },
  respect: { arms: "down", particle: "heart", rows: { 6: "....wk....wk....", 7: "....kk....kk....", 8: "....kk....kk....", 9: "..pp........pp..", 10: "......k..k......", 11: ".......kk......." } }
};
const GLYPH = {
  z: { c: "#ece6f7", g: ["kkkk", "..k.", ".k..", "kkkk"] },
  heart: { c: "#ff9ec4", g: [".k.k.", "kkkkk", ".kkk.", "..k.."] },
  bang: { c: "#ffae42", g: ["k", "k", "k", ".", "k"] },
  vein: { c: "#ff5d7a", g: [".k.k.", "kkkkk", ".k.k.", "kkkkk", ".k.k."] },
  spark: { c: "#ffae42", g: ["..k..", "..k..", "kk.kk", "..k..", "..k.."] },
  sweat: { c: "#9fd3ff", g: [".k.", "kkk", "kkk", ".k."] },
  note: { c: "#cfc4ff", g: ["..kk", "..k.", "..k.", "kkk.", "kk.."] },
  swirl: { c: "#cfc4ff", g: ["kkkk", "k...", "k.kk", "k..k", "kkkk"] }
};
const ARMS = { down: [[1, 9], [1, 10], [0, 11]], up: [[1, 6], [0, 5], [0, 4]], out: [[1, 8], [0, 8]], hip: [[1, 10], [0, 9]] };
const cache = {};
function mask(frame, arms) {
  const key = frame + arms; if (cache[key]) return cache[key];
  const m = []; for (let y = 0; y < 18; y++) m.push(new Array(20).fill(0));
  const spans = { 0: [5, 10], 1: [3, 12], 2: [2, 13], 3: [1, 14], 4: [1, 14] };
  for (let y = 0; y <= 14; y++) { const s = spans[y] || [0, 15]; for (let x = s[0]; x <= s[1]; x++) m[y][x + 2] = 1; }
  for (let x = 0; x < 16; x++) { const p = (x + frame * 2) % 4; if (p !== 3) m[15][x + 2] = 1; if (p === 1) m[16][x + 2] = 1; }
  (ARMS[arms] || []).forEach(([x, y]) => { m[y][x] = 1; m[y][19 - x] = 1; });
  // classify: 0 empty, 1 fill, 2 outline
  const out = m.map((row, y) => row.map((v, x) => {
    if (!v) return 0;
    const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const yy = y + dy, xx = x + dx; return yy < 0 || yy >= 18 || xx < 0 || xx >= 20 || !m[yy][xx]; });
    return edge ? 2 : 1;
  }));
  return (cache[key] = out);
}
function paint(ctx, F, frame, s, ox, oy, alpha, fx) {
  fx = fx || {};
  const m = mask(frame, F.arms);
  const bodyC = F.tint ? C.rage : C.body, shadeC = F.tint ? C.rageShade : C.shade;
  const px = (x, y, col, a) => { ctx.globalAlpha = a; ctx.fillStyle = col; ctx.fillRect(Math.round(ox + x * s), Math.round(oy + y * s), s, s); };
  if (fx.trail) fx.trail.forEach(([off, a]) => { for (let y = 0; y < 18; y++) for (let x = 0; x < 20; x++) if (m[y][x]) px(x + off, y + 0.4, C.body, a * alpha); });
  for (let y = 0; y < 18; y++) for (let x = 0; x < 20; x++) {
    const v = m[y][x]; if (!v) continue;
    const rx = x - 2; let col = bodyC;
    if (v === 2) col = C.line; else if (rx >= 13 || y >= 13) col = shadeC;
    else if ((y === 2 && (rx === 3 || rx === 4)) || (y === 3 && rx === 3)) col = C.hi;
    px(x, y, col, alpha);
  }
  const fa = Math.min(0.92, alpha + 0.35); // face stays readable
  Object.keys(F.rows).forEach(y => { [...F.rows[y]].forEach((ch, x) => { if (ch !== ".") px(x + 2, +y, C[ch], fa); }); });
}
function glyph(ctx, name, s, gx, gy, a) {
  const G = GLYPH[name]; ctx.globalAlpha = a; ctx.fillStyle = G.c;
  G.g.forEach((r, yy) => [...r].forEach((ch, xx) => { if (ch === "k") ctx.fillRect(Math.round((gx + xx) * s), Math.round((gy + yy) * s), s, s); }));
}
const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

function draw(cv, mood, t, opt) {
  opt = opt || {};
  const F = FACES[mood] || FACES.smug, s = opt.scale || +cv.dataset.scale || 8;
  if (cv.width !== GW * s) { cv.width = GW * s; cv.height = GH * s; }
  const ctx = cv.getContext("2d"); ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, cv.width, cv.height);
  const sp = F.slow ? 2.2 : 1, still = reduce || opt.still;
  const frame = still ? 0 : Math.floor(t / (280 * sp)) % 2;
  let bob = still ? 0 : Math.sin(t / (650 * sp)) * 0.9, dx = 0;
  if (!still) {
    if (F.shake) dx = (Math.random() - 0.5) * 0.6;
    if (F.jump) bob -= Math.max(0, Math.sin(t / 260)) * 1.2;
    if (F.sway) dx = Math.sin(t / 300) * 1.2;
    if (F.slide) dx = Math.sin(t / 900) * 2;
    if (F.droop) bob += 1;
  }
  const alpha = opt.alpha != null ? opt.alpha : (still ? 0.5 : 0.5 + 0.1 * Math.sin(t / 900));
  const trail = opt.trail && !still ? [[-3 + Math.sin(t / 400) * 0.5, 0.12], [-1.6, 0.2]] : null;
  paint(ctx, F, frame, s, (OX + dx) * s, (OY + bob) * s, alpha, { trail });
  if (F.particle) {
    const cyc = still ? 0 : (t / 1400) % 1;
    glyph(ctx, F.particle, s, 19 + (still ? 0 : Math.sin(t / 500) * 0.6), OY - 3 + 1 - cyc * 3, Math.max(0, 0.9 * (1 - cyc)));
  }
  ctx.globalAlpha = 1;
  return alpha;
}
function drawFrame(ctx, mood, frame, s, x, y, alpha) {
  const F = FACES[mood] || FACES.smug;
  ctx.imageSmoothingEnabled = false;
  paint(ctx, F, frame, s, x + OX * s, y + OY * s, alpha == null ? 0.5 : alpha);
  if (F.particle) glyph(ctx, F.particle, s, x / s + 19, y / s + OY - 2, 0.9);
  ctx.globalAlpha = 1;
}
export const PBSprite = { GW, GH, MOODS: Object.keys(FACES), draw, drawFrame, reduce };
