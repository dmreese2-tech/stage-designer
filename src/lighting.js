// lighting.js — fixture specs, hang heights, beam geometry, patch, load, colour cuts and CSV paperwork (pure functions).
import { GRID, GEL_PRESETS } from "./constants.js";
import { parseFtIn } from "./units.js";

// Generic starting values, NOT manufacturer data. Every fixture can override wattage, weight, footprint and
// colour-frame size in the Properties panel; check them against your actual inventory.
export const FIXTURE_SPECS = {
  ellipsoidal: { watts: 575,  lb: 15, footprint: 1,  angle: 36, frame: 6.25 },
  fresnel:     { watts: 750,  lb: 12, footprint: 1,  angle: 50, frame: 6.25 },
  par:         { watts: 750,  lb: 9,  footprint: 1,  angle: 30, frame: 7.5 },
  led_wash:    { watts: 150,  lb: 12, footprint: 8,  angle: 40, frame: 0 },
  spotlight:   { watts: 1000, lb: 60, footprint: 1,  angle: 8,  frame: 0 },
  strobe:      { watts: 1000, lb: 12, footprint: 2,  angle: 90, frame: 0 },
  hazer:       { watts: 500,  lb: 20, footprint: 2,  angle: 0,  frame: 0 },
  moving_head: { watts: 300,  lb: 35, footprint: 20, angle: 20, frame: 0 },
  strip_light: { watts: 100,  lb: 8,  footprint: 8,  angle: 60, frame: 0 },
};
export const specOf = (el) => {
  const s = FIXTURE_SPECS[el.type] || { watts: 500, lb: 10, footprint: 1, angle: 40, frame: 0 };
  return {
    watts: el.watts ?? s.watts, lb: el.weightLb ?? s.lb, footprint: el.footprint ?? s.footprint,
    angle: el.focusAngle || s.angle, frame: el.frameIn ?? s.frame,
  };
};
export const isFixture = (el) => el.category === "lighting";
export const gelHex = (code) => GEL_PRESETS.find((g) => g.code === code)?.hex || "#fff3d0";
export const trimFt = (b) => (typeof b?.trim === "number" ? b.trim : b?.trim ? parseFtIn(b.trim) : null);
export const DEFAULT_HANG_FT = 18;

// Height of a fixture above the stage floor, in feet.
export function mountHeightFt(el, elements) {
  if (el.z !== undefined && el.z !== null && el.z !== "") return +el.z;
  const b = elements.find((x) => x.id === el.battenId);
  const t = trimFt(b);
  if (t) return t;
  if (el.mount === "floor") return 0.5;
  if (el.mount === "boom") return 8;
  return DEFAULT_HANG_FT;
}
export const AIM_HEIGHT_FT = 5.5;   // beams land at head height unless the aim is on the floor

// Throw distance and beam diameter from hang height, aim point and field angle.
export function beamInfo(el, elements) {
  const sp = specOf(el);
  const h = mountHeightFt(el, elements);
  const ax = el.aim ? el.aim.x : el.x, ay = el.aim ? el.aim.y : el.y;
  const run = Math.hypot(ax - el.x, ay - el.y) / GRID, drop = Math.max(0, h - AIM_HEIGHT_FT);
  const throwFt = Math.hypot(run, drop);
  const dia = sp.angle > 0 ? 2 * throwFt * Math.tan((sp.angle * Math.PI) / 360) : 0;
  return { height: h, run, throwFt, dia, angle: sp.angle, aimed: !!el.aim };
}

// ── Patch ───────────────────────────────────────────────────────────────────
// Channel numbers: SR to SL along each batten, battens from DS to US, unassigned last.
export function autoNumberChannels(elements, startAt = 1) {
  const lights = elements.filter(isFixture);
  const battens = elements.filter((e) => e.type === "batten").sort((a, b) => (b.y1 + b.y2) / 2 - (a.y1 + a.y2) / 2);
  const order = [];
  battens.forEach((b) => lights.filter((l) => l.battenId === b.id).sort((a, c) => a.x - c.x).forEach((l) => order.push(l.id)));
  lights.filter((l) => !battens.some((b) => b.id === l.battenId)).sort((a, c) => c.y - a.y || a.x - c.x).forEach((l) => order.push(l.id));
  const ch = {}; order.forEach((id, i) => { ch[id] = startAt + i; });
  return elements.map((e) => (ch[e.id] ? { ...e, channel: ch[e.id] } : e));
}
// DMX addresses in channel order; a fixture never straddles a universe boundary.
export function autoAddress(elements, startUniverse = 1) {
  const lights = elements.filter(isFixture).sort((a, b) => (a.channel || 0) - (b.channel || 0));
  let u = startUniverse, addr = 1; const out = {};
  for (const l of lights) {
    const n = Math.max(1, specOf(l).footprint);
    if (addr + n - 1 > 512) { u++; addr = 1; }
    out[l.id] = { universe: u, address: addr }; addr += n;
  }
  return elements.map((e) => (out[e.id] ? { ...e, ...out[e.id] } : e));
}
// Patch conflicts: two fixtures on overlapping addresses in the same universe.
export function patchConflicts(elements) {
  const used = {}, bad = new Set();
  elements.filter((e) => isFixture(e) && e.universe && e.address).forEach((e) => {
    const n = Math.max(1, specOf(e).footprint);
    for (let a = e.address; a < e.address + n; a++) { const k = `${e.universe}/${a}`; if (used[k] && used[k] !== e.id) { bad.add(e.id); bad.add(used[k]); } else used[k] = e.id; }
  });
  return bad;
}

// ── Load ────────────────────────────────────────────────────────────────────
export function loadSummary(elements, volts = 120) {
  const lights = elements.filter(isFixture), battens = elements.filter((e) => e.type === "batten");
  const rows = battens.map((b) => {
    const on = lights.filter((l) => l.battenId === b.id);
    const lb = on.reduce((s, l) => s + specOf(l).lb, 0), w = on.reduce((s, l) => s + specOf(l).watts, 0);
    const cap = b.capacityLb > 0 ? b.capacityLb : null;
    return { id: b.id, label: b.label || "Batten", count: on.length, lb, watts: w, amps: w / volts, capacity: cap, over: cap ? lb > cap : false };
  });
  const assigned = new Set(rows.flatMap((r) => lights.filter((l) => l.battenId === r.id).map((l) => l.id)));
  const loose = lights.filter((l) => !assigned.has(l.id));
  const total = lights.reduce((s, l) => s + specOf(l).watts, 0);
  return { rows, loose: { count: loose.length, lb: loose.reduce((s, l) => s + specOf(l).lb, 0), watts: loose.reduce((s, l) => s + specOf(l).watts, 0) }, totalWatts: total, totalAmps: total / volts, volts, count: lights.length };
}

// ── Colour cut list and equipment key ───────────────────────────────────────
export function colourCuts(elements, sheetW = 20, sheetL = 24) {
  const by = {};
  elements.filter(isFixture).forEach((l) => {
    const code = l.gelCode || "Open", sp = specOf(l);
    if (code === "Open" || !sp.frame) return;
    const k = `${code}|${sp.frame}`;
    (by[k] ||= { code, name: GEL_PRESETS.find((g) => g.code === code)?.name || "", frame: sp.frame, qty: 0 }).qty++;
  });
  return Object.values(by).map((r) => {
    const per = Math.floor(sheetW / r.frame) * Math.floor(sheetL / r.frame) || 1;
    return { ...r, perSheet: per, sheets: Math.ceil(r.qty / per) };
  }).sort((a, b) => a.code.localeCompare(b.code));
}
export function equipmentKey(elements, label) {
  const by = {};
  elements.filter(isFixture).forEach((l) => { const sp = specOf(l); const k = l.type; (by[k] ||= { type: k, name: label(l), qty: 0, watts: sp.watts, lb: sp.lb }).qty++; });
  return Object.values(by);
}

// ── CSV paperwork (opens in Lightwright, Excel, console patch importers that take CSV) ─────────
export function patchCSV(elements, label) {
  const q = (c) => `"${String(c ?? "").replace(/"/g, '""')}"`;
  const bl = {}; elements.filter((e) => e.type === "batten").forEach((b) => { bl[b.id] = b.label || "Batten"; });
  const rows = [["Channel", "Dimmer", "Universe", "Address", "Footprint", "Position", "Unit type", "Wattage", "Weight (lb)", "Colour", "Mount height (ft)", "Focus angle", "Notes"]];
  elements.filter(isFixture).sort((a, b) => (a.channel || 0) - (b.channel || 0)).forEach((l) => {
    const sp = specOf(l);
    rows.push([l.channel, l.dimmer, l.universe, l.address, sp.footprint, bl[l.battenId] || "", label(l), sp.watts, sp.lb, l.gelCode && l.gelCode !== "Open" ? l.gelCode : "", Math.round(mountHeightFt(l, elements) * 10) / 10, sp.angle || "", l.notes]);
  });
  return rows.map((r) => r.map(q).join(",")).join("\n");
}
