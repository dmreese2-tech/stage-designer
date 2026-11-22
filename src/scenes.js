// scenes.js — scene layouts and the shift list.
// One plan can hold many scenes (act + scene number). Pieces are Stationary by default: they keep one position for the
// whole show. A piece set to Moving (el.motion === "moving") can sit somewhere different in each scene; a scene stores
// the pose of every moving piece (position, rotation, height, batten trim). Moving a piece to the wings is how it is
// "struck" or "brought on": the shift list just compares one scene with the next.

const POSE_KEYS = ["x", "y", "x1", "y1", "x2", "y2", "rotation", "elevation"];
export const isMoving = (el) => el && el.motion === "moving";
export const canMove = (el) => el && el.type !== "pin" && el.category !== "lighting" && el.type !== "textlabel";

export const poseKeys = (el) => (el.type === "batten" ? ["trim"] : POSE_KEYS);
export function capturePose(el) {
  const p = {};
  for (const k of poseKeys(el)) if (el[k] !== undefined) p[k] = el[k];
  return p;
}
const samePose = (a = {}, b = {}) => { const ks = new Set([...Object.keys(a), ...Object.keys(b)]); for (const k of ks) if (a[k] !== b[k]) return false; return true; };

// scenes with the active scene's pose refreshed from the working elements (returns the same array when nothing changed)
export function syncScene(scenes, activeId, elements) {
  const i = scenes.findIndex((s) => s.id === activeId); if (i < 0) return scenes;
  const pose = {};
  elements.forEach((el) => { if (isMoving(el)) pose[el.id] = capturePose(el); });
  const cur = scenes[i].pose || {};
  const ids = new Set([...Object.keys(pose), ...Object.keys(cur)]);
  let same = true; for (const id of ids) if (!samePose(pose[id], cur[id])) { same = false; break; }
  // a piece that just became Moving has no pose in the other scenes yet: it starts there too
  const fill = Object.keys(pose).filter((id) => scenes.some((s, j) => j !== i && !(s.pose && s.pose[id])));
  if (same && !fill.length) return scenes;
  return scenes.map((s, j) => {
    if (j === i) return { ...s, pose };
    if (!fill.length) return s;
    const add = {}; fill.forEach((id) => { if (!(s.pose && s.pose[id])) add[id] = pose[id]; });
    return Object.keys(add).length ? { ...s, pose: { ...(s.pose || {}), ...add } } : s;
  });
}
// the working elements for a scene: moving pieces take that scene's pose
export function applyScene(elements, scene) {
  if (!scene) return elements;
  let changed = false;
  const out = elements.map((el) => {
    if (!isMoving(el)) return el;
    const p = scene.pose && scene.pose[el.id]; if (!p) return el;
    const merged = { ...el, ...p };
    if (samePose(capturePose(el), capturePose(merged))) return el;
    changed = true; return merged;
  });
  return changed ? out : elements;
}

let _sid = 1;
export const newSceneId = () => "sc_" + Date.now().toString(36) + "_" + (_sid++);
export function nextSceneLabel(scenes, activeId) {
  const cur = scenes.find((s) => s.id === activeId) || scenes[scenes.length - 1];
  if (!cur) return { act: "1", scene: "1" };
  const n = parseInt(cur.scene, 10);
  return { act: cur.act, scene: Number.isFinite(n) ? String(n + 1) : cur.scene + "+" };
}
export const sceneTitle = (s) => `Act ${s.act || "?"} · Sc ${s.scene || "?"}${s.name ? " — " + s.name : ""}`;
export const sceneShort = (s) => `${s.act || "?"}-${s.scene || "?"}`;

// ── describing positions in stage terms (distance from centre line and from the downstage edge) ──
const fmtFt = (ft) => { const sign = ft < 0 ? "-" : ""; let v = Math.abs(ft), f = Math.floor(v + 1e-9), i = Math.round((v - f) * 12); if (i === 12) { f++; i = 0; } return sign + f + "'" + (i ? " " + i + '"' : ""); };
export function describePos(p, el, stageW, stageH, grid) {
  if (!p) return "—";
  if (el.type === "batten") return p.trim !== undefined ? `trim ${typeof p.trim === "number" ? fmtFt(p.trim) : p.trim}` : "—";
  const x = p.x ?? (p.x1 !== undefined && p.x2 !== undefined ? (p.x1 + p.x2) / 2 : undefined), y = p.y ?? (p.y1 !== undefined && p.y2 !== undefined ? (p.y1 + p.y2) / 2 : undefined);
  if (x === undefined || y === undefined) return "—";
  const fx = x / grid - stageW / 2, fy = stageH - y / grid;
  const off = x < 0 ? "offstage SR" : x > stageW * grid ? "offstage SL" : y < 0 ? "offstage US" : y > stageH * grid ? "offstage DS" : "";
  const side = Math.abs(fx) < 0.05 ? "CL" : fx < 0 ? fmtFt(-fx) + " SR" : fmtFt(fx) + " SL";
  const out = off ? `${off} (${side}, ${fmtFt(fy)} from DS)` : `${side}, ${fmtFt(fy)} from DS`;
  const rot = p.rotation ? `, rot ${Math.round(((p.rotation % 360) + 360) % 360)}°` : "";
  return out + rot;
}
const nameOf = (el) => el.label || el.type;

// For each pair of neighbouring scenes: the moving pieces whose pose changed.
export function computeShifts(scenes, elements, stageW, stageH, grid) {
  const moving = elements.filter(isMoving), out = [];
  for (let i = 1; i < scenes.length; i++) {
    const a = scenes[i - 1], b = scenes[i], rows = [];
    moving.forEach((el) => {
      const pa = (a.pose || {})[el.id], pb = (b.pose || {})[el.id];
      if (!pa || !pb || samePose(pa, pb)) return;
      const posChanged = ["x", "y", "x1", "y1", "x2", "y2"].some((k) => pa[k] !== pb[k]);
      const action = el.type === "batten" ? "Fly" : posChanged ? "Shift" : pa.rotation !== pb.rotation ? "Rotate" : "Adjust";
      rows.push({ id: el.id, name: nameOf(el), action, from: describePos(pa, el, stageW, stageH, grid), to: describePos(pb, el, stageW, stageH, grid) });
    });
    rows.sort((p, q) => p.name.localeCompare(q.name));
    out.push({ from: a, to: b, rows });
  }
  return out;
}
export function shiftCSV(shifts) {
  const q = (c) => `"${String(c ?? "").replace(/"/g, '""')}"`;
  const lines = [["Cue", "Act", "Scene", "Scene name", "Item", "Action", "From", "To", "Crew", "Notes"]];
  shifts.forEach((sh) => sh.rows.forEach((r) => lines.push([sh.to.cue, sh.to.act, sh.to.scene, sh.to.name, r.name, r.action, r.from, r.to, sh.to.crew, sh.to.notes])));
  return lines.map((l) => l.map(q).join(",")).join("\n");
}

// Cue-list CSV laid out like a CueControl cue list: number, type, name, note.
// CueControl's importer has column mapping, so headers only need to be recognisable.
export function cueControlCSV(shifts, type = "FLY") {
  const q = (c) => `"${String(c ?? "").replace(/"/g, '""')}"`;
  const lines = [["Cue", "Type", "Name", "Note"]];
  shifts.forEach((sh) => lines.push([sh.to.cue, type, `Shift: ${sh.to.name || sh.to.scene || ""}`.trim(),
    [...sh.rows.map((r) => `${r.name} ${r.action}${r.to ? " to " + r.to : ""}`), sh.to.crew ? `Crew: ${sh.to.crew}` : "", sh.to.notes].filter(Boolean).join("; ")]));
  return lines.map((l) => l.map(q).join(",")).join("\n");
}
