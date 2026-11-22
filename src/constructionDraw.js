// constructionDraw.js — SVG drawings + print-ready HTML for construction output (pure string builders).
import { ftIn, TEMPLATE_LABELS, BUILD_STAGES, stageProgress } from "./construction.js";

const INK = "#222", WOOD = "#ecd9b0", FACE = "#f6efe0", DASH = "#8a8a8a";
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const bubble = (x, y, t) =>
  `<g><circle cx="${x}" cy="${y}" r="7" fill="#fff" stroke="${INK}" stroke-width="0.8"/><text x="${x}" y="${y + 3}" font-size="8" font-weight="700" text-anchor="middle" fill="${INK}" font-family="Helvetica,Arial,sans-serif">${esc(t)}</text></g>`;
const txt = (x, y, t, o = {}) =>
  `<text x="${x}" y="${y}" font-size="${o.size || 9}" text-anchor="${o.anchor || "middle"}" fill="${o.fill || INK}" font-family="Helvetica,Arial,sans-serif"${o.rot ? ` transform="rotate(${o.rot} ${x} ${y})"` : ""}>${esc(t)}</text>`;
const hdim = (x1, x2, y, label) =>
  `<g stroke="${INK}" stroke-width="0.8" fill="none"><line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}"/><line x1="${x1}" y1="${y - 4}" x2="${x1}" y2="${y + 4}"/><line x1="${x2}" y1="${y - 4}" x2="${x2}" y2="${y + 4}"/></g>${txt((x1 + x2) / 2, y + 12, label)}`;
const vdim = (y1, y2, x, label) =>
  `<g stroke="${INK}" stroke-width="0.8" fill="none"><line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}"/><line x1="${x - 4}" y1="${y1}" x2="${x + 4}" y2="${y1}"/><line x1="${x - 4}" y1="${y2}" x2="${x + 4}" y2="${y2}"/></g>${txt(x - 6, (y1 + y2) / 2, label, { rot: -90 })}`;
const wrap = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="background:#fff;max-width:100%;height:auto">${body}</svg>`;

function svgFlat(pc) {
  const d = pc.draw, { W, H, style } = d;
  const S = Math.min(300 / W, 400 / H), mx = 52, my = 20;
  const w = W * S, h = H * S, vw = w + mx + 70, vh = h + my + 40;
  const X = (x) => mx + x * S, Y = (y) => my + h - y * S;
  let b = `<rect x="${X(0)}" y="${Y(H)}" width="${w}" height="${h}" fill="${style === "hollywood" ? FACE : "#fff"}" stroke="${INK}" stroke-width="1.4"/>`;
  for (const m of pc.members) {
    const dashed = style === "hollywood";
    b += `<rect x="${X(m.x)}" y="${Y(m.y + m.h)}" width="${m.w * S}" height="${m.h * S}" fill="${dashed ? "none" : WOOD}" stroke="${dashed ? DASH : INK}" stroke-width="${dashed ? 0.8 : 0.9}"${dashed ? ' stroke-dasharray="4,3"' : ""}/>`;
  }
  if (d.opening) {
    const o = d.opening;
    if (o.arch) {
      const r = o.arch, ow = o.w * S, spring = Y(o.y + o.h - r);
      const R = (o.w * o.w / 4 + r * r) / (2 * r) * S;
      b += `<path d="M${X(o.x)},${Y(o.y)} L${X(o.x)},${spring} A${R.toFixed(1)},${R.toFixed(1)} 0 0 1 ${X(o.x) + ow},${spring} L${X(o.x) + ow},${Y(o.y)} Z" fill="#fff" stroke="${INK}" stroke-width="1.2" stroke-dasharray="6,3"/>`;
    } else
    b += `<rect x="${X(o.x)}" y="${Y(o.y + o.h)}" width="${o.w * S}" height="${o.h * S}" fill="#fff" stroke="${INK}" stroke-width="1.2" stroke-dasharray="6,3"/>`;
    b += txt(X(o.x + o.w / 2), Y(o.h / 2), `OPENING ${ftIn(o.w)} × ${ftIn(o.h)}`, { size: 8, fill: "#555" });
  }
  const seen = new Set();
  for (const m of pc.members) {
    const k = m.letter + Math.round(m.x) + "," + Math.round(m.y);
    if (seen.has(k)) continue; seen.add(k);
    b += bubble(X(m.x + m.w / 2), Y(m.y + m.h / 2), m.letter);
  }
  b += hdim(X(0), X(W), my + h + 16, ftIn(W)) + vdim(Y(H), Y(0), mx - 16, ftIn(H));
  const ys = [...new Set(pc.members.filter((m) => /toggle|header|stog|utog/.test(m.key) && m.x <= 3).map((m) => Math.round((m.y + m.h / 2) * 8) / 8))];
  for (const y of ys) b += `<line x1="${X(W)}" y1="${Y(y)}" x2="${X(W) + 6}" y2="${Y(y)}" stroke="${INK}" stroke-width="0.8"/>` + txt(X(W) + 8, Y(y) + 3, ftIn(y), { anchor: "start", size: 8 });
  b += txt(vw / 2, vh - 2, style === "hollywood" ? "FRONT (facing shown; frame hidden, on edge)" : "FRONT (frame laid flat; cover not shown)", { size: 8, fill: "#666" });
  return wrap(vw, vh, b);
}

function svgPlatform(pc) {
  const d = pc.draw, { L, W: Wd, heightIn, nj, nx, ny, legLen, deckT, fw, ft } = d;
  const S = Math.min(360 / L, 200 / Wd), mx = 40, my = 16;
  const w = L * S, h = Wd * S;
  const L_ = pc.letters;
  // plan
  let a = `<rect x="${mx}" y="${my}" width="${w}" height="${h}" fill="${WOOD}" stroke="${INK}" stroke-width="1.2"/>`;
  a += `<rect x="${mx + ft * S}" y="${my + ft * S}" width="${w - 2 * ft * S}" height="${h - 2 * ft * S}" fill="none" stroke="${INK}" stroke-width="0.6"/>`;
  for (let i = 1; i <= nj; i++) { const x = mx + (i * L * S) / (nj + 1); a += `<line x1="${x}" y1="${my + ft * S}" x2="${x}" y2="${my + h - ft * S}" stroke="${INK}" stroke-width="${Math.max(1, ft * S)}" opacity="0.55"/>`; }
  if (d.legs) for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
    const lx = mx + Math.min(Math.max((i * L * S) / (nx - 1), 2), w - 8), ly = my + Math.min(Math.max((j * h) / (ny - 1), 2), h - 8);
    a += `<rect x="${lx - 2}" y="${ly - 2}" width="6" height="6" fill="#444"/>`;
  }
  a += bubble(mx + w / 2, my + 8, L_.rimL) + bubble(mx + 10, my + h / 2, L_.rimS);
  if (nj) a += bubble(mx + w / (nj + 1), my + h / 2, L_.joist);
  if (d.legs) a += bubble(mx + 12, my + 12 + 12, L_.leg);
  a += hdim(mx, mx + w, my + h + 14, ftIn(L)) + vdim(my, my + h, mx - 14, ftIn(Wd));
  a += txt(mx + w / 2, my + h + 36, `PLAN (deck removed) — ${nj} joists`, { size: 8, fill: "#666" });
  const pw = mx + w + 20, ph = my + h + 44;
  // side elevation
  const S2 = Math.min(360 / L, 140 / Math.max(heightIn, 8)), eh = Math.max(heightIn, fw + deckT) * S2, ew = L * S2, ey = 16, ex = 40;
  let e = `<rect x="${ex}" y="${ey}" width="${ew}" height="${deckT * S2}" fill="#d8c08a" stroke="${INK}" stroke-width="1"/>`;
  e += `<rect x="${ex}" y="${ey + deckT * S2}" width="${ew}" height="${fw * S2}" fill="${WOOD}" stroke="${INK}" stroke-width="1"/>`;
  if (d.legs) for (let i = 0; i < nx; i++) {
    const lx = ex + Math.min(Math.max((i * ew) / (nx - 1) - 1.5 * S2 * (i === nx - 1 ? 1 : 0), 0), ew - 1.5 * S2);
    e += `<rect x="${lx}" y="${ey + (deckT + fw) * S2}" width="${Math.max(1.5 * S2, 2)}" height="${legLen * S2}" fill="${WOOD}" stroke="${INK}" stroke-width="1"/>`;
  }
  e += `<line x1="${ex - 6}" y1="${ey + eh}" x2="${ex + ew + 6}" y2="${ey + eh}" stroke="${INK}" stroke-width="1.2"/>`;
  e += vdim(ey, ey + eh, ex - 14, ftIn(heightIn));
  if (d.legs) e += bubble(ex + ew / 2, ey + (deckT + fw + legLen / 2) * S2, L_.leg);
  e += txt(ex + ew / 2, ey + eh + 22, `SIDE ELEVATION — deck height ${ftIn(heightIn)}`, { size: 8, fill: "#666" });
  const ew2 = ex + ew + 20, eh2 = ey + eh + 30;
  return wrap(Math.max(pw, ew2), ph + eh2, a + `<g transform="translate(0 ${ph})">${e}</g>`);
}

function svgStairs(pc) {
  const d = pc.draw, { width, depth, rise, n, riser, run } = d;
  const S = Math.min(320 / Math.max(depth, 1), 200 / Math.max(rise, 1)), mx = 44, my = 16;
  const ex = depth * S, eh = rise * S;
  let pts = `${mx},${my + eh}`;
  for (let i = 0; i < n; i++) { const x = mx + Math.min(i, n - 1) * run * S; pts += ` ${x},${my + eh - i * riser * S} ${x},${my + eh - (i + 1) * riser * S}`; if (i < n - 1) pts += ` ${x + run * S},${my + eh - (i + 1) * riser * S}`; }
  pts += ` ${mx + ex},${my + eh - rise * S} ${mx + ex},${my + eh}`;
  let b = `<polygon points="${pts}" fill="${WOOD}" stroke="${INK}" stroke-width="1.2"/>`;
  b += `<line x1="${mx}" y1="${my + eh}" x2="${mx + ex}" y2="${my + eh - rise * S}" stroke="${INK}" stroke-width="0.8" stroke-dasharray="5,3"/>`;
  b += bubble(mx + ex * 0.6, my + eh - rise * S * 0.35, pc.letters.stringer);
  b += hdim(mx, mx + ex, my + eh + 14, ftIn(depth)) + vdim(my, my + eh, mx - 16, ftIn(rise));
  b += txt(mx + ex / 2, my + eh + 36, `SIDE: ${n} risers @ ${riser.toFixed(2)}" · ${n - 1} treads @ ${run}" run`, { size: 8, fill: "#666" });
  const pw = mx + ex + 30, ph = my + eh + 44;
  const S3 = Math.min(240 / Math.max(width, 1), 100 / Math.max(depth, 1));
  const w3 = width * S3, h3 = depth * S3;
  let p = `<rect x="${mx}" y="12" width="${w3}" height="${h3}" fill="${FACE}" stroke="${INK}" stroke-width="1.2"/>`;
  for (let i = 1; i < n - 1; i++) p += `<line x1="${mx}" y1="${12 + (i * h3) / (n - 1)}" x2="${mx + w3}" y2="${12 + (i * h3) / (n - 1)}" stroke="${INK}" stroke-width="0.7"/>`;
  p += hdim(mx, mx + w3, 12 + h3 + 14, ftIn(width)) + txt(mx + w3 / 2, 12 + h3 + 36, `PLAN (${d.nStr} stringers)`, { size: 8, fill: "#666" });
  return wrap(Math.max(pw, mx + w3 + 30), ph + h3 + 52, b + `<g transform="translate(0 ${ph})">${p}</g>`);
}

function svgTri(pc) {
  const d = pc.draw, { A, B, hyp, joists, legPts, fw } = d;
  const S = Math.min(380 / A, 260 / B), mx = 44, my = 20, w = A * S, h = B * S;
  const X = (x) => mx + x * S, Y = (y) => my + h - y * S; // origin at the square corner (lower left)
  let b = `<polygon points="${X(0)},${Y(0)} ${X(A)},${Y(0)} ${X(0)},${Y(B)}" fill="${WOOD}" stroke="${INK}" stroke-width="1.3"/>`;
  joists.forEach((j) => { b += `<line x1="${X(j.x)}" y1="${Y(0)}" x2="${X(j.x)}" y2="${Y(j.len + d.ft)}" stroke="${INK}" stroke-width="${Math.max(1, d.ft * S)}" opacity="0.5"/>`; });
  legPts.forEach(([x, y]) => { b += `<rect x="${X(x) - 3}" y="${Y(y) - 3}" width="6" height="6" fill="#444"/>`; });
  const L_ = pc.letters;
  b += bubble(X(A / 2), Y(0) - 10, L_.rimA) + bubble(X(0) + 10, Y(B / 2), L_.rimB) + bubble(X(A / 2) + 10, Y(B / 2) - 10, L_.rimH);
  if (L_.j0) b += bubble(X(joists[0].x), Y(joists[0].len / 3), L_.j0);
  b += hdim(X(0), X(A), my + h + 14, ftIn(A)) + vdim(Y(B), Y(0), mx - 16, ftIn(B));
  b += txt(X(A * 0.62) + 6, Y(B * 0.38) - 8, `${ftIn(hyp)} @ ${d.ang.toFixed(1)}°`, { size: 8, anchor: "start", fill: "#555" });
  b += txt(mx + w / 2, my + h + 36, `PLAN (deck removed) — ${joists.length} joists, ${legPts.length} legs`, { size: 8, fill: "#666" });
  return wrap(mx + w + 40, my + h + 46, b);
}


function svgCurved(pc) {
  const d = pc.draw, { C, s, R, Larc, H, nRib, nStud } = d, L_ = pc.letters;
  const S = Math.min(380 / C, 150 / Math.max(s, 6)), mx = 44, my = 18;
  const dd = (x) => R - Math.sqrt(Math.max(0, R * R - x * x));
  const X = (x) => mx + (x + C / 2) * S, Y = (y) => my + y * S;
  let a = `<polyline fill="none" stroke="${INK}" stroke-width="3" points="${Array.from({ length: 41 }, (_, i) => { const x = -C / 2 + (C * i) / 40; return `${X(x).toFixed(1)},${Y(dd(x)).toFixed(1)}`; }).join(" ")}"/>`;
  a += `<line x1="${X(-C / 2)}" y1="${Y(s)}" x2="${X(C / 2)}" y2="${Y(s)}" stroke="${DASH}" stroke-dasharray="4,3"/>`;
  for (let i = 0; i < nStud; i++) { const ph = (-Larc / 2 + (Larc * i) / (nStud - 1)) / R, x = R * Math.sin(ph), y = R - R * Math.cos(ph); a += `<rect x="${X(x) - 2}" y="${Y(y) - 2}" width="4" height="4" fill="#444"/>`; }
  a += bubble(X(0), Y(0) - 12, L_.rib) + bubble(X(C / 4), Y(dd(C / 4)) + 14, L_.stud);
  a += hdim(X(-C / 2), X(C / 2), Y(s) + 14, ftIn(C)) + vdim(Y(0), Y(s), X(-C / 2) - 14, ftIn(s));
  a += txt(mx + (C * S) / 2, Y(s) + 36, `PLAN — radius ${ftIn(R)}, arc length ${ftIn(Larc)}, ${nStud} studs`, { size: 8, fill: "#666" });
  const pw = mx + C * S + 30, ph = Y(s) + 44;
  const S2 = Math.min(380 / C, 200 / H), ew = C * S2, eh = H * S2, ex = mx, ey = 12;
  let e = `<rect x="${ex}" y="${ey}" width="${ew}" height="${eh}" fill="#fff" stroke="${INK}" stroke-width="1.3"/>`;
  for (let i = 0; i < nRib; i++) { const y = ey + (i * eh) / (nRib - 1); e += `<line x1="${ex}" y1="${y}" x2="${ex + ew}" y2="${y}" stroke="${INK}" stroke-width="0.8" stroke-dasharray="${i && i < nRib - 1 ? "3,3" : "0"}"/>`; }
  for (let i = 0; i < nStud; i++) { const ph2 = (-Larc / 2 + (Larc * i) / (nStud - 1)) / R, x = ex + (R * Math.sin(ph2) + C / 2) * S2; e += `<line x1="${x}" y1="${ey}" x2="${x}" y2="${ey + eh}" stroke="${DASH}" stroke-width="0.7"/>`; }
  e += hdim(ex, ex + ew, ey + eh + 14, ftIn(C)) + vdim(ey, ey + eh, ex - 14, ftIn(H)) + txt(ex + ew / 2, ey + eh + 36, `FRONT ELEVATION — ${nRib} ribs`, { size: 8, fill: "#666" });
  return wrap(Math.max(pw, ex + ew + 30), ph + eh + 60, a + `<g transform="translate(0 ${ph})">${e}</g>`);
}

function svgColumn(pc) {
  const d = pc.draw, { D, H, nRing } = d, L_ = pc.letters;
  const S = Math.min(200 / D, 260 / H), mx = 50, my = 16, w = D * S, h = H * S;
  let e = `<rect x="${mx}" y="${my}" width="${w}" height="${h}" fill="${FACE}" stroke="${INK}" stroke-width="1.3"/>`;
  for (let i = 0; i < nRing; i++) { const y = my + (i * h) / (nRing - 1); e += `<line x1="${mx}" y1="${y}" x2="${mx + w}" y2="${y}" stroke="${DASH}" stroke-width="0.8" stroke-dasharray="3,3"/>`; }
  e += bubble(mx + w / 2, my + h / 2, L_.skin) + bubble(mx + w / 2, my + 12, L_.ring);
  e += hdim(mx, mx + w, my + h + 14, ftIn(D)) + vdim(my, my + h, mx - 16, ftIn(H)) + txt(mx + w / 2, my + h + 36, `ELEVATION — ${nRing} rings`, { size: 8, fill: "#666" });
  const cx = mx + w + 110, cy = my + 60, r = Math.min(50, w / 2 + 10);
  let p = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${WOOD}" stroke="${INK}" stroke-width="1.3"/><circle cx="${cx}" cy="${cy}" r="${r - 4}" fill="#fff" stroke="${INK}" stroke-width="0.6"/>`;
  [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(([dx, dy]) => { p += `<rect x="${cx + dx * (r - 7) - 3}" y="${cy + dy * (r - 7) - 3}" width="6" height="6" fill="#444"/>`; });
  p += bubble(cx, cy, L_.stiff) + txt(cx, cy + r + 18, "PLAN (4 stiffeners)", { size: 8, fill: "#666" });
  return wrap(cx + r + 30, Math.max(my + h + 44, cy + r + 30), e + p);
}

function svgSoft(pc) {
  const d = pc.draw, { W, H, full, panels } = d;
  const S = Math.min(380 / W, 240 / H), mx = 52, my = 16, w = W * S, h = H * S;
  let b = `<rect x="${mx}" y="${my}" width="${w}" height="${h}" fill="#e8e4f0" stroke="${INK}" stroke-width="1.3"/>`;
  if (full > 1.05) for (let i = 1; i < Math.round(W / 12); i++) { const x = mx + (i * w) / Math.round(W / 12); b += `<line x1="${x}" y1="${my}" x2="${x}" y2="${my + h}" stroke="${DASH}" stroke-width="0.6" opacity="0.7"/>`; }
  b += `<rect x="${mx}" y="${my}" width="${w}" height="${Math.max(3, d.cutLen ? 4 * S : 3)}" fill="#c9c2dc" stroke="${INK}" stroke-width="0.6"/>`;
  b += hdim(mx, mx + w, my + h + 14, ftIn(W)) + vdim(my, my + h, mx - 16, ftIn(H));
  b += txt(mx + w / 2, my + h + 36, `FINISHED SIZE — fullness ${full}×, ${panels} fabric panel(s), ${d.yd} yd`, { size: 8, fill: "#666" });
  return wrap(mx + w + 40, my + h + 46, b);
}

export function svgPiece(pc) {
  const k = pc.draw?.kind;
  if (k === "flat") return svgFlat(pc);
  if (k === "platform") return svgPlatform(pc);
  if (k === "stairs") return svgStairs(pc);
  if (k === "tri") return svgTri(pc);
  if (k === "curved") return svgCurved(pc);
  if (k === "column") return svgColumn(pc);
  if (k === "soft") return svgSoft(pc);
  return "";
}

// ── 3D boxes + isometric renderer (exploded views and assembly step pictures) ──
// Axes: x = width, y = up, z = toward the viewer. Boxes are [x0,y0,z0,x1,y1,z1].
export function boxes3D(pc) {
  const d = pc.draw || {}, out = [];
  const add = (key, grp, x0, y0, z0, x1, y1, z1) => out.push({ key, grp, b: [x0, y0, z0, x1, y1, z1] });
  if (d.kind === "flat") {
    const { W, H, style, depth: t } = d;
    for (const m of pc.members) add(m.key, "frame", m.x, m.y, 0, m.x + m.w, m.y + m.h, t);
    if (style === "broadway") {
      const mm = pc.members.find((m) => m.key === "stile")?.w || 2.5;
      [[mm, mm], [W - mm - 6, mm], [mm, H - mm - 6], [W - mm - 6, H - mm - 6]].forEach(([x, y]) => add("cblk", "front", x, y, t, x + 6, y + 6, t + 0.75));
      pc.members.filter((m) => /toggle|header|stog|utog/.test(m.key) && m.w > 6).forEach((m) => {
        add("kstn", "front", m.x, m.y + m.h / 2 - 3, t, m.x + 3, m.y + m.h / 2 + 3, t + 0.75);
        add("kstn", "front", m.x + m.w - 3, m.y + m.h / 2 - 3, t, m.x + m.w, m.y + m.h / 2 + 3, t + 0.75);
      });
    } else {
      add("face", "front", 0, 0, t, W, H, t + 0.25);
    }
  } else if (d.kind === "platform") {
    const { L, W: Wd, nj, nx, ny, legLen, deckT, fw, ft } = d, y0 = d.legs ? legLen : 0;
    add("rimL", "frame", 0, y0, 0, L, y0 + fw, ft); add("rimL", "frame", 0, y0, Wd - ft, L, y0 + fw, Wd);
    add("rimS", "frame", 0, y0, ft, ft, y0 + fw, Wd - ft); add("rimS", "frame", L - ft, y0, ft, L, y0 + fw, Wd - ft);
    for (let i = 1; i <= nj; i++) { const x = (i * L) / (nj + 1); add("joist", "frame", x - ft / 2, y0, ft, x + ft / 2, y0 + fw, Wd - ft); }
    if (d.legs) for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
      const lx = Math.min(Math.max((i * L) / (nx - 1) - 1.75, 0), L - 3.5), lz = Math.min(Math.max((j * Wd) / (ny - 1) - 0.75, 0), Wd - 1.5);
      add("leg", "legs", lx, 0, lz, lx + 3.5, legLen, lz + 1.5);
    }
    add("deck", "deck", 0, y0 + fw, 0, L, y0 + fw + deckT, Wd);
  } else if (d.kind === "stairs") {
    const { width, depth: TR, rise, n, riser, run, nStr } = d;
    for (let i = 0; i < nStr; i++) {
      const xi = (i * (width - 1.5)) / Math.max(1, nStr - 1);
      for (let j = 1; j < n; j++) add("stringer", "frame", xi, 0, TR - j * run, xi + 1.5, j * riser, TR - (j - 1) * run);
    }
    if (n > 1) add("cleat", "frame", 1.5, 0, TR - 1.5, width - 1.5, 3.5, TR);
    for (let k = 0; k < n; k++) add("riser", "risers", 0, k * riser, TR - k * run - 0.75, width, (k + 1) * riser, TR - k * run);
    for (let j = 1; j < n; j++) add("tread", "treads", 0, j * riser - 0.75, TR - j * run, width, j * riser, TR - (j - 1) * run);
  } else if (d.kind === "tri") {
    const { A, B, joists, legPts, legLen, fw, ft, deckT } = d, y0 = legLen >= 1 ? legLen : 0;
    add("rimA", "frame", 0, y0, B - ft, A, y0 + fw, B);
    add("rimB", "frame", 0, y0, 0, ft, y0 + fw, B - ft);
    const N = Math.max(8, Math.ceil(d.hyp / 6));
    for (let i = 0; i < N; i++) {
      const xa = (A * i) / N, xb = (A * (i + 1)) / N, za = (B * i) / N, zb = (B * (i + 1)) / N, cx = (xa + xb) / 2, cz = (za + zb) / 2;
      add("rimH", "frame", cx - Math.max((xb - xa) / 2, ft / 2), y0, cz - Math.max((zb - za) / 2, ft / 2), cx + Math.max((xb - xa) / 2, ft / 2), y0 + fw, cz + Math.max((zb - za) / 2, ft / 2));
    }
    joists.forEach((j, i) => add(`j${i}`, "frame", j.x - ft / 2, y0, B - ft - j.len, j.x + ft / 2, y0 + fw, B - ft));
    if (legLen >= 1) legPts.forEach(([x, y]) => {
      const lx = Math.min(Math.max(x - 1.75, 0), A - 3.5), lz = Math.min(Math.max(B - y - 0.75, 0), B - 1.5);
      add("leg", "legs", lx, 0, lz, lx + 3.5, legLen, lz + 1.5);
    });
    const top = y0 + fw + deckT;
    out.push({ key: "deck", grp: "deck", poly: [[0, top, B], [A, top, B], [0, top, 0]], b: [0, top, 0, A, top, B] });
  }
  return out;
}

const iso = (x, y, z) => [(x - z) * 0.866, -y + (x + z) * 0.5];
const SHADE = { wood: ["#f3e6c4", "#ecd9b0", "#d2bd8c"], sheet: ["#e6d3a2", "#d8c08a", "#bda56f"], hi: ["#ffd9b0", "#ffb866", "#e8943a"] };

// opts: { explode, upto: Set of keys shown, hi: Set of keys highlighted, labels, w }
export function svgIso(pc, opts = {}) {
  let list = boxes3D(pc);
  if (!list.length) return "";
  if (opts.upto) list = list.filter((o) => opts.upto.has(o.key));
  if (!list.length) return "";
  const dr = pc.draw, ext = Math.max(dr.W || 0, dr.H || 0, dr.L || 0, dr.A || 0, dr.B || 0, dr.width || 0, dr.rise || 0, 48);
  const E = opts.explode ? ext * 0.2 : 0;
  const off = { frame: [0, 0, 0], front: [0, 0, E], deck: [0, E, 0], legs: [0, -E * 0.8, 0], risers: [0, 0, E], treads: [0, E, 0] };
  const items = list.map((o) => {
    const [dx, dy, dz] = off[o.grp] || [0, 0, 0], b = o.b;
    return { ...o, b: [b[0] + dx, b[1] + dy, b[2] + dz, b[3] + dx, b[4] + dy, b[5] + dz], poly: o.poly && o.poly.map(([x, y, z]) => [x + dx, y + dy, z + dz]) };
  });
  items.sort((a, c) => (a.b[0] + a.b[3] + a.b[1] + a.b[4] + a.b[2] + a.b[5]) - (c.b[0] + c.b[3] + c.b[1] + c.b[4] + c.b[2] + c.b[5]));
  const pts = [];
  items.forEach((o) => { if (o.poly) { o.poly.forEach(([x, y, z]) => pts.push(iso(x, y, z))); return; } const [x0, y0, z0, x1, y1, z1] = o.b; [[x0, y0, z0], [x1, y1, z1], [x0, y1, z1], [x1, y0, z0], [x1, y0, z1], [x0, y1, z0]].forEach(([x, y, z]) => pts.push(iso(x, y, z))); });
  const minx = Math.min(...pts.map((p) => p[0])), maxx = Math.max(...pts.map((p) => p[0]));
  const miny = Math.min(...pts.map((p) => p[1])), maxy = Math.max(...pts.map((p) => p[1]));
  const VW = opts.w || 460, pad = 14, S = Math.min((VW - 2 * pad) / (maxx - minx || 1), (VW * 0.78 - 2 * pad) / (maxy - miny || 1));
  const P = (x, y, z) => { const [a, c] = iso(x, y, z); return `${(pad + (a - minx) * S).toFixed(1)},${(pad + (c - miny) * S).toFixed(1)}`; };
  let body = "";
  const seen = new Set();
  for (const o of items) {
    const [x0, y0, z0, x1, y1, z1] = o.b;
    const hi = opts.hi && opts.hi.has(o.key);
    if (o.poly) {
      const shp = SHADE[hi ? "hi" : "sheet"];
      body += `<polygon points="${o.poly.map(([x, y, z]) => P(x, y, z)).join(" ")}" fill="${shp[0]}" stroke="${hi ? "#a55a10" : INK}" stroke-width="${hi ? 1 : 0.6}" stroke-linejoin="round"/>`;
      continue;
    }
    const sh = SHADE[hi ? "hi" : o.key === "deck" || o.key === "face" || o.key === "cblk" || o.key === "kstn" ? "sheet" : "wood"];
    const st = `stroke="${hi ? "#a55a10" : INK}" stroke-width="${hi ? 1 : 0.6}" stroke-linejoin="round"`;
    body += `<polygon points="${P(x0, y1, z0)} ${P(x1, y1, z0)} ${P(x1, y1, z1)} ${P(x0, y1, z1)}" fill="${sh[0]}" ${st}/>`;
    body += `<polygon points="${P(x0, y0, z1)} ${P(x1, y0, z1)} ${P(x1, y1, z1)} ${P(x0, y1, z1)}" fill="${sh[1]}" ${st}/>`;
    body += `<polygon points="${P(x1, y0, z0)} ${P(x1, y0, z1)} ${P(x1, y1, z1)} ${P(x1, y1, z0)}" fill="${sh[2]}" ${st}/>`;
  }
  if (opts.labels) {
    for (const o of items) {
      if (seen.has(o.key) || !pc.letters[o.key]) continue; seen.add(o.key);
      const [x0, y0, z0, x1, y1, z1] = o.b, [px, py] = P((x0 + x1) / 2, y1, (z0 + z1) / 2).split(",").map(Number);
      body += bubble(px, py, pc.letters[o.key]);
    }
  }
  const VH = Math.ceil(pad * 2 + (maxy - miny) * S);
  return wrap(VW, VH, body);
}

export function hasSteps(pc) { return pc.steps && pc.steps.length > 0; }
// one picture per step: parts added so far, the current step's parts highlighted
export function stepFigures(pc, w = 230) {
  const cum = new Set();
  return pc.steps.map((st, i) => {
    st.keys.forEach((k) => cum.add(k));
    const svg = st.fig && boxes3D(pc).length && cum.size ? svgIso(pc, { upto: new Set(cum), hi: new Set(st.keys), w }) : "";
    return { n: i + 1, text: st.text, svg };
  });
}

export function svgSheetLayout(sh, shop) {
  const S = 2.2, W = shop.sheetW, L = shop.sheetL;
  let b = `<rect x="0" y="0" width="${W * S}" height="${L * S}" fill="#fff" stroke="${INK}" stroke-width="1.2"/>`;
  for (const it of sh.items) {
    b += `<rect x="${it.x * S}" y="${it.y * S}" width="${it.w * S}" height="${it.h * S}" fill="${WOOD}" stroke="${INK}" stroke-width="0.7"/>`;
    if (it.w * S > 22 && it.h * S > 14) b += txt((it.x + it.w / 2) * S, (it.y + it.h / 2) * S + 3, `${it.pieceId}${it.letter}`, { size: 7 });
  }
  return wrap(W * S, L * S, b);
}

export function boardBarHTML(b) {
  const total = b.stock * 12;
  const segs = b.cuts.map((c) => `<div title="${esc(c.pieceId)} ${esc(c.letter)}" style="width:${((c.len + 0) / total) * 100}%;background:#ecd9b0;border-right:2px solid #333;box-sizing:border-box;font-size:9px;overflow:hidden;white-space:nowrap;text-align:center;line-height:18px">${esc(c.pieceId)}${esc(c.letter)} ${ftIn(c.len)}</div>`).join("");
  return `<div style="display:flex;width:100%;height:20px;border:1px solid #333;background:#f3f3f3">${segs}</div>`;
}

// ── print document ──────────────────────────────────────────────────────────
export function printHTML(result, plan, shop, info = {}) {
  const now = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const title = esc(info.title || "Untitled Production");
  const block = (sheetName, sub) => `
  <div class="tb"><div class="tbm"><div class="sh"><h1>${title}</h1><div class="sub">${esc(info.venue || "")}</div></div>
  <div class="rt"><div class="k">${esc(sub)}</div><div class="big">${esc(sheetName)}</div></div></div>
  <div class="meta"><div><span>Designer</span>${esc(info.designer || "—")}</div><div><span>Director</span>${esc(info.director || "—")}</div><div><span>Date</span>${now}</div><div><span>Revision</span>${esc(info.revision || "1")}</div></div></div>`;
  const partsTable = (pc) => `<table><thead><tr><th>Part</th><th>Name</th><th>Material</th><th>Qty</th><th>Length / Size</th><th>Notes</th></tr></thead><tbody>${
    pc.lumber.map((p) => `<tr><td class="c"><b>${p.letter}</b></td><td>${esc(p.name)}</td><td>${esc(p.material)}</td><td class="c">${p.qty}</td><td>${ftIn(p.len)}</td><td>${esc(p.note)}</td></tr>`).join("") +
    pc.sheets.map((p) => `<tr><td class="c"><b>${p.letter}</b></td><td>${esc(p.name)}</td><td>${esc(p.material)}</td><td class="c">${p.qty}</td><td>${ftIn(p.w)} × ${ftIn(p.h)}</td><td>${esc(p.note)}</td></tr>`).join("") +
    pc.misc.map((m) => `<tr><td class="c">—</td><td>${esc(m.name)}</td><td>hardware / finish</td><td class="c">${m.qty}</td><td>${esc(m.unit)}</td><td>${esc(m.note)}</td></tr>`).join("")
  }</tbody></table>`;
  const pieceSheets = result.pieces.map((pc) => `
  <section class="page">${block(`${pc.id} · ${esc(pc.name)}`, TEMPLATE_LABELS[pc.template])}
    <div class="dims">${esc(pc.dims)}</div>
    ${pc.warnings.map((w) => `<div class="warn">⚠ ${esc(w)}</div>`).join("")}
    <div class="draw">${svgPiece(pc)}</div>
    ${partsTable(pc)}
    <ul class="notes">${pc.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>
  </section>
  ${pc.steps.length ? `<section class="page">${block(`${pc.id} · assembly`, "Build steps")}
    ${boxes3D(pc).length ? `<div class="draw">${svgIso(pc, { explode: true, labels: true, w: 440 })}</div><div class="cap">Exploded view (illustrative — dimensions are on the drawing sheet)</div>` : ""}
    <div class="steps">${stepFigures(pc).map((s) => `<div class="step"><div class="sn">${s.n}</div><div class="st">${esc(s.text)}</div>${s.svg ? `<div class="sf">${s.svg}</div>` : ""}</div>`).join("")}</div>
  </section>` : ""}`).join("");
  const statusPage = `<section class="page">${block("BUILD STATUS", "Shop checklist")}
    <table><thead><tr><th>Piece</th><th>Name</th><th>Size</th>${BUILD_STAGES.map(([, l]) => `<th class="c">${l}</th>`).join("")}</tr></thead><tbody>
    ${result.pieces.map((pc) => `<tr><td><b>${pc.id}</b></td><td>${esc(pc.name)}</td><td>${esc(pc.dims)}</td>${BUILD_STAGES.map(([k]) => `<td class="c">${pc.el.construction?.stages?.[k] ? "☑" : "☐"}</td>`).join("")}</tr>`).join("")}
    </tbody></table>
    <p class="note">${result.pieces.filter((pc) => stageProgress(pc.el) === BUILD_STAGES.length).length} of ${result.pieces.length} pieces fully built and installed.</p>
  </section>`;
  const cutPage = `<section class="page">${block("CUT LIST", "Stock plan")}
    ${plan.lumber.map((l) => `<h2>${esc(l.material)} — ${Object.entries(l.byStock).sort((a, b) => a[0] - b[0]).map(([s, n]) => `${n} × ${s}'`).join(", ")} <small>(waste ${l.wastePct}%)</small></h2>
      ${l.boards.map((b, i) => `<div class="board"><div class="bl">#${i + 1} · ${b.stock}'</div>${boardBarHTML(b)}</div>`).join("")}
      ${l.bad.length ? `<div class="warn">⚠ ${l.bad.length} part(s) longer than the longest stock: ${l.bad.map((p) => p.pieceId + p.letter + " " + ftIn(p.len)).join(", ")}</div>` : ""}`).join("")}
    ${plan.sheets.map((s) => `<h2>${esc(s.material)} — ${s.count} sheet(s) <small>(${s.utilPct}% used)</small></h2><div class="sheets">${s.sheets.map((sh, i) => `<figure>${svgSheetLayout(sh, shop)}<figcaption>Sheet ${i + 1}</figcaption></figure>`).join("")}</div>`).join("")}
  </section>`;
  const buy = `<section class="page">${block("BUY LIST", "Materials")}
    <table><thead><tr><th>Material</th><th>Stock</th><th>Qty</th><th>Cost</th></tr></thead><tbody>
    ${plan.lumber.map((l) => Object.entries(l.byStock).sort((a, b) => a[0] - b[0]).map(([s, n]) => `<tr><td>${esc(l.material)}</td><td>${s}'</td><td class="c">${n}</td><td>${l.cost != null ? "$" + ((l.cost * n * s) / l.totalFt).toFixed(2) : "—"}</td></tr>`).join("")).join("")}
    ${plan.sheets.map((s) => `<tr><td>${esc(s.material)}</td><td>${shop.sheetW / 12}'×${shop.sheetL / 12}' sheet</td><td class="c">${s.count}</td><td>${s.cost != null ? "$" + s.cost.toFixed(2) : "—"}</td></tr>`).join("")}
    ${plan.misc.map((m) => `<tr><td>${esc(m.name)}</td><td>${esc(m.unit)}</td><td class="c">${m.qty}</td><td>—</td></tr>`).join("")}
    </tbody></table>
    ${plan.cost ? `<p class="tot">Estimated lumber + sheet cost: <b>$${plan.cost.toFixed(2)}</b></p>` : `<p class="note">Enter prices under Shop Standards to see a cost estimate.</p>`}
    ${result.others.length ? `<h2>Not generated</h2><ul>${result.others.map((o) => `<li>${esc(o.el.label || o.el.type)} — ${esc(o.reason)}</li>`).join("")}</ul>` : ""}
  </section>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Construction — ${title}</title><style>
  *{box-sizing:border-box;margin:0;padding:0} body{font-family:"Helvetica Neue",Arial,sans-serif;font-size:10pt;color:#111;background:#fff}
  .page{width:8.5in;min-height:10in;padding:.4in;page-break-after:always;margin:0 auto}
  .tb{border:2px solid #222;margin-bottom:12px}.tbm{display:flex;border-bottom:1px solid #222}.sh{flex:1;padding:8px 12px;border-right:1px solid #222}
  .sh h1{font-size:15pt;font-weight:900}.sub{font-size:9pt;color:#555}.rt{padding:8px 12px;text-align:right;min-width:190px}.k{font-size:7pt;text-transform:uppercase;color:#888}.big{font-size:15pt;font-weight:900}
  .meta{display:flex}.meta div{padding:4px 10px;border-right:1px solid #222;font-size:9pt;font-weight:700}.meta div:last-child{border:0}.meta span{display:block;font-size:6.5pt;text-transform:uppercase;color:#888;font-weight:400}
  .dims{font-size:11pt;font-weight:700;margin:4px 0 8px}.draw{display:flex;justify-content:center;margin:6px 0 12px}.draw svg{max-height:5in}
  table{width:100%;border-collapse:collapse;font-size:8.5pt;margin:8px 0}th{background:#222;color:#fff;padding:4px 6px;font-size:7.5pt;text-align:left}td{border:1px solid #ccc;padding:3px 6px}.c{text-align:center}
  .warn{background:#fff3cd;border:1px solid #e0b000;padding:4px 8px;margin:4px 0;font-size:9pt}.notes{margin:6px 0 0 18px;font-size:9pt}
  h2{font-size:10pt;margin:14px 0 6px;border-bottom:2px solid #222}h2 small{font-weight:400;color:#666}
  .board{display:flex;align-items:center;gap:6px;margin:3px 0}.bl{width:52px;font-size:8pt}.board>div:last-child{flex:1}
  .sheets{display:flex;flex-wrap:wrap;gap:10px}figure{text-align:center;font-size:8pt}
  .cap{text-align:center;font-size:8pt;color:#666;margin-bottom:8px}
  .steps{display:grid;grid-template-columns:1fr 1fr;gap:10px}.step{border:1px solid #bbb;padding:6px 8px;break-inside:avoid;position:relative;padding-left:30px}
  .sn{position:absolute;left:6px;top:6px;width:18px;height:18px;border-radius:9px;background:#222;color:#fff;font-size:9pt;font-weight:700;text-align:center;line-height:18px}.st{font-size:9pt;margin-bottom:4px}.sf svg{width:100%;height:auto}
  .tot{margin-top:10px;font-size:11pt}.note{margin-top:10px;color:#666;font-size:9pt}
  .pb{position:fixed;top:10px;right:10px;background:#e94560;color:#fff;border:0;padding:9px 18px;border-radius:6px;font-weight:700;cursor:pointer}
  @media print{.pb{display:none}.page{width:100%;min-height:auto}}
  </style></head><body><button class="pb" onclick="window.print()">🖨 Print / Save PDF</button>${pieceSheets}${cutPage}${buy}${statusPage}</body></html>`;
}
