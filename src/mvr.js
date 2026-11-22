// mvr.js — MVR (My Virtual Rig) scene description for the lighting plot: opens in Vision, Capture, grandMA3, Depence, Blender add-ons.
// MVR is Z-up, millimetres. The plan is X across, plan-Y toward the audience, so world Y = -plan Y (upstage is +Y).
// Fixtures are written WITHOUT a GDTF model (GDTFSpec empty): positions, aim, patch, ID and colour carry over, and you pick the real model in the receiving software.
import { GRID, FIXTURE_DEFS } from "./constants.js";
import { isFixture, mountHeightFt, gelHex, specOf, AIM_HEIGHT_FT } from "./lighting.js";

const MM = 304.8;
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]));
const uuid = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; return (c === "x" ? r : (r & 3) | 8).toString(16); }));
const norm = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const f = (n) => (Math.round(n * 1000) / 1000).toString();
const vec = (v) => `{${v.map(f).join(",")}}`;

// sRGB hex -> CIE xyY (x, y, Y in 0..100), as MVR colours are written
export function hexToXyY(hex) {
  const c = (hex || "#ffffff").replace("#", ""), rgb = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255 || 0);
  const lin = rgb.map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  const X = 0.4124 * lin[0] + 0.3576 * lin[1] + 0.1805 * lin[2], Y = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2], Z = 0.0193 * lin[0] + 0.1192 * lin[1] + 0.9505 * lin[2];
  const s = X + Y + Z || 1;
  return [X / s, Y / s, Y * 100];
}

// Matrix whose local -Z axis (the beam in GDTF) points along `dir`, in MVR's {u}{v}{w}{origin} form
export function fixtureMatrix(origin, dir) {
  const w = norm([-dir[0], -dir[1], -dir[2]]);
  let up = [0, 0, 1]; if (Math.abs(w[2]) > 0.999) up = [0, 1, 0];
  const u = norm(cross(up, w)), v = cross(w, u);
  return `${vec(u)}${vec(v)}${vec(w)}${vec(origin)}`;
}
export const IDENTITY = "{1,0,0}{0,1,0}{0,0,1}{0,0,0}";

export function buildMVRxml(elements, { title = "Stage Designer plot", glbName = null } = {}) {
  const lights = elements.filter(isFixture).sort((a, b) => (a.channel || 1e9) - (b.channel || 1e9));
  const battens = elements.filter((e) => e.type === "batten");
  const label = (l) => (l.label && l.label !== l.type ? l.label : FIXTURE_DEFS[l.type]?.label || l.type);
  const fx = (l) => {
    const h = mountHeightFt(l, elements), o = [(l.x / GRID) * MM, -(l.y / GRID) * MM, h * MM];
    const tgt = l.aim ? [(l.aim.x / GRID) * MM, -(l.aim.y / GRID) * MM, Math.min(AIM_HEIGHT_FT, h) * MM] : [o[0], o[1], 0];
    const dir = [tgt[0] - o[0], tgt[1] - o[1], tgt[2] - o[2]];
    const abs = l.universe && l.address ? (l.universe - 1) * 512 + l.address : null;
    const [x, y, Y] = hexToXyY(l.gelCode && l.gelCode !== "Open" ? gelHex(l.gelCode) : "#ffffff");
    return `<Fixture name="${esc(label(l))}" uuid="${uuid()}"><Matrix>${fixtureMatrix(o, dir)}</Matrix><GDTFSpec></GDTFSpec><GDTFMode></GDTFMode>` +
      (abs ? `<Addresses><Address break="0">${abs}</Address></Addresses>` : "<Addresses/>") +
      `<FixtureID>${esc(l.channel ?? "")}</FixtureID><UnitNumber>0</UnitNumber><CustomId>0</CustomId><Color>${x.toFixed(4)},${y.toFixed(4)},${Y.toFixed(2)}</Color></Fixture>`;
  };
  const groups = battens.map((b) => ({ name: b.label || "Batten", items: lights.filter((l) => l.battenId === b.id) })).filter((g) => g.items.length);
  const loose = lights.filter((l) => !battens.some((b) => b.id === l.battenId));
  const group = (name, items) => `<GroupObject name="${esc(name)}" uuid="${uuid()}"><Matrix>${IDENTITY}</Matrix><ChildList>${items.map(fx).join("")}</ChildList></GroupObject>`;
  const lightKids = groups.map((g) => group(g.name, g.items)).join("") + loose.map(fx).join("");
  const setLayer = glbName
    ? `<Layer name="Set" uuid="${uuid()}"><Matrix>${IDENTITY}</Matrix><ChildList><SceneObject name="Set and stage" uuid="${uuid()}"><Matrix>${IDENTITY}</Matrix><Geometries><Geometry3D fileName="${esc(glbName)}"/></Geometries></SceneObject></ChildList></Layer>` : "";
  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n<GeneralSceneDescription verMajor="1" verMinor="6" provider="Stage Designer" providerVersion="1.0">` +
    `<UserData/><Scene><Layers>` +
    `<Layer name="${esc(title)} - lighting" uuid="${uuid()}"><Matrix>${IDENTITY}</Matrix><ChildList>${lightKids}</ChildList></Layer>${setLayer}` +
    `</Layers></Scene></GeneralSceneDescription>\n`;
}
