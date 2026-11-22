// constructionDXF.js — DXF (R12 ASCII, inches) export of sheet-goods cut layouts for CNC / laser / router.
// One SHEET outline per sheet, one closed polyline per part, part labels as TEXT. Sheets sit side by side along +X.
const g = (code, val) => `${code}\n${val}\n`;
const f = (n) => (Math.round(n * 1000) / 1000).toString();

function poly(layer, pts) {
  let s = g(0, "POLYLINE") + g(8, layer) + g(66, 1) + g(70, 1);
  for (const [x, y] of pts) s += g(0, "VERTEX") + g(8, layer) + g(10, f(x)) + g(20, f(y)) + g(30, 0);
  return s + g(0, "SEQEND") + g(8, layer);
}
function text(layer, x, y, h, t) {
  return g(0, "TEXT") + g(8, layer) + g(10, f(x)) + g(20, f(y)) + g(30, 0) + g(40, f(h)) + g(1, String(t).replace(/[\r\n]/g, " "));
}

function wrapDXF(ents, layers, colors) {
  const head = g(0, "SECTION") + g(2, "HEADER") + g(9, "$ACADVER") + g(1, "AC1009") + g(9, "$INSUNITS") + g(70, 1) + g(0, "ENDSEC");
  let tbl = g(0, "SECTION") + g(2, "TABLES") + g(0, "TABLE") + g(2, "LAYER") + g(70, layers.length);
  for (const l of layers) tbl += g(0, "LAYER") + g(2, l) + g(70, 0) + g(62, colors[l]) + g(6, "CONTINUOUS");
  tbl += g(0, "ENDTAB") + g(0, "ENDSEC");
  return head + tbl + g(0, "SECTION") + g(2, "ENTITIES") + ents + g(0, "ENDSEC") + g(0, "EOF");
}
const circle = (cx, cy, r, n = 72) => Array.from({ length: n }, (_, i) => [cx + r * Math.cos((2 * Math.PI * i) / n), cy + r * Math.sin((2 * Math.PI * i) / n)]);

// True outline of one sheet part (inches, origin at the part's lower left). Returns { w, h, cuts: [closed polylines], blank?: true }.
export function partShapes(pc, p) {
  const d = pc.draw || {}, w = p.w, h = p.h, rect = [[0, 0], [w, 0], [w, h], [0, h]];
  if (d.kind === "curved" && p.key === "rib") {
    const { R, C, nSeg, ribW } = d, segs = [];
    // segment i: arc from x1 to x2 (apex at x = 0, circle centre at (0, -(R - sag)) so y = sqrt(R²-x²) - (R - s))
    const i = p.segIndex ?? 0, x1 = -C / 2 + (i * C) / nSeg, x2 = -C / 2 + ((i + 1) * C) / nSeg, N = 24, outer = [], inner = [];
    for (let k = 0; k <= N; k++) { const x = x1 + ((x2 - x1) * k) / N; outer.push([x, Math.sqrt(Math.max(0, R * R - x * x))]); }
    const a1 = Math.asin(x1 / R), a2 = Math.asin(x2 / R), Ri = R - ribW;
    for (let k = N; k >= 0; k--) { const a = a1 + ((a2 - a1) * k) / N; inner.push([Ri * Math.sin(a), Ri * Math.cos(a)]); }
    const pts = [...outer, ...inner], minx = Math.min(...pts.map((q) => q[0])), miny = Math.min(...pts.map((q) => q[1]));
    const n = pts.map(([x, y]) => [x - minx, y - miny]);
    return { w: Math.max(...n.map((q) => q[0])), h: Math.max(...n.map((q) => q[1])), cuts: [n] };
  }
  if (d.kind === "column" && p.key === "ring") return { w: d.D, h: d.D, cuts: [circle(d.D / 2, d.D / 2, d.D / 2), circle(d.D / 2, d.D / 2, Math.max(1, d.D / 2 - d.ribW))] };
  if (p.key === "span" && d.opening?.arch) {
    const a = d.opening.w / 2, r = d.opening.arch, R = (d.opening.w * d.opening.w / 4 + r * r) / (2 * r), pts = [];
    for (let k = 0; k <= 24; k++) { const x = (a * k) / 24; pts.push([x, r - R + Math.sqrt(Math.max(0, R * R - (x - a) ** 2))]); }
    return { w: a, h: r, cuts: [[...pts, [0, r]]] };
  }
  if (d.kind === "tri" && p.key === "deck") return { w, h, cuts: [[[0, 0], [d.A, 0], [0, d.B]]], blank: rect, note: "cut along the diagonal" };
  return { w, h, cuts: [rect] };
}

// One DXF of the true part shapes (curved ribs, rings, arch corners, triangle decks, plain panels), laid out in rows.
export function partsDXF(result, opts = {}) {
  const rowW = opts.rowW ?? 240, gap = opts.gap ?? 6;
  let ents = "", x = 0, y = 0, rowH = 0;
  for (const pc of result.pieces) for (const p of pc.sheets) {
    const nSeg = pc.draw?.kind === "curved" && p.key === "rib" ? pc.draw.nSeg : 1;
    for (let q = 0; q < p.qty; q++) {
      const sh = partShapes(pc, { ...p, segIndex: q % nSeg });
      if (x > 0 && x + sh.w > rowW) { x = 0; y -= rowH + gap + 4; rowH = 0; }
      if (sh.blank) ents += poly("BLANK", sh.blank.map(([a, b]) => [x + a, y + b]));
      for (const c of sh.cuts) ents += poly("CUT", c.map(([a, b]) => [x + a, y + b]));
      ents += text("LABELS", x + 0.5, y + sh.h + 1, 1.2, `${pc.id}${p.letter} ${p.name}${sh.note ? " - " + sh.note : ""}`);
      x += sh.w + gap; rowH = Math.max(rowH, sh.h);
    }
  }
  return wrapDXF(ents, ["CUT", "BLANK", "LABELS"], { CUT: 1, BLANK: 8, LABELS: 3 });
}

export function sheetsDXF(plan, shop, opts = {}) {
  const W = shop.sheetW, L = shop.sheetL, gap = opts.gap ?? 12;
  let ents = "", col = 0;
  const layers = new Set(["SHEET", "PARTS", "LABELS"]);
  for (const mat of plan.sheets) {
    mat.sheets.forEach((sh, i) => {
      const ox = col * (W + gap);
      col++;
      ents += poly("SHEET", [[ox, 0], [ox + W, 0], [ox + W, L], [ox, L]]);
      ents += text("LABELS", ox, L + 2, 2, `${mat.material} - sheet ${i + 1}`);
      for (const it of sh.items) {
        // layout y runs top-down; DXF y runs bottom-up
        const x0 = ox + it.x, x1 = ox + it.x + it.w, y0 = L - it.y - it.h, y1 = L - it.y;
        ents += poly("PARTS", [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
        const h = Math.max(0.5, Math.min(1.5, it.w / 8, it.h / 4));
        ents += text("LABELS", x0 + 0.5, y0 + 0.5, h, `${it.pieceId}${it.letter}`);
      }
    });
  }
  let head = g(0, "SECTION") + g(2, "HEADER") + g(9, "$ACADVER") + g(1, "AC1009") + g(9, "$INSUNITS") + g(70, 1) + g(0, "ENDSEC");
  let tbl = g(0, "SECTION") + g(2, "TABLES") + g(0, "TABLE") + g(2, "LAYER") + g(70, layers.size);
  const colors = { SHEET: 7, PARTS: 1, LABELS: 3 };
  for (const l of layers) tbl += g(0, "LAYER") + g(2, l) + g(70, 0) + g(62, colors[l]) + g(6, "CONTINUOUS");
  tbl += g(0, "ENDTAB") + g(0, "ENDSEC");
  return head + tbl + g(0, "SECTION") + g(2, "ENTITIES") + ents + g(0, "ENDSEC") + g(0, "EOF");
}
