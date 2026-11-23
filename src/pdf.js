import LOGO_SVG from "./assets/logos/stage-designer-lockup-color.svg?raw";
import { GRID, GEL_PRESETS, FIXTURE_DEFS, SET_DEFS } from "./constants.js";
import { fmtTrim } from "./units.js";
// pdf.js — print-to-PDF documents (instrument schedule and design plot). Pure string builders, no server.
// ── PDF generation (pure JS, no server) ──────────────────────────────────────
export function generateInstrumentSchedulePDF(elements, stageW, stageH, projectInfo) {
  const fixtures = elements
    .filter(e => e.category === "lighting" && e.type !== "hazer")
    .sort((a,b) => (a.channel||999)-(b.channel||999));

  const battens = elements.filter(e => e.type === "batten");

  // Build minimal PDF manually
  const lines = [];
  const objs = [];
  let objN = 1;

  const addObj = (content) => {
    objs.push({ id: objN++, content });
  };

  // We'll use a simpler approach: generate an HTML table and use window.print()
  // Open a new window with print-ready HTML
  const now = new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"});

  const tableRows = fixtures.map(f => {
    const batten = battens.find(b => b.id === f.battenId);
    const gel = GEL_PRESETS.find(g => g.code === f.gelCode) || { code:"Open", name:"Open White", hex:"#ffffff" };
    const xFt = ((f.x||0)/GRID).toFixed(1);
    const yFt = ((f.y||0)/GRID).toFixed(1);
    return `
      <tr>
        <td style="text-align:center;font-weight:bold">${f.channel ?? ""}</td>
        <td>${f.dimmer ?? ""}</td>
        <td>${f.label || FIXTURE_DEFS[f.type]?.label || f.type}</td>
        <td>${batten ? batten.label || "Batten" : ""}</td>
        <td style="text-align:center">
          <span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${gel.hex};border:1px solid #555;vertical-align:middle;margin-right:4px"></span>
          ${gel.code}
        </td>
        <td>${gel.name}</td>
        <td style="text-align:center">${f.focusAngle ?? 45}°</td>
        <td style="text-align:center">${xFt}'</td>
        <td style="text-align:center">${yFt}'</td>
        <td>${f.notes ?? ""}</td>
      </tr>`;
  }).join("");

  const battenRows = battens.map(b => {
    const fixturesOnBatten = fixtures.filter(f => f.battenId === b.id);
    const x1ft = ((b.x1 ?? b.x - b.length*GRID/2)/GRID).toFixed(1);
    const x2ft = ((b.x2 ?? b.x + b.length*GRID/2)/GRID).toFixed(1);
    const yft = ((b.y1 ?? b.y)/GRID).toFixed(1);
    return `
      <tr>
        <td>${b.label || "Batten"}</td>
        <td>${x1ft}' → ${x2ft}'</td>
        <td>${yft}'</td>
        <td>${fmtTrim(b.trim)}</td>
        <td>${fixturesOnBatten.length} fixture${fixturesOnBatten.length !== 1 ? "s":""}:
          ${fixturesOnBatten.map(f=>`Ch ${f.channel}`).join(", ")}</td>
      </tr>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Instrument Schedule — ${projectInfo.title || "Stage Design"}</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:"Helvetica Neue",Arial,sans-serif; font-size:10pt; color:#111; background:#fff; }
  .page { width:11in; padding:0.5in; }
  @media print { .page { width:100%; padding:0.4in; } .no-print{display:none} }

  /* Title block */
  .title-block { border:2px solid #222; margin-bottom:16px; }
  .title-main { display:flex; border-bottom:1px solid #222; }
  .title-main .show { flex:1; padding:10px 12px; border-right:1px solid #222; }
  .title-main .show h1 { font-size:18pt; font-weight:900; letter-spacing:1px; }
  .title-main .show .sub { font-size:10pt; color:#555; margin-top:2px; }
  .title-meta { display:flex; }
  .meta-cell { padding:6px 12px; border-right:1px solid #222; min-width:140px; }
  .meta-cell:last-child { border-right:none; }
  .meta-cell .key { font-size:7pt; text-transform:uppercase; letter-spacing:1px; color:#888; }
  .meta-cell .val { font-size:10pt; font-weight:bold; }

  /* Section headers */
  h2 { font-size:11pt; font-weight:900; text-transform:uppercase; letter-spacing:1.5px;
       border-bottom:2px solid #222; padding-bottom:4px; margin:20px 0 10px; }

  /* Tables */
  table { width:100%; border-collapse:collapse; font-size:8.5pt; margin-bottom:20px; }
  th { background:#222; color:#fff; padding:5px 7px; font-size:7.5pt; text-transform:uppercase; letter-spacing:0.5px; border:1px solid #222; }
  td { padding:4px 7px; border:1px solid #ccc; vertical-align:middle; }
  tr:nth-child(even) td { background:#f8f8f8; }
  tr:hover td { background:#fff8e8; }

  /* Stage summary box */
  .summary { display:flex; gap:16px; margin-bottom:20px; }
  .stat { border:1px solid #ddd; border-radius:4px; padding:8px 14px; text-align:center; min-width:100px; }
  .stat .n { font-size:20pt; font-weight:900; color:#222; }
  .stat .k { font-size:7.5pt; text-transform:uppercase; letter-spacing:0.5px; color:#888; margin-top:2px; }

  .gel-legend { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:20px; }
  .gel-chip { display:flex; align-items:center; gap:5px; padding:3px 8px; border:1px solid #ddd; border-radius:3px; font-size:8pt; }
  .gel-dot { width:14px; height:14px; border-radius:50%; border:1px solid #555; }

  .print-btn { position:fixed; top:12px; right:12px; background:#CC8530; color:#1D2127; border:none;
               padding:10px 20px; border-radius:6px; font-size:11pt; cursor:pointer; font-weight:bold; z-index:999; }
  .print-btn:hover { background:#c03050; }
  footer { margin-top:24px; font-size:7.5pt; color:#888; border-top:1px solid #ddd; padding-top:8px; display:flex; justify-content:space-between; }
</style>
</head>
<body>
<button class="print-btn no-print" onclick="window.print()">Print / Save PDF</button>
<div class="page">

  <!-- TITLE BLOCK -->
  <div class="title-block">
    <div class="title-main">
      <div class="show">
        <h1>${projectInfo.title || "UNTITLED PRODUCTION"}</h1>
        <div class="sub">${projectInfo.venue || ""}</div>
      </div>
      <div style="padding:10px 14px;text-align:right;min-width:200px">
        <div style="font-size:7.5pt;text-transform:uppercase;color:#888">Instrument Schedule</div>
        <div style="font-size:22pt;font-weight:900">PLOT</div>
      </div>
    </div>
    <div class="title-meta">
      <div class="meta-cell"><div class="key">Designer</div><div class="val">${projectInfo.designer || "—"}</div></div>
      <div class="meta-cell"><div class="key">Director</div><div class="val">${projectInfo.director || "—"}</div></div>
      <div class="meta-cell"><div class="key">Stage Size</div><div class="val">${stageW}' × ${stageH}'</div></div>
      <div class="meta-cell"><div class="key">Date</div><div class="val">${now}</div></div>
      <div class="meta-cell"><div class="key">Revision</div><div class="val">${projectInfo.revision || "1"}</div></div>
    </div>
  </div>

  <!-- SUMMARY STATS -->
  <div class="summary">
    <div class="stat"><div class="n">${fixtures.length}</div><div class="k">Total Fixtures</div></div>
    <div class="stat"><div class="n">${battens.length}</div><div class="k">Battens</div></div>
    <div class="stat"><div class="n">${fixtures.filter(f=>f.channel).length}</div><div class="k">Channels Used</div></div>
    <div class="stat"><div class="n">${[...new Set(fixtures.map(f=>f.gelCode).filter(Boolean))].length}</div><div class="k">Gel Colors</div></div>
    <div class="stat"><div class="n">${[...new Set(fixtures.map(f=>f.type))].length}</div><div class="k">Fixture Types</div></div>
  </div>

  <!-- GEL LEGEND -->
  ${fixtures.some(f=>f.gelCode) ? `
  <h2>Gel Color Legend</h2>
  <div class="gel-legend">
    ${[...new Set(fixtures.map(f=>f.gelCode).filter(Boolean))].map(code => {
      const gel = GEL_PRESETS.find(g=>g.code===code) || {code,name:"Custom",hex:"#888"};
      return `<div class="gel-chip"><div class="gel-dot" style="background:${gel.hex}"></div><strong>${gel.code}</strong> — ${gel.name}</div>`;
    }).join("")}
  </div>` : ""}

  <!-- INSTRUMENT SCHEDULE -->
  <h2>Instrument Schedule</h2>
  <table>
    <thead>
      <tr>
        <th>Ch</th><th>Dimmer</th><th>Fixture</th><th>Batten/Position</th>
        <th>Gel</th><th>Gel Name</th><th>Angle</th><th>X</th><th>Y</th><th>Notes</th>
      </tr>
    </thead>
    <tbody>${tableRows || '<tr><td colspan="10" style="text-align:center;color:#888;padding:20px">No lighting fixtures in plot</td></tr>'}</tbody>
  </table>

  <!-- BATTEN SCHEDULE -->
  ${battens.length > 0 ? `
  <h2>Batten / Pipe Schedule</h2>
  <table>
    <thead><tr><th>Name</th><th>Position (SR→SL)</th><th>Depth from DS</th><th>Trim Height</th><th>Fixtures</th></tr></thead>
    <tbody>${battenRows}</tbody>
  </table>` : ""}

  <footer>
    <span style="display:flex;align-items:center;gap:10px"><span style="width:150px;display:inline-block">${LOGO_SVG}</span>Generated ${now}</span>
    <span>${projectInfo.title || "Untitled Production"} | ${projectInfo.venue || ""}</span>
  </footer>
</div>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

// ── Design plot PDF (visual stage/lighting/set layout) ───────────────────────
export function generateDesignPDF(svgEl, elements, stageW, stageH, venue, projectInfo, opts = {}) {
  if (!svgEl) return;

  const clone = svgEl.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

  // The live canvas wraps everything in a pan/zoom <g transform="...">; strip
  // that so the export always shows the whole design, not just what's currently
  // scrolled/zoomed into view.
  const innerG = clone.querySelector("g");
  if (innerG) innerG.removeAttribute("transform");

  const offX = (venue.stageOffX || 0) * GRID, offY = (venue.stageOffY || 0) * GRID;
  const rx = -offX, ry = -offY;
  const rW = (venue.roomW || stageW) * GRID, rH = (venue.roomH || stageH) * GRID;
  const margin = 40;
  clone.removeAttribute("style");
  clone.setAttribute("viewBox", `${rx - margin} ${ry - margin} ${rW + margin * 2} ${rH + margin * 2}`);
  clone.setAttribute("width", "100%");
  clone.setAttribute("height", "auto");
  clone.setAttribute("preserveAspectRatio", "xMidYMid meet");

  // Set pieces in placement order, grouped by piece type (Platform, Flat, Chair, ...).
  // Numbering restarts at 1 inside each type; the sheet for a type stamps those numbers on the plot.
  const setPieces = elements.filter(e =>
    e.category !== "lighting" && e.type !== "batten" && e.type !== "textlabel" && e.category !== "notes");
  const typeLabel = (t) => t === "wall" ? "Wall" : (SET_DEFS[t]?.label || t);
  const typeOrder = [...Object.keys(SET_DEFS), "wall"];
  const rank = (t) => { const i = typeOrder.indexOf(t); return i < 0 ? 999 : i; };
  const groups = [...new Set(setPieces.map(p => p.type))]
    .sort((a, b) => rank(a) - rank(b))
    .map(t => ({ type: t, label: typeLabel(t), pieces: setPieces.filter(p => p.type === t) }));

  // WCAG relative luminance, so a badge can be whichever of near-black / white contrasts more with its piece
  const lum = (hex) => {
    let h = String(hex || "").replace("#", "");
    if (h.length === 3) h = h.split("").map(ch => ch + ch).join("");
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return 0.2;   // unknown colour: treat as mid-dark
    const [R, G, B] = [0, 2, 4].map(k => {
      const v = parseInt(h.slice(k, k + 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
  };

  // Serialize the plot. With a group, every piece is still drawn but only that group's pieces get number badges.
  const buildSvg = (group) => {
    const c = clone.cloneNode(true);
    const g = c.querySelector("g");
    if (group && g) {
      const NS = "http://www.w3.org/2000/svg";
      const vbW = rW + margin * 2;
      const r = Math.max(8, vbW * 0.011);          // badge size scales with the plot so it prints legibly
      const layer = document.createElementNS(NS, "g");
      group.pieces.forEach((p, i) => {
        const L = lum(p.color);
        const lightPiece = (L + 0.05) / 0.05 > 1.05 / (L + 0.05);   // black contrasts more than white
        const badgeFill = lightPiece ? "#111111" : "#ffffff";
        const badgeText = lightPiece ? "#ffffff" : "#111111";
        const badgeRing = lightPiece ? "#ffffff" : "#111111";
        const cx = p.type === "wall" ? ((p.x1||0)+(p.x2||0))/2 : (p.x||0);
        const cy = p.type === "wall" ? ((p.y1||0)+(p.y2||0))/2 : (p.y||0);
        const circ = document.createElementNS(NS, "circle");
        circ.setAttribute("cx", cx); circ.setAttribute("cy", cy); circ.setAttribute("r", r);
        circ.setAttribute("fill", badgeFill); circ.setAttribute("stroke", badgeRing); circ.setAttribute("stroke-width", r*0.12);
        const t = document.createElementNS(NS, "text");
        t.setAttribute("x", cx); t.setAttribute("y", cy);
        t.setAttribute("text-anchor", "middle"); t.setAttribute("dominant-baseline", "central");
        t.setAttribute("font-family", "Helvetica Neue, Arial, sans-serif");
        t.setAttribute("font-weight", "bold"); t.setAttribute("fill", badgeText);
        t.setAttribute("font-size", String((i+1) >= 10 ? r*1.05 : r*1.25));
        t.textContent = String(i + 1);
        layer.appendChild(circ); layer.appendChild(t);
      });
      g.appendChild(layer);
    }
    return new XMLSerializer().serializeToString(c);
  };

  const now = new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"});
  const fixtureCount = elements.filter(e => e.category === "lighting").length;
  const battenCount = elements.filter(e => e.type === "batten").length;
  const setCount = elements.filter(e => e.category !== "lighting" && e.type !== "batten" && e.category !== "notes").length;

  // ── Set piece schedule: number, name, dimensions, elevation ──
  const esc = (s) => String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const fmtFt = (px) => { const v = Math.round((px||0)/GRID*100)/100; return `${v}'`; };
  const fmtElev = (inches) => {
    const n = Number(inches) || 0;
    return n === 0 ? "Floor" : `${Math.round(n*100)/100}"`;
  };
  const pieceRow = (p, i) => {
    const name = p.label || typeLabel(p.type);
    const dims = p.type === "wall"
      ? `${fmtFt(Math.hypot((p.x2||0)-(p.x1||0),(p.y2||0)-(p.y1||0)))} long`
      : `${fmtFt(p.w)} × ${fmtFt(p.h)}`;
    return `
      <tr>
        <td style="text-align:center;font-weight:bold">${i+1}</td>
        <td><strong>${esc(name)}</strong></td>
        <td style="text-align:center">${dims}</td>
        <td style="text-align:center">${fmtElev(p.elevation)}</td>
        <td>${esc(p.notes)}</td>
      </tr>`;
  };
  const tableHead = `<thead><tr><th style="width:40px">#</th><th>Name</th><th>Dimensions (W × D)</th><th>Elevation</th><th>Notes</th></tr></thead>`;

  // Overview schedule: every piece, grouped by type, numbers restarting per type
  const overviewScheduleHtml = groups.length ? `
  <h2>Set Piece Schedule</h2>
  <table>
    ${tableHead}
    <tbody>${groups.map(gr => `
      <tr class="grp"><td colspan="5">${esc(gr.label)} &mdash; ${gr.pieces.length}</td></tr>
      ${gr.pieces.map(pieceRow).join("")}`).join("")}
    </tbody>
  </table>` : "";

  const titleBlock = (heading, subheading) => `
  <div class="title-block">
    <div class="title-main">
      <div class="show">
        <h1>${esc(projectInfo.title || "UNTITLED PRODUCTION")}</h1>
        <div class="sub">${esc(projectInfo.venue || "")}</div>
      </div>
      <div style="padding:10px 14px;text-align:right;min-width:200px">
        <div style="font-size:7.5pt;text-transform:uppercase;color:#888">${subheading}</div>
        <div style="font-size:22pt;font-weight:900">${heading}</div>
      </div>
    </div>
    <div class="title-meta">
      <div class="meta-cell"><div class="key">Designer</div><div class="val">${esc(projectInfo.designer || "—")}</div></div>
      <div class="meta-cell"><div class="key">Director</div><div class="val">${esc(projectInfo.director || "—")}</div></div>
      <div class="meta-cell"><div class="key">Stage Size</div><div class="val">${stageW}' × ${stageH}'</div></div>
      <div class="meta-cell"><div class="key">Date</div><div class="val">${now}</div></div>
      <div class="meta-cell"><div class="key">Revision</div><div class="val">${esc(projectInfo.revision || "1")}</div></div>
    </div>
  </div>`;

  const footer = `
  <footer>
    <span style="display:flex;align-items:center;gap:10px"><span style="width:150px;display:inline-block">${LOGO_SVG}</span>Generated ${now}</span>
    <span>${esc(projectInfo.title || "Untitled Production")} | ${esc(projectInfo.venue || "")}</span>
  </footer>`;

  // Sheet 1: whole design, unnumbered, with the full schedule
  const overviewPage = `
<div class="page">
  ${titleBlock("DESIGN PLOT", "Stage &amp; Lighting")}
  <div class="summary">
    <div class="stat"><div class="n">${fixtureCount}</div><div class="k">Lighting Fixtures</div></div>
    <div class="stat"><div class="n">${setCount}</div><div class="k">Set Pieces</div></div>
    <div class="stat"><div class="n">${battenCount}</div><div class="k">Battens</div></div>
    <div class="stat"><div class="n">${venue.roomW || "—"}' × ${venue.roomH || "—"}'</div><div class="k">Room Size</div></div>
  </div>
  <div class="plot-frame">${buildSvg(null)}</div>
  ${overviewScheduleHtml}
  ${footer}
</div>`;

  // One extra sheet per piece type: full plot, numbers only on that type, matching table
  const typePages = opts.numberPieces ? groups.map(gr => `
<div class="page">
  ${titleBlock(esc(gr.label.toUpperCase()) + " PLOT", "Set piece numbering")}
  <div class="plot-frame">${buildSvg(gr)}</div>
  <h2>${esc(gr.label)} &mdash; ${gr.pieces.length} piece${gr.pieces.length !== 1 ? "s" : ""}</h2>
  <table>
    ${tableHead}
    <tbody>${gr.pieces.map(pieceRow).join("")}</tbody>
  </table>
  ${footer}
</div>`).join("") : "";

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Design Plot — ${esc(projectInfo.title || "Stage Design")}</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:"Helvetica Neue",Arial,sans-serif; font-size:10pt; color:#111; background:#fff; }
  .page { width:11in; padding:0.5in; page-break-after:always; }
  .page:last-of-type { page-break-after:auto; }
  @media print { .page { width:100%; padding:0.4in; } .no-print{display:none} }

  .title-block { border:2px solid #222; margin-bottom:16px; }
  .title-main { display:flex; border-bottom:1px solid #222; }
  .title-main .show { flex:1; padding:10px 12px; border-right:1px solid #222; }
  .title-main .show h1 { font-size:18pt; font-weight:900; letter-spacing:1px; }
  .title-main .show .sub { font-size:10pt; color:#555; margin-top:2px; }
  .title-meta { display:flex; }
  .meta-cell { padding:6px 12px; border-right:1px solid #222; min-width:120px; }
  .meta-cell:last-child { border-right:none; }
  .meta-cell .key { font-size:7pt; text-transform:uppercase; letter-spacing:1px; color:#888; }
  .meta-cell .val { font-size:10pt; font-weight:bold; }

  .summary { display:flex; gap:16px; margin-bottom:16px; }
  .stat { border:1px solid #ddd; border-radius:4px; padding:8px 14px; text-align:center; min-width:90px; }
  .stat .n { font-size:18pt; font-weight:900; color:#222; }
  .stat .k { font-size:7.5pt; text-transform:uppercase; letter-spacing:0.5px; color:#888; margin-top:2px; }

  .plot-frame { border:1px solid #222; border-radius:4px; overflow:hidden; background:#0B0E11; }
  .plot-frame svg { display:block; width:100%; height:auto; }

  h2 { font-size:11pt; font-weight:900; text-transform:uppercase; letter-spacing:1.5px;
       border-bottom:2px solid #222; padding-bottom:4px; margin:20px 0 10px; }
  table { width:100%; border-collapse:collapse; font-size:8.5pt; margin-bottom:20px; }
  th { background:#222; color:#fff; padding:5px 7px; font-size:7.5pt; text-transform:uppercase; letter-spacing:0.5px; border:1px solid #222; }
  td { padding:4px 7px; border:1px solid #ccc; vertical-align:middle; }
  tr:nth-child(even) td { background:#f8f8f8; }
  tr.grp td { background:#e4e4e4; font-weight:900; text-transform:uppercase; letter-spacing:0.5px; font-size:8pt; }
  tr { page-break-inside:avoid; }

  .print-btn { position:fixed; top:12px; right:12px; background:#CC8530; color:#1D2127; border:none;
               padding:10px 20px; border-radius:6px; font-size:11pt; cursor:pointer; font-weight:bold; z-index:999; }
  .print-btn:hover { background:#c03050; }
  footer { margin-top:16px; font-size:7.5pt; color:#888; border-top:1px solid #ddd; padding-top:8px; display:flex; justify-content:space-between; }
</style>
</head>
<body>
<button class="print-btn no-print" onclick="window.print()">Print / Save PDF</button>
${overviewPage}
${typePages}
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

